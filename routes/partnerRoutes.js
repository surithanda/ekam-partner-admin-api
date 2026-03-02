const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const brandConfigController = require('../controllers/brandConfigController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.post('/info', authenticateToken, authorizeRoles('partner-admin'), partnerController.getPartnerInfo);
router.post('/domain-links', authenticateToken, authorizeRoles('partner-admin'), partnerController.getDomainLinks);
router.post('/countries', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), partnerController.getCountries);
router.post('/states', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), partnerController.getStates);
router.post('/brand-config', authenticateToken, brandConfigController.getBrandConfig);
router.post('/brand-config/update', authenticateToken, authorizeRoles('partner-admin'), brandConfigController.updateBrandConfig);

module.exports = router;
