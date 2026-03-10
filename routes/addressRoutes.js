const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const allRoles = ['partner-admin', 'account-admin', 'support-admin'];

router.post('/lookup-by-zip', authenticateToken, authorizeRoles(...allRoles), addressController.lookupByZip);
router.post('/lookup-by-city', authenticateToken, authorizeRoles(...allRoles), addressController.lookupByCity);
router.post('/verify', authenticateToken, authorizeRoles(...allRoles), addressController.verifyAddress);
router.post('/autocomplete', authenticateToken, authorizeRoles(...allRoles), addressController.autocomplete);

module.exports = router;
