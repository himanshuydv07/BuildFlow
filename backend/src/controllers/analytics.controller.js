const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const Task = require('../models/Task');
const Milestone = require('../models/Milestone');
const ProjectMember = require('../models/ProjectMember');

// GET /projects/:projectId/analytics
// Meaningful, explainable metrics — no invented "productivity scores".
const getAnalytics = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const now = new Date();
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

  const [priorityDist, statusDist, completedRecently, members, milestones] = await Promise.all([
    Task.aggregate([
      { $match: { projectId, isDeleted: false } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      { $match: { projectId, isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.find({ projectId, isDeleted: false, status: 'DONE', updatedAt: { $gte: eightWeeksAgo } })
      .select('updatedAt')
      .lean(),
    ProjectMember.find({ projectId, status: 'ACTIVE' }).populate('userId', 'name').lean(),
    Milestone.find({ projectId }).select('name status').lean(),
  ]);

  // Completion trend: count of tasks completed per ISO week, last 8 weeks.
  const weekBuckets = {};
  for (let i = 7; i >= 0; i -= 1) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const key = weekStart.toISOString().slice(0, 10);
    weekBuckets[key] = 0;
  }
  const weekKeys = Object.keys(weekBuckets);
  completedRecently.forEach((t) => {
    const daysAgo = Math.floor((now - t.updatedAt) / (24 * 60 * 60 * 1000));
    const weekIndex = Math.min(7, Math.floor(daysAgo / 7));
    const key = weekKeys[7 - weekIndex];
    if (key) weekBuckets[key] += 1;
  });

  // Workload: open (non-DONE) task count per member.
  const workloadRaw = await Task.aggregate([
    { $match: { projectId, isDeleted: false, status: { $ne: 'DONE' }, assignee: { $ne: null } } },
    { $group: { _id: '$assignee', count: { $sum: 1 } } },
  ]);
  const workload = members.map((m) => ({
    userId: m.userId._id,
    name: m.userId.name,
    openTasks: workloadRaw.find((w) => w._id?.toString() === m.userId._id.toString())?.count || 0,
  }));

  return new ApiResponse(200, {
    priorityDistribution: Object.fromEntries(priorityDist.map((p) => [p._id, p.count])),
    statusDistribution: Object.fromEntries(statusDist.map((s) => [s._id, s.count])),
    completionTrend: Object.entries(weekBuckets).map(([week, count]) => ({ week, count })),
    workload,
    milestoneStatus: milestones.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {}),
  }).send(res);
});

module.exports = { getAnalytics };
