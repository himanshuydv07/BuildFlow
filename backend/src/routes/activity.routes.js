const express = require('express');
const controller = require('../controllers/activity.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.get('/', controller.listProjectActivity);

module.exports = router;
