const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/list', authenticateToken, authorizeRoles('partner-admin'), adminUserController.listUsers);
router.post('/create', authenticateToken, authorizeRoles('partner-admin'), adminUserController.createUser);
router.post('/update', authenticateToken, authorizeRoles('partner-admin'), adminUserController.updateUser);
router.post('/toggle-status', authenticateToken, authorizeRoles('partner-admin'), adminUserController.toggleUserStatus);
router.post('/reset-password', authenticateToken, authorizeRoles('partner-admin'), adminUserController.resetPassword);

module.exports = router;
