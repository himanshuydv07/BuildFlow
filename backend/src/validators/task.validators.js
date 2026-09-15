const { z } = require('zod');
const { objectId } = require('./project.validators');
const { TASK_STATUSES, TASK_PRIORITIES } = require('../models/Task');

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignee: objectId.nullable().optional(),
  milestone: objectId.nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  estimatedHours: z.number().min(0).max(10000).optional(),
  dependsOn: z.array(objectId).optional(),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  epic: objectId.nullable().optional(),
  sprint: objectId.nullable().optional(),
  isBacklog: z.boolean().optional(),
});

const updateTaskSchema = createTaskSchema.partial();

const updateStatusSchema = z.object({ status: z.enum(TASK_STATUSES) });
const updateProgressSchema = z.object({ progress: z.number().min(0).max(100) });

const checklistItemSchema = z.object({ text: z.string().trim().min(1).max(200) });
const checklistToggleSchema = z.object({ done: z.boolean() });

const logTimeSchema = z.object({ hours: z.number().positive().max(1000) });

const taskIdParams = z.object({ projectId: objectId, taskId: objectId });
const checklistItemParams = z.object({ projectId: objectId, taskId: objectId, itemId: objectId });

const listTasksQuery = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignee: objectId.optional(),
  milestone: objectId.optional(),
  tag: z.string().optional(),
  sprint: objectId.optional(),
  epic: objectId.optional(),
  isBacklog: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  updateProgressSchema,
  checklistItemSchema,
  checklistToggleSchema,
  logTimeSchema,
  taskIdParams,
  checklistItemParams,
  listTasksQuery,
};
