const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/metrics', authenticateToken, authorizeRoles('partner-admin', 'account-admin'), dashboardController.getMetrics);
router.post('/activities', authenticateToken, authorizeRoles('partner-admin', 'account-admin'), dashboardController.getRecentActivities);

module.exports = router;
