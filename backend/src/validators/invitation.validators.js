const { z } = require('zod');
const { objectId } = require('./project.validators');
const { ROLES } = require('../models/ProjectMember');

const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(ROLES.filter((r) => r !== 'OWNER')).default('MEMBER'),
});
const respondInvitationSchema = z.object({
  token: z.string().min(1).optional(),
});

const invitationParams = z.object({ projectId: objectId, invitationId: objectId });

module.exports = { createInvitationSchema, respondInvitationSchema, invitationParams };
