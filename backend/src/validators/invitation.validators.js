const { z } = require('zod');
const { objectId } = require('./project.validators');
const { ROLES } = require('../models/ProjectMember');

const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(ROLES.filter((r) => r !== 'OWNER')).default('MEMBER'),
});

// token is OPTIONAL: someone accepting via the emailed link sends it
// (proves link possession); someone accepting from the in-app "My
// Invitations" list doesn't have it, and doesn't need it — they're
// already authenticated as the exact invited email, which the
// controller checks instead.
const respondInvitationSchema = z.object({
  token: z.string().min(1).optional(),
});

const invitationParams = z.object({ projectId: objectId, invitationId: objectId });

module.exports = { createInvitationSchema, respondInvitationSchema, invitationParams };