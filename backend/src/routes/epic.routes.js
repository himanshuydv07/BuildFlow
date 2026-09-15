const express = require('express');
const controller = require('../controllers/epic.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/sprint.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createEpicSchema }), controller.createEpic);
router.get('/', controller.listEpics);
router.delete('/:epicId', validate({ params: v.epicParams }), controller.deleteEpic);

module.exports = router;
