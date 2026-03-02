const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/list', authenticateToken, authorizeRoles('partner-admin'), auditController.getAuditLogs);

module.exports = router;
