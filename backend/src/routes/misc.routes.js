const express = require('express');
const searchController = require('../controllers/search.controller');
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');

const searchRouter = express.Router();
searchRouter.get('/', requireAuth, searchController.search);

const dashboardRouter = express.Router();
dashboardRouter.get('/', requireAuth, dashboardController.getWorkspaceDashboard);

module.exports = { searchRouter, dashboardRouter };
