const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { safeGet, safeSet } = require('../config/redis');
const env = require('../config/env');

// GET /dashboard — the personal workspace landing page data
const getWorkspaceDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const cacheKey = `dashboard:${userId}`;

  const cached = await safeGet(cacheKey);
  if (cached) {
    return new ApiResponse(200, JSON.parse(cached)).send(res);
  }

  const memberships = await ProjectMember.find({ userId, status: 'ACTIVE' }).lean();
  const projectIds = memberships.map((m) => m.projectId);
  const roleByProject = Object.fromEntries(memberships.map((m) => [m.projectId.toString(), m.role]));

  const projects = await Project.find({ _id: { $in: projectIds }, isArchived: false }).lean();

  const myProjects = [];
  const sharedWithMe = [];

  await Promise.all(
    projects.map(async (p) => {
      const [total, done] = await Promise.all([
        Task.countDocuments({ projectId: p._id, isDeleted: false }),
        Task.countDocuments({ projectId: p._id, isDeleted: false, status: 'DONE' }),
      ]);
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const entry = { ...p, myRole: roleByProject[p._id.toString()], progress, totalTasks: total };
      if (entry.myRole === 'OWNER') myProjects.push(entry);
      else sharedWithMe.push(entry);
    })
  );

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [myTasks, overdueTasks, upcomingTasks, recentActivity, unreadNotifications] = await Promise.all([
    Task.countDocuments({ projectId: { $in: projectIds }, assignee: userId, isDeleted: false, status: { $ne: 'DONE' } }),
    Task.find({ projectId: { $in: projectIds }, assignee: userId, isDeleted: false, dueDate: { $lt: now }, status: { $ne: 'DONE' } })
      .populate('projectId', 'name icon')
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    Task.find({
      projectId: { $in: projectIds },
      assignee: userId,
      isDeleted: false,
      dueDate: { $gte: now, $lte: weekFromNow },
      status: { $ne: 'DONE' },
    })
      .populate('projectId', 'name icon')
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    ActivityLog.find({ projectId: { $in: projectIds } })
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean(),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);

  const payload = {
    myProjects,
    sharedWithMe,
    myOpenTaskCount: myTasks,
    overdueTasks,
    upcomingDeadlines: upcomingTasks,
    recentActivity,
    unreadNotificationCount: unreadNotifications,
  };

  await safeSet(cacheKey, JSON.stringify(payload), env.cache.dashboardTtl);

  return new ApiResponse(200, payload).send(res);
});

module.exports = { getWorkspaceDashboard };
