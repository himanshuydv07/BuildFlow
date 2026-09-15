const express = require('express');
const controller = require('../controllers/member.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectRole, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/member.validators');
const { projectIdParams } = require('../validators/project.validators');

// mergeParams so :projectId from the parent router is visible here
const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject);

router.get('/', requireProjectMember(), controller.listMembers);

router.patch(
  '/:memberId',
  validate({ params: v.memberParams, body: v.updateRoleSchema }),
  requireProjectRole('OWNER', 'ADMIN'),
  controller.updateMemberRole
);

router.delete(
  '/:memberId',
  validate({ params: v.memberParams }),
  requireProjectRole('OWNER', 'ADMIN'),
  controller.removeMember
);

router.post('/leave', requireProjectMember(), controller.leaveProject);

module.exports = router;
