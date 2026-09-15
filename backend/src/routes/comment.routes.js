const express = require('express');
const controller = require('../controllers/comment.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/comment.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ params: v.taskCommentsParams, body: v.createCommentSchema }), controller.createComment);
router.get('/', validate({ params: v.taskCommentsParams }), controller.listComments);
router.patch(
  '/:commentId',
  validate({ params: v.commentParams, body: v.updateCommentSchema }),
  controller.updateComment
);
router.delete('/:commentId', validate({ params: v.commentParams }), controller.deleteComment);

module.exports = router;
