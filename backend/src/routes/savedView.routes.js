const express = require('express');
const controller = require('../controllers/savedView.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/savedView.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createSavedViewSchema }), controller.createSavedView);
router.get('/', controller.listSavedViews);
router.delete('/:viewId', validate({ params: v.savedViewParams }), controller.deleteSavedView);

module.exports = router;
