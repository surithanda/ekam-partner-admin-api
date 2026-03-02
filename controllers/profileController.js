const profileDatalayer = require('../datalayer/profileDatalayer');
const { createAppError } = require('../config/errorCodes');
const azureStorage = require('../config/azureStorage');
const { generateCertificatePdf } = require('../utils/pdfCertificateGenerator');
const profileAdo = require('../ado/profileAdo');

// Helper: attach SAS read URLs to an array of photo objects
function attachSasUrls(photos) {
  if (!Array.isArray(photos)) return photos;
  return photos.map(photo => {
    if (photo.relative_path) {
      try {
        photo.sasUrl = azureStorage.generateSasReadUrl(photo.relative_path, 60);
        const thumbBlobName = photo.relative_path.replace(/\.(\w+)$/, '_thumb.$1');
        photo.thumbSasUrl = azureStorage.generateSasReadUrl(thumbBlobName, 60);
      } catch (_) { /* fallback below */ }
    } else if (photo.url && photo.url.includes('.blob.core.windows.net')) {
      try {
        const urlObj = new URL(photo.url.split('?')[0]);
        const container = azureStorage.getContainerName();
        const blobName = urlObj.pathname.replace(`/${container}/`, '');
        photo.sasUrl = azureStorage.generateSasReadUrl(blobName, 60);
        const thumbBlobName = blobName.replace(/\.(\w+)$/, '_thumb.$1');
        photo.thumbSasUrl = azureStorage.generateSasReadUrl(thumbBlobName, 60);
      } catch (_) { /* non-Azure URL, keep original */ }
    }
    return photo;
  });
}

const profileController = {
  async getProfiles(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 20;
      const search = req.body.search || '';
      const status = req.body.status !== undefined && req.body.status !== null && req.body.status !== '' ? parseInt(req.body.status) : null;
      const gender = req.body.gender !== undefined && req.body.gender !== null && req.body.gender !== '' ? parseInt(req.body.gender) : null;

      const result = await profileDatalayer.getProfiles(partnerId, page, limit, search, status, gender);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getProfileDetail(req, res, next) {
    try {
      const profileId = parseInt(req.body.id);

      const profile = await profileDatalayer.getProfileDetail(profileId);

      // Generate time-limited SAS read URLs for Azure-hosted photos (main + thumbnail)
      if (profile && profile.photos) {
        profile.photos = attachSasUrls(profile.photos);
      }

      return res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  },

  async createProfile(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const data = req.body;
      data.created_user = req.user.username;

      const result = await profileDatalayer.createProfile(data, partnerId);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const profileId = parseInt(req.body.id);
      const data = req.body;
      data.updated_user = req.user.username;

      const result = await profileDatalayer.updateProfile(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const { id, isActive } = req.body;
      const profileId = parseInt(id);

      await profileDatalayer.toggleProfileStatus(profileId, isActive);
      return res.json({ success: true, message: 'Profile status updated' });
    } catch (error) {
      next(error);
    }
  },

  async getLookups(req, res, next) {
    try {
      const lookupType = req.body.type || null;
      const lookups = await profileDatalayer.getLookups(lookupType);
      return res.json({ success: true, data: lookups });
    } catch (error) {
      next(error);
    }
  },

  // ── Personal (lightweight — replaces getProfileDetail for initial page load) ──
  async getPersonal(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const personal = await profileDatalayer.getPersonal(profileId);
      return res.json({ success: true, data: personal });
    } catch (error) { next(error); }
  },

  // ══════════════════════════════════════════════════
  // ── Sub-section CRUD Handlers (Phase 3)
  // ══════════════════════════════════════════════════

  // ── Address ──
  async createAddress(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createAddress(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateAddress(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateAddress(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async getAddress(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getAddress(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteAddress(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const addressId = parseInt(req.body.address_id);
      const result = await profileDatalayer.deleteAddress(profileId, addressId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Contact ──
  async getContact(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getContact(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createContact(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createContact(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateContact(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateContact(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteContact(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const contactId = parseInt(req.body.contact_id);
      const result = await profileDatalayer.deleteContact(profileId, contactId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Education ──
  async getEducation(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getEducation(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createEducation(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createEducation(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateEducation(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateEducation(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteEducation(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const educationId = parseInt(req.body.education_id);
      const result = await profileDatalayer.deleteEducation(profileId, educationId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Employment ──
  async getEmployment(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getEmployment(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createEmployment(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createEmployment(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateEmployment(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateEmployment(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteEmployment(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const employmentId = parseInt(req.body.employment_id);
      const result = await profileDatalayer.deleteEmployment(profileId, employmentId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Family ──
  async getFamily(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getFamily(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createFamily(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createFamily(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateFamily(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateFamily(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteFamily(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const familyId = parseInt(req.body.family_id);
      const result = await profileDatalayer.deleteFamily(profileId, familyId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Lifestyle ──
  async getLifestyle(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getLifestyle(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createLifestyle(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createLifestyle(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateLifestyle(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateLifestyle(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteLifestyle(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const lifestyleId = parseInt(req.body.lifestyle_id);
      const result = await profileDatalayer.deleteLifestyle(profileId, lifestyleId, username);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Hobby ──
  async getHobby(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getHobby(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createHobby(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createHobby(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateHobby(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const hobbyId = parseInt(req.body.hobby_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateHobby(profileId, hobbyId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteHobby(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const hobbyId = parseInt(req.body.hobby_id);
      const result = await profileDatalayer.deleteHobby(profileId, hobbyId, username);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Property ──
  async getProperty(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getProperty(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createProperty(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_by: username };
      const result = await profileDatalayer.createProperty(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateProperty(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, modified_user: username };
      const result = await profileDatalayer.updateProperty(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteProperty(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const propertyId = parseInt(req.body.property_id);
      const result = await profileDatalayer.deleteProperty(profileId, propertyId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Photo ──
  async getPhotos(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getPhotos(profileId);
      return res.json({ success: true, data: attachSasUrls(result) });
    } catch (error) { next(error); }
  },

  /**
   * Upload a photo: receives multipart form (photo file + metadata),
   * processes (resize, watermark, thumbnail), uploads to Azure, saves to DB.
   * Replaces the old 3-step flow (getUploadUrl → client PUT → createPhoto).
   */
  async uploadPhoto(req, res, next) {
    try {
      const { username, partnerId } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const photoType = parseInt(req.body.photo_type);
      const categoryName = req.body.category_name;

      if (!profileId || !photoType || !categoryName) {
        return res.status(400).json({
          success: false,
          error: { message: 'profile_id, photo_type, and category_name are required.' }
        });
      }

      const fileBuffer = req.file.buffer;
      const result = await profileDatalayer.uploadPhoto(
        profileId, partnerId, fileBuffer, photoType, categoryName, username
      );

      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async deletePhoto(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const photoId = parseInt(req.body.photo_id);
      const result = await profileDatalayer.deletePhoto(profileId, photoId, username);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async setPhotoPrimary(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const photoId = parseInt(req.body.photo_id);
      const result = await profileDatalayer.setPhotoPrimary(profileId, photoId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── Search Preference ──
  async getSearchPreference(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.getSearchPreference(profileId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async createSearchPreference(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body, created_user: username };
      const result = await profileDatalayer.createSearchPreference(profileId, data);
      return res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async updateSearchPreference(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const data = { ...req.body };
      const result = await profileDatalayer.updateSearchPreference(profileId, data);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },
  async deleteSearchPreference(req, res, next) {
    try {
      const profileId = parseInt(req.body.profile_id);
      const prefId = parseInt(req.body.search_preference_id);
      const result = await profileDatalayer.deleteSearchPreference(profileId, prefId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  // ── GDPR Delete Operations ──

  async softDelete(req, res, next) {
    try {
      const { username } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const reason = req.body.reason || '';
      const result = await profileDatalayer.softDeleteAccount(profileId, username, reason);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async restore(req, res, next) {
    try {
      const { username, partnerId } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const result = await profileDatalayer.restoreAccount(profileId, partnerId, username);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async hardDelete(req, res, next) {
    try {
      const { username, partnerId } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const confirmText = req.body.confirm_text;
      const reasonType = req.body.reason_type || '';
      const reasonNotes = req.body.reason_notes || '';

      if (confirmText !== 'DELETE') {
        return res.status(400).json({
          success: false,
          error: { message: 'You must type "DELETE" to confirm permanent deletion.' }
        });
      }

      const result = await profileDatalayer.hardDeleteProfile(profileId, partnerId, username, reasonType, reasonNotes);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async anonymize(req, res, next) {
    try {
      const { username, partnerId } = req.user;
      const profileId = parseInt(req.body.profile_id);
      const reasonType = req.body.reason_type || '';
      const reasonNotes = req.body.reason_notes || '';

      const result = await profileDatalayer.anonymizeProfile(profileId, partnerId, username, reasonType, reasonNotes);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async listDeleted(req, res, next) {
    try {
      const { partnerId } = req.user;
      const page = parseInt(req.body.page) || 1;
      const pageSize = parseInt(req.body.page_size) || 20;
      const result = await profileDatalayer.listDeletedProfiles(partnerId, page, pageSize);
      return res.json({ success: true, ...result });
    } catch (error) { next(error); }
  },

  async getDeletionCertificates(req, res, next) {
    try {
      const { partnerId } = req.user;
      const result = await profileDatalayer.getDeletionCertificates(partnerId);
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async getDeletionCertificate(req, res, next) {
    try {
      const { partnerId } = req.user;
      const certificateId = parseInt(req.body.certificate_id);
      const result = await profileDatalayer.getDeletionCertificate(certificateId, partnerId);
      if (!result) {
        return res.status(404).json({ success: false, error: { message: 'Certificate not found' } });
      }
      return res.json({ success: true, data: result });
    } catch (error) { next(error); }
  },

  async downloadCertificatePdf(req, res, next) {
    try {
      const { partnerId } = req.user;
      const certificateId = parseInt(req.body.certificate_id);

      const cert = await profileDatalayer.getDeletionCertificate(certificateId, partnerId);
      if (!cert) {
        return res.status(404).json({ success: false, error: { message: 'Certificate not found' } });
      }

      // Get partner brand name
      let partnerName = 'Partner Admin';
      try {
        const brand = await profileAdo.getPartnerBrandName(partnerId);
        if (brand) partnerName = brand;
      } catch (_) {}

      const pdfBuffer = await generateCertificatePdf(cert, partnerName);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${cert.certificate_code}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.send(pdfBuffer);
    } catch (error) { next(error); }
  }
};

module.exports = profileController;
