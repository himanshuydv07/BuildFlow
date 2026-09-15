const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Invitation = require('../models/Invitation');
const ProjectMember = require('../models/ProjectMember');
const Project = require('../models/Project');
const User = require('../models/User');
const { generateOpaqueToken, hashToken } = require('../utils/tokens');
const env = require('../config/env');
const { sendInvitationEmail } = require('../services/emailService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');
const { invalidateMembership } = require('../services/membershipService');

// POST /projects/:projectId/invitations  (OWNER, ADMIN)
const createInvitation = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const normalizedEmail = email.toLowerCase();

  // An ADMIN cannot invite someone in as an ADMIN unless the OWNER allows
  // it — keep invitation power in line with member-management power.
  if (role === 'ADMIN' && req.membership.role !== 'OWNER') {
    throw ApiError.forbidden('Only the project owner can invite a new admin');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingMembership = await ProjectMember.findOne({
      projectId: req.project._id,
      userId: existingUser._id,
      status: 'ACTIVE',
    });
    if (existingMembership) {
      throw ApiError.conflict('This user is already a member of the project');
    }
  }

  const duplicatePending = await Invitation.findOne({
    projectId: req.project._id,
    email: normalizedEmail,
    status: 'PENDING',
  });
  if (duplicatePending) {
    throw ApiError.conflict('An invitation is already pending for this email');
  }

  const rawToken = generateOpaqueToken();
  const invitation = await Invitation.create({
    projectId: req.project._id,
    invitedBy: req.user._id,
    email: normalizedEmail,
    invitedUserId: existingUser ? existingUser._id : null,
    role,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const inviteUrl = `${env.clientUrl}/invitations/${invitation._id}?token=${rawToken}`;
  await sendInvitationEmail({ email: normalizedEmail, projectName: req.project.name, inviterName: req.user.name, role, inviteUrl });

  if (existingUser) {
    await notify({
      user: existingUser._id,
      type: 'PROJECT_INVITATION',
      message: `You've been invited to join "${req.project.name}" as ${role}`,
      entityType: 'INVITATION',
      entityId: invitation._id,
      projectId: req.project._id,
    });
  }

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'MEMBER_INVITED',
    entityType: 'INVITATION',
    entityId: invitation._id,
    newValue: { email: normalizedEmail, role },
  });

  return new ApiResponse(201, { invitation }, 'Invitation sent').send(res);
});

// GET /projects/:projectId/invitations  (OWNER, ADMIN) - pending invitations for a project
const listProjectInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({ projectId: req.project._id, status: 'PENDING' }).sort({
    createdAt: -1,
  });
  return new ApiResponse(200, { invitations }).send(res);
});

// GET /invitations/me — invitations pending for the current authenticated user's email
const listMyInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({ email: req.user.email, status: 'PENDING' })
    .populate('projectId', 'name icon color')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });
  return new ApiResponse(200, { invitations }).send(res);
});

// POST /invitations/:invitationId/accept  { token }
const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findById(req.params.invitationId).select('+tokenHash');
  if (!invitation) throw ApiError.notFound('Invitation not found');

  if (invitation.status !== 'PENDING') throw ApiError.badRequest(`Invitation already ${invitation.status.toLowerCase()}`);
  if (invitation.expiresAt.getTime() < Date.now()) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    throw ApiError.badRequest('Invitation has expired');
  }  // Token proves link possession for someone accepting via the emailed
  // link. When accepting from the in-app "My Invitations" list, the
  // user is already authenticated as the exact invited email — that's
  // equivalent proof, so the token becomes optional there.
  if (req.body.token) {
    if (invitation.tokenHash !== hashToken(req.body.token)) {
      throw ApiError.unauthorized('Invalid invitation token');
    }
  }
  if (invitation.email !== req.user.email) {
    throw ApiError.forbidden('This invitation was sent to a different email address');
  }


  const existing = await ProjectMember.findOne({ projectId: invitation.projectId, userId: req.user._id });
  if (existing && existing.status === 'ACTIVE') {
    throw ApiError.conflict('You are already a member of this project');
  }

  if (existing) {
    existing.status = 'ACTIVE';
    existing.role = invitation.role;
    existing.invitedBy = invitation.invitedBy;
    await existing.save();
  } else {
    await ProjectMember.create({
      projectId: invitation.projectId,
      userId: req.user._id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      status: 'ACTIVE',
    });
  }

  await Project.updateOne({ _id: invitation.projectId }, { $inc: { memberCount: 1 } });
  await invalidateMembership(req.user._id.toString(), invitation.projectId.toString());

  invitation.status = 'ACCEPTED';
  invitation.respondedAt = new Date();
  await invitation.save();

  await logActivity({
    projectId: invitation.projectId,
    actor: req.user._id,
    action: 'INVITATION_ACCEPTED',
    entityType: 'INVITATION',
    entityId: invitation._id,
  });

  return new ApiResponse(200, { projectId: invitation.projectId, role: invitation.role }, 'Invitation accepted').send(res);
});

// POST /invitations/:invitationId/reject
const rejectInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findById(req.params.invitationId);
  if (!invitation) throw ApiError.notFound('Invitation not found');
  if (invitation.email !== req.user.email) throw ApiError.forbidden('This invitation is not for you');
  if (invitation.status !== 'PENDING') throw ApiError.badRequest('Invitation is no longer pending');

  invitation.status = 'REJECTED';
  invitation.respondedAt = new Date();
  await invitation.save();

  return new ApiResponse(200, null, 'Invitation declined').send(res);
});

// DELETE /projects/:projectId/invitations/:invitationId  (OWNER, ADMIN) - cancel
const cancelInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({ _id: req.params.invitationId, projectId: req.project._id });
  if (!invitation) throw ApiError.notFound('Invitation not found');
  if (invitation.status !== 'PENDING') throw ApiError.badRequest('Only pending invitations can be cancelled');

  invitation.status = 'CANCELLED';
  await invitation.save();

  return new ApiResponse(200, null, 'Invitation cancelled').send(res);
});

module.exports = {
  createInvitation,
  listProjectInvitations,
  listMyInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
};
