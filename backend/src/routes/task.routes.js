const express = require('express');
const controller = require('../controllers/task.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/task.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createTaskSchema }), controller.createTask);
router.get('/', validate({ query: v.listTasksQuery }), controller.listTasks);
router.get('/:taskId', validate({ params: v.taskIdParams }), controller.getTask);
router.patch('/:taskId', validate({ params: v.taskIdParams, body: v.updateTaskSchema }), controller.updateTask);
router.delete('/:taskId', validate({ params: v.taskIdParams }), controller.deleteTask);

router.patch(
  '/:taskId/status',
  validate({ params: v.taskIdParams, body: v.updateStatusSchema }),
  controller.updateTaskStatus
);
router.patch(
  '/:taskId/progress',
  validate({ params: v.taskIdParams, body: v.updateProgressSchema }),
  controller.updateTaskProgress
);

router.post(
  '/:taskId/checklist',
  validate({ params: v.taskIdParams, body: v.checklistItemSchema }),
  controller.addChecklistItem
);
router.patch(
  '/:taskId/checklist/:itemId',
  validate({ params: v.checklistItemParams, body: v.checklistToggleSchema }),
  controller.toggleChecklistItem
);

router.post('/:taskId/log-time', validate({ params: v.taskIdParams, body: v.logTimeSchema }), controller.logTime);
router.post('/:taskId/timer/start', validate({ params: v.taskIdParams }), controller.startTimer);
router.post('/:taskId/timer/stop', validate({ params: v.taskIdParams }), controller.stopTimer);

module.exports = router;
