const { z } = require('zod');
const { PROJECT_STATUSES, PROJECT_PRIORITIES } = require('../models/Project');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PROJECT_PRIORITIES).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  icon: z.string().max(10).optional(),
  color: z.string().max(20).optional(),
  templateKey: z.string().max(50).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const projectIdParams = z.object({ projectId: objectId });

const transferOwnershipSchema = z.object({ newOwnerId: objectId });

module.exports = {
  objectId,
  createProjectSchema,
  updateProjectSchema,
  projectIdParams,
  transferOwnershipSchema,
};
