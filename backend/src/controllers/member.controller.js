const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const { canManageTargetRole } = require('../middleware/rbac');
const { invalidateMembership } = require('../services/membershipService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');

// GET /projects/:projectId/members
const listMembers = asyncHandler(async (req, res) => {
  const members = await ProjectMember.find({ projectId: req.project._id, status: 'ACTIVE' })
    .populate('userId', 'name email avatarUrl')
    .sort({ role: 1, joinedAt: 1 })
    .lean();

  return new ApiResponse(200, { members }).send(res);
});

// PATCH /projects/:projectId/members/:memberId  { role }  (OWNER, ADMIN within rank limits)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { role: newRole } = req.body;

  const target = await ProjectMember.findOne({ _id: memberId, projectId: req.project._id, status: 'ACTIVE' });
  if (!target) throw ApiError.notFound('Member not found');

  if (target.userId.toString() === req.user._id.toString()) {
    throw ApiError.forbidden('You cannot change your own role');
  }
  if (target.role === 'OWNER') {
    throw ApiError.forbidden('Use the transfer-ownership endpoint to change project ownership');
  }
  if (newRole === 'OWNER') {
    throw ApiError.forbidden('Use the transfer-ownership endpoint to grant ownership');
  }
  if (!canManageTargetRole(req.membership.role, target.role) || !canManageTargetRole(req.membership.role, newRole)) {
    throw ApiError.forbidden('You do not have permission to assign this role');
  }

  const previousRole = target.role;
  target.role = newRole;
  await target.save();
  await invalidateMembership(target.userId.toString(), req.project._id.toString());

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MEMBER_ROLE_CHANGED',
    entityType: 'MEMBER',
    entityId: target._id,
    previousValue: { role: previousRole },
    newValue: { role: newRole },
  });

  await notify({
    user: target.userId,
    type: 'ROLE_CHANGED',
    message: `Your role in "${req.project.name}" changed to ${newRole}`,
    entityType: 'PROJECT',
    entityId: req.project._id,
    projectId: req.project._id,
  });

  return new ApiResponse(200, { member: target }, 'Role updated').send(res);
});

// DELETE /projects/:projectId/members/:memberId  (OWNER, ADMIN within rank limits)
const removeMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  const target = await ProjectMember.findOne({ _id: memberId, projectId: req.project._id, status: 'ACTIVE' });
  if (!target) throw ApiError.notFound('Member not found');

  if (target.role === 'OWNER') {
    throw ApiError.forbidden('The project owner cannot be removed. Transfer ownership first.');
  }
  if (target.userId.toString() === req.user._id.toString()) {
    throw ApiError.badRequest('Use the leave-project endpoint to remove yourself');
  }
  if (!canManageTargetRole(req.membership.role, target.role)) {
    throw ApiError.forbidden('You do not have permission to remove this member');
  }

  target.status = 'REMOVED';
  await target.save();
  await Project.updateOne({ _id: req.project._id }, { $inc: { memberCount: -1 } });
  await invalidateMembership(target.userId.toString(), req.project._id.toString());

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MEMBER_REMOVED',
    entityType: 'MEMBER',
    entityId: target._id,
  });

  return new ApiResponse(200, null, 'Member removed').send(res);
});

// POST /projects/:projectId/leave  (any member except sole OWNER)
const leaveProject = asyncHandler(async (req, res) => {
  if (req.membership.role === 'OWNER') {
    throw ApiError.badRequest('Transfer ownership before leaving a project you own');
  }

  await ProjectMember.updateOne({ _id: req.membership._id }, { status: 'REMOVED' });
  await Project.updateOne({ _id: req.project._id }, { $inc: { memberCount: -1 } });
  await invalidateMembership(req.user._id.toString(), req.project._id.toString());

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MEMBER_LEFT',
    entityType: 'MEMBER',
    entityId: req.membership._id,
  });

  return new ApiResponse(200, null, 'You have left the project').send(res);
});

module.exports = { listMembers, updateMemberRole, removeMember, leaveProject };
