const { z } = require('zod');
const { objectId } = require('./project.validators');

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(3000),
  parentComment: objectId.nullable().optional(),
  mentions: z.array(objectId).max(20).optional().default([]),
});

const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(3000),
});

const commentParams = z.object({ projectId: objectId, taskId: objectId, commentId: objectId });
const taskCommentsParams = z.object({ projectId: objectId, taskId: objectId });

module.exports = { createCommentSchema, updateCommentSchema, commentParams, taskCommentsParams };
