const express = require('express');
const controller = require('../controllers/invitation.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/invitation.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject);

router.post(
  '/',
  validate({ body: v.createInvitationSchema }),
  requireProjectRole('OWNER', 'ADMIN'),
  controller.createInvitation
);

router.get('/', requireProjectRole('OWNER', 'ADMIN'), controller.listProjectInvitations);

router.delete(
  '/:invitationId',
  validate({ params: v.invitationParams }),
  requireProjectRole('OWNER', 'ADMIN'),
  controller.cancelInvitation
);

module.exports = router;
