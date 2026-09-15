const { z } = require('zod');
const { objectId } = require('./project.validators');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../models/Task');

const createSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(60),
  filters: z.object({
    status: z.enum(TASK_STATUSES).nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).nullable().optional(),
    assignee: objectId.nullable().optional(),
    tag: z.string().nullable().optional(),
    dueWithinDays: z.number().int().positive().nullable().optional(),
  }),
});
const savedViewParams = z.object({ projectId: objectId, viewId: objectId });

module.exports = { createSavedViewSchema, savedViewParams };
