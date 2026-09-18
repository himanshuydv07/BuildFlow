const express = require('express');
const controller = require('../controllers/activity.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/', requireAuth, controller.listMyActivity);

module.exports = router;