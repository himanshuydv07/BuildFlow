const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');
const ProjectMember = require('../models/ProjectMember');

const MANAGE_ROLES = ['OWNER', 'ADMIN'];

async function recalcMilestoneProgress(milestoneId) {
  const tasks = await Task.find({ milestone: milestoneId, isDeleted: false }).select('status').lean();
  if (tasks.length === 0) return { progress: 0, autoStatus: null };
  const done = tasks.filter((t) => t.status === 'DONE').length;
  const progress = Math.round((done / tasks.length) * 100);
  const autoStatus = progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : null;
  return { progress, autoStatus };
}

// POST /projects/:projectId/milestones  (OWNER, ADMIN)
const createMilestone = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) {
    throw ApiError.forbidden('Only project owners/admins can create milestones');
  }

  const milestone = await Milestone.create({ ...req.body, projectId: req.project._id, createdBy: req.user._id });

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MILESTONE_CREATED',
    entityType: 'MILESTONE',
    entityId: milestone._id,
    newValue: { name: milestone.name },
  });

  return new ApiResponse(201, { milestone }, 'Milestone created').send(res);
});

// GET /projects/:projectId/milestones  (any active member)
const listMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.find({ projectId: req.project._id }).sort({ dueDate: 1 }).lean();

  // Refresh progress on read so it reflects the latest task states
  // without needing a background job for this MVP scale.
  const withProgress = await Promise.all(
    milestones.map(async (m) => {
      const { progress } = await recalcMilestoneProgress(m._id);
      return { ...m, progress };
    })
  );

  return new ApiResponse(200, { milestones: withProgress }).send(res);
});

// GET /projects/:projectId/milestones/:milestoneId
const getMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findOne({ _id: req.params.milestoneId, projectId: req.project._id }).lean();
  if (!milestone) throw ApiError.notFound('Milestone not found');

  const { progress } = await recalcMilestoneProgress(milestone._id);
  const tasks = await Task.find({ milestone: milestone._id, isDeleted: false })
    .select('title status priority dueDate assignee')
    .populate('assignee', 'name avatarUrl')
    .lean();

  return new ApiResponse(200, { milestone: { ...milestone, progress }, tasks }).send(res);
});

// PATCH /projects/:projectId/milestones/:milestoneId  (OWNER, ADMIN)
const updateMilestone = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) {
    throw ApiError.forbidden('Only project owners/admins can edit milestones');
  }

  const milestone = await Milestone.findOneAndUpdate(
    { _id: req.params.milestoneId, projectId: req.project._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!milestone) throw ApiError.notFound('Milestone not found');

  const wasCompleted = milestone.status === 'COMPLETED';
  if (req.body.status === 'COMPLETED' && !wasCompleted) {
    const members = await ProjectMember.find({ projectId: req.project._id, status: 'ACTIVE' }).select('userId');
    await Promise.all(
      members.map((m) =>
        notify({
          user: m.userId,
          type: 'MILESTONE_COMPLETED',
          message: `Milestone "${milestone.name}" was completed`,
          entityType: 'MILESTONE',
          entityId: milestone._id,
          projectId: req.project._id,
        })
      )
    );
  }

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MILESTONE_UPDATED',
    entityType: 'MILESTONE',
    entityId: milestone._id,
    newValue: req.body,
  });

  return new ApiResponse(200, { milestone }, 'Milestone updated').send(res);
});

// DELETE /projects/:projectId/milestones/:milestoneId  (OWNER, ADMIN)
const deleteMilestone = asyncHandler(async (req, res) => {
  if (!MANAGE_ROLES.includes(req.membership.role)) {
    throw ApiError.forbidden('Only project owners/admins can delete milestones');
  }

  const milestone = await Milestone.findOneAndDelete({ _id: req.params.milestoneId, projectId: req.project._id });
  if (!milestone) throw ApiError.notFound('Milestone not found');

  // Unlink tasks rather than deleting them.
  await Task.updateMany({ milestone: milestone._id }, { milestone: null });

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MILESTONE_DELETED',
    entityType: 'MILESTONE',
    entityId: milestone._id,
  });

  return new ApiResponse(200, null, 'Milestone deleted').send(res);
});

module.exports = { createMilestone, listMilestones, getMilestone, updateMilestone, deleteMilestone };
