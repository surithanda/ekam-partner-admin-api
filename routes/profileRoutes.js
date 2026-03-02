const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { handlePhotoUpload } = require('../middleware/upload');

router.post('/list', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), profileController.getProfiles);
router.post('/lookups', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), profileController.getLookups);
router.post('/detail', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), profileController.getProfileDetail);
router.post('/create', authenticateToken, authorizeRoles('partner-admin', 'support-admin'), profileController.createProfile);
router.post('/update', authenticateToken, authorizeRoles('partner-admin', 'support-admin'), profileController.updateProfile);
router.post('/toggle-status', authenticateToken, authorizeRoles('partner-admin', 'support-admin'), profileController.toggleStatus);

// Personal (lightweight — single SP call)
router.post('/personal/get', authenticateToken, authorizeRoles('partner-admin', 'account-admin', 'support-admin'), profileController.getPersonal);

// ── Sub-section CRUD Routes (Phase 3) ──
const writeRoles = ['partner-admin', 'support-admin'];
const readRoles = ['partner-admin', 'account-admin', 'support-admin'];

// Address
router.post('/address/get', authenticateToken, authorizeRoles(...readRoles), profileController.getAddress);
router.post('/address/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createAddress);
router.post('/address/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateAddress);
router.post('/address/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteAddress);

// Contact
router.post('/contact/get', authenticateToken, authorizeRoles(...readRoles), profileController.getContact);
router.post('/contact/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createContact);
router.post('/contact/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateContact);
router.post('/contact/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteContact);

// Education
router.post('/education/get', authenticateToken, authorizeRoles(...readRoles), profileController.getEducation);
router.post('/education/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createEducation);
router.post('/education/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateEducation);
router.post('/education/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteEducation);

// Employment
router.post('/employment/get', authenticateToken, authorizeRoles(...readRoles), profileController.getEmployment);
router.post('/employment/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createEmployment);
router.post('/employment/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateEmployment);
router.post('/employment/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteEmployment);

// Family
router.post('/family/get', authenticateToken, authorizeRoles(...readRoles), profileController.getFamily);
router.post('/family/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createFamily);
router.post('/family/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateFamily);
router.post('/family/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteFamily);

// Lifestyle
router.post('/lifestyle/get', authenticateToken, authorizeRoles(...readRoles), profileController.getLifestyle);
router.post('/lifestyle/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createLifestyle);
router.post('/lifestyle/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateLifestyle);
router.post('/lifestyle/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteLifestyle);

// Hobby
router.post('/hobby/get', authenticateToken, authorizeRoles(...readRoles), profileController.getHobby);
router.post('/hobby/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createHobby);
router.post('/hobby/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateHobby);
router.post('/hobby/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteHobby);

// Property
router.post('/property/get', authenticateToken, authorizeRoles(...readRoles), profileController.getProperty);
router.post('/property/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createProperty);
router.post('/property/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateProperty);
router.post('/property/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteProperty);

// Photo
router.post('/photos/get', authenticateToken, authorizeRoles(...readRoles), profileController.getPhotos);
router.post('/photos/upload', authenticateToken, authorizeRoles(...writeRoles), handlePhotoUpload, profileController.uploadPhoto);
router.post('/photos/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deletePhoto);
router.post('/photos/set-primary', authenticateToken, authorizeRoles(...writeRoles), profileController.setPhotoPrimary);

// Search Preference
router.post('/search-preference/get', authenticateToken, authorizeRoles(...readRoles), profileController.getSearchPreference);
router.post('/search-preference/create', authenticateToken, authorizeRoles(...writeRoles), profileController.createSearchPreference);
router.post('/search-preference/update', authenticateToken, authorizeRoles(...writeRoles), profileController.updateSearchPreference);
router.post('/search-preference/delete', authenticateToken, authorizeRoles(...writeRoles), profileController.deleteSearchPreference);

// ── GDPR Delete Operations (Phase 6) ──
router.post('/soft-delete', authenticateToken, authorizeRoles(...writeRoles), profileController.softDelete);
router.post('/restore', authenticateToken, authorizeRoles(...writeRoles), profileController.restore);
router.post('/hard-delete', authenticateToken, authorizeRoles(...writeRoles), profileController.hardDelete);
router.post('/anonymize', authenticateToken, authorizeRoles(...writeRoles), profileController.anonymize);
router.post('/deleted-list', authenticateToken, authorizeRoles(...readRoles), profileController.listDeleted);
router.post('/deletion-certificates', authenticateToken, authorizeRoles(...readRoles), profileController.getDeletionCertificates);
router.post('/deletion-certificate', authenticateToken, authorizeRoles(...readRoles), profileController.getDeletionCertificate);
router.post('/deletion-certificate/download', authenticateToken, authorizeRoles(...readRoles), profileController.downloadCertificatePdf);

module.exports = router;
