const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const { notify, emitToProject } = require('../services/notificationService');
const { logActivity } = require('../services/activityService');

// POST /projects/:projectId/tasks/:taskId/comments  (any active member — VIEWER excluded)
const createComment = asyncHandler(async (req, res) => {
  if (req.membership.role === 'VIEWER') {
    throw ApiError.forbidden('Viewers cannot post comments');
  }

  const task = await Task.findOne({ _id: req.params.taskId, projectId: req.project._id, isDeleted: false });
  if (!task) throw ApiError.notFound('Task not found');

  const { content, parentComment, mentions } = req.body;

  // Only mention users who are actually active members of this project —
  // otherwise a comment could be used to probe/notify arbitrary user IDs.
  let validMentions = [];
  if (mentions && mentions.length > 0) {
    const activeMemberIds = await ProjectMember.find({
      projectId: req.project._id,
      userId: { $in: mentions },
      status: 'ACTIVE',
    }).distinct('userId');
    validMentions = activeMemberIds.map((id) => id.toString());
  }

  const comment = await Comment.create({
    projectId: req.project._id,
    taskId: task._id,
    parentComment: parentComment || null,
    author: req.user._id,
    content,
    mentions: validMentions,
  });

  await Promise.all(
    validMentions
      .filter((id) => id !== req.user._id.toString())
      .map((userId) =>
        notify({
          user: userId,
          type: 'MENTIONED_IN_COMMENT',
          message: `${req.user.name} mentioned you in a comment on "${task.title}"`,
          entityType: 'COMMENT',
          entityId: comment._id,
          projectId: req.project._id,
        })
      )
  );

  if (task.assignee && task.assignee.toString() !== req.user._id.toString() && !validMentions.includes(task.assignee.toString())) {
    await notify({
      user: task.assignee,
      type: 'COMMENT_ADDED',
      message: `${req.user.name} commented on "${task.title}"`,
      entityType: 'COMMENT',
      entityId: comment._id,
      projectId: req.project._id,
    });
  }

  await logActivity({
    projectId: req.project._id,
    actor: req.user._id,
    action: 'COMMENT_ADDED',
    entityType: 'COMMENT',
    entityId: comment._id,
  });

  await comment.populate('author', 'name email avatarUrl');
  emitToProject(req.project._id, 'comment:created', { taskId: task._id, comment });
  return new ApiResponse(201, { comment }, 'Comment added').send(res);
});

// GET /projects/:projectId/tasks/:taskId/comments
const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ taskId: req.params.taskId, projectId: req.project._id, isDeleted: false })
    .populate('author', 'name email avatarUrl')
    .populate('mentions', 'name')
    .sort({ createdAt: 1 })
    .lean();

  return new ApiResponse(200, { comments }).send(res);
});

// PATCH /projects/:projectId/tasks/:taskId/comments/:commentId  (author only)
const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, taskId: req.params.taskId, isDeleted: false });
  if (!comment) throw ApiError.notFound('Comment not found');
  if (comment.author.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own comments');
  }

  comment.content = req.body.content;
  comment.isEdited = true;
  await comment.save();

  return new ApiResponse(200, { comment }, 'Comment updated').send(res);
});

// DELETE /projects/:projectId/tasks/:taskId/comments/:commentId  (author, or OWNER/ADMIN)
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, taskId: req.params.taskId, isDeleted: false });
  if (!comment) throw ApiError.notFound('Comment not found');

  const canManage = ['OWNER', 'ADMIN'].includes(req.membership.role);
  if (comment.author.toString() !== req.user._id.toString() && !canManage) {
    throw ApiError.forbidden('You do not have permission to delete this comment');
  }

  comment.isDeleted = true;
  comment.content = '[deleted]';
  await comment.save();

  return new ApiResponse(200, null, 'Comment deleted').send(res);
});

module.exports = { createComment, listComments, updateComment, deleteComment };
