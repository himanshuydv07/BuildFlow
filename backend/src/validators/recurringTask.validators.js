const { z } = require('zod');
const { objectId } = require('./project.validators');

const createRecurringTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  assignee: objectId.nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.number().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().min(1).max(28).nullable().optional(),
});
const recurringTaskParams = z.object({ projectId: objectId, recurringTaskId: objectId });

module.exports = { createRecurringTaskSchema, recurringTaskParams };
