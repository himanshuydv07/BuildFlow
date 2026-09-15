const { z } = require('zod');
const { objectId } = require('./project.validators');
const { ROLES } = require('../models/ProjectMember');

const updateRoleSchema = z.object({ role: z.enum(ROLES) });
const memberParams = z.object({ projectId: objectId, memberId: objectId });

module.exports = { updateRoleSchema, memberParams };
