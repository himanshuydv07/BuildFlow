const { z } = require('zod');
const { objectId } = require('./project.validators');

const createMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().max(2000).optional().default(''),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

const updateMilestoneSchema = createMilestoneSchema.partial().extend({
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED']).optional(),
});

const milestoneParams = z.object({ projectId: objectId, milestoneId: objectId });

module.exports = { createMilestoneSchema, updateMilestoneSchema, milestoneParams };
