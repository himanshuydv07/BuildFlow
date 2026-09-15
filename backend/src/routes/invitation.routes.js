const express = require('express');
const controller = require('../controllers/invitation.controller');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators/invitation.validators');

const router = express.Router();
router.use(requireAuth);

router.get('/me', controller.listMyInvitations);
router.post('/:invitationId/accept', validate({ body: v.respondInvitationSchema }), controller.acceptInvitation);
router.post('/:invitationId/reject', controller.rejectInvitation);

module.exports = router;
