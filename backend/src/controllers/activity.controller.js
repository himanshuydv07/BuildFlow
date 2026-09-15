const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ActivityLog = require('../models/ActivityLog');

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

module.exports = { listProjectActivity };
