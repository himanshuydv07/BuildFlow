const express = require('express');
const controller = require('../controllers/project.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectRole, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/project.validators');

const router = express.Router();
router.use(requireAuth);

router.post('/', validate({ body: v.createProjectSchema }), controller.createProject);
router.get('/', controller.listMyProjects);
router.get('/templates', controller.getTemplateList);

router.get('/:projectId', validate({ params: v.projectIdParams }), loadProject, requireProjectMember(), controller.getProject);

router.patch(
  '/:projectId',
  validate({ params: v.projectIdParams, body: v.updateProjectSchema }),
  loadProject,
  requireProjectRole('OWNER', 'ADMIN'),
  controller.updateProject
);

router.delete(
  '/:projectId',
  validate({ params: v.projectIdParams }),
  loadProject,
  requireProjectRole('OWNER'),
  controller.archiveProject
);

router.post(
  '/:projectId/transfer-ownership',
  validate({ params: v.projectIdParams, body: v.transferOwnershipSchema }),
  loadProject,
  requireProjectRole('OWNER'),
  controller.transferOwnership
);

router.get(
  '/:projectId/dashboard',
  validate({ params: v.projectIdParams }),
  loadProject,
  requireProjectMember(),
  controller.getProjectDashboard
);

module.exports = router;
