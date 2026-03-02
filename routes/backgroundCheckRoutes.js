const express = require('express');
const router = express.Router();
const backgroundCheckController = require('../controllers/backgroundCheckController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/profile', authenticateToken, authorizeRoles('partner-admin', 'support-admin'), backgroundCheckController.getProfileForCheck);
router.post('/initiate', authenticateToken, authorizeRoles('partner-admin', 'support-admin'), backgroundCheckController.initiateCheck);

// ── Phase 7: Background Check Tracking ──
const writeRoles = ['partner-admin', 'support-admin'];
const readRoles = ['partner-admin', 'account-admin', 'support-admin'];

router.post('/create', authenticateToken, authorizeRoles(...writeRoles), backgroundCheckController.createCheck);
router.post('/update-status', authenticateToken, authorizeRoles(...writeRoles), backgroundCheckController.updateCheckStatus);
router.post('/profile-history', authenticateToken, authorizeRoles(...readRoles), backgroundCheckController.getChecksByProfile);
router.post('/list', authenticateToken, authorizeRoles(...readRoles), backgroundCheckController.getChecksList);
router.post('/detail', authenticateToken, authorizeRoles(...readRoles), backgroundCheckController.getCheckDetail);

module.exports = router;
