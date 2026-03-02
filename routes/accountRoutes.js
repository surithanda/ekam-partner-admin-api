const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const readRoles = ['partner-admin', 'account-admin', 'support-admin'];
const writeRoles = ['partner-admin', 'support-admin'];

router.post('/list', authenticateToken, authorizeRoles(...readRoles), accountController.getAccounts);
router.post('/detail', authenticateToken, authorizeRoles(...readRoles), accountController.getAccountDetail);
router.post('/create', authenticateToken, authorizeRoles(...writeRoles), accountController.createAccount);
router.post('/update', authenticateToken, authorizeRoles(...writeRoles), accountController.updateAccount);
router.post('/toggle-status', authenticateToken, authorizeRoles(...writeRoles), accountController.toggleStatus);
router.post('/delete', authenticateToken, authorizeRoles('partner-admin'), accountController.deleteAccount);

module.exports = router;
