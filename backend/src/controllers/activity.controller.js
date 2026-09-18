const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ActivityLog = require('../models/ActivityLog');
const ProjectMember = require('../models/ProjectMember');

// GET /projects/:projectId/activity  (any active member)
const listProjectActivity = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  const [activity, total] = await Promise.all([
    ActivityLog.find({ projectId: req.project._id })
      .populate('actor', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments({ projectId: req.project._id }),
  ]);

  return new ApiResponse(200, { activity }, undefined, { page, limit, total }).send(res);
});

// GET /activity — cross-project feed for the personal dashboard's
// "View all" link. Scoped exactly like the dashboard's own recent-
// activity widget: only projects the requester is an active member of.
const listMyActivity = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  const memberships = await ProjectMember.find({ userId: req.user._id, status: 'ACTIVE' }).select('projectId');
  const projectIds = memberships.map((m) => m.projectId);

  const [activity, total] = await Promise.all([
    ActivityLog.find({ projectId: { $in: projectIds } })
      .populate('actor', 'name avatarUrl')
      .populate('projectId', 'name icon')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments({ projectId: { $in: projectIds } }),
  ]);

  return new ApiResponse(200, { activity }, undefined, { page, limit, total }).send(res);
});

module.exports = { listProjectActivity, listMyActivity };