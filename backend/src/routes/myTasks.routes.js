const express = require('express');
const controller = require('../controllers/task.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.get('/', requireAuth, controller.listMyTasks);

module.exports = router;
