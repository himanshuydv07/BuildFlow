const express = require('express');
const controller = require('../controllers/sprint.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/sprint.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createSprintSchema }), controller.createSprint);
router.get('/', controller.listSprints);
router.patch('/:sprintId', validate({ params: v.sprintParams, body: v.updateSprintSchema }), controller.updateSprint);
router.get('/:sprintId/board', validate({ params: v.sprintParams }), controller.getSprintBoard);

module.exports = router;
