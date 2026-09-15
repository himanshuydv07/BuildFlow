const express = require('express');
const controller = require('../controllers/note.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/note.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createNoteSchema }), controller.createProjectNote);
router.get('/', controller.listProjectNotes);

module.exports = router;
