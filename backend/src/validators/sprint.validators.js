const { z } = require('zod');
const { objectId } = require('./project.validators');

const createSprintSchema = z.object({
  name: z.string().trim().min(1).max(100),
  goal: z.string().max(500).optional().default(''),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
const updateSprintSchema = createSprintSchema.partial().extend({
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED']).optional(),
});
const sprintParams = z.object({ projectId: objectId, sprintId: objectId });

const createEpicSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional().default(''),
  color: z.string().max(20).optional(),
});
const epicParams = z.object({ projectId: objectId, epicId: objectId });

module.exports = { createSprintSchema, updateSprintSchema, sprintParams, createEpicSchema, epicParams };
