const express = require('express');
const controller = require('../controllers/milestone.controller');
const { requireAuth } = require('../middleware/auth');
const { loadProject, requireProjectMember } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const v = require('../validators/milestone.validators');
const { projectIdParams } = require('../validators/project.validators');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, validate({ params: projectIdParams }), loadProject, requireProjectMember());

router.post('/', validate({ body: v.createMilestoneSchema }), controller.createMilestone);
router.get('/', controller.listMilestones);
router.get('/:milestoneId', validate({ params: v.milestoneParams }), controller.getMilestone);
router.patch(
  '/:milestoneId',
  validate({ params: v.milestoneParams, body: v.updateMilestoneSchema }),
  controller.updateMilestone
);
router.delete('/:milestoneId', validate({ params: v.milestoneParams }), controller.deleteMilestone);

module.exports = router;
