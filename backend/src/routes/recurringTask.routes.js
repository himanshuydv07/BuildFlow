const express = require('express');
const controller = require('../controllers/recurringTask.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/recurringTask.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createRecurringTaskSchema }), controller.createRecurringTask);
router.get('/', controller.listRecurringTasks);
router.delete('/:recurringTaskId', validate({ params: v.recurringTaskParams }), controller.deleteRecurringTask);

module.exports = router;
