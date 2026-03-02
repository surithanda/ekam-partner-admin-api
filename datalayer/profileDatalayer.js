const profileAdo = require('../ado/profileAdo');
const { createAppError } = require('../config/errorCodes');

const profileDatalayer = {
  async getProfiles(partnerId, page, limit, search, status, gender) {
    return await profileAdo.getProfilesByPartner(partnerId, page, limit, search, status, gender);
  },

  async getProfileDetail(profileId) {
    const profile = await profileAdo.getFullProfile(profileId);
    if (!profile) throw createAppError('PA_PFGT_100_NOT_FOUND');
    return profile;
  },

  async getPersonal(profileId) {
    const personal = await profileAdo.getProfileById(profileId);
    if (!personal) throw createAppError('PA_PFGT_100_NOT_FOUND');
    return personal;
  },

  async createProfile(data, partnerId) {
    let accountId = data.account_id || null;
    let accountCode = null;

    if (!accountId) {
      // eb_account_login_create: creates account + login + generates account_code in one call
      const acct = await profileAdo.createAccountWithLogin({
        email: data.email_id,
        password: data.password || null,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        birth_date: data.birth_date,
        gender: data.gender,
        primary_phone: data.phone_mobile,
        primary_phone_country: data.primary_phone_country || '1',
        primary_phone_type: 1,
        secondary_phone: data.secondary_phone || null,
        secondary_phone_country: data.secondary_phone_country || null,
        secondary_phone_type: data.secondary_phone_type || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        country: data.country || null,
        photo: data.photo || null,
        secret_question: data.secret_question || null,
        secret_answer: data.secret_answer || null,
        partner_id: partnerId
      });
      accountId = acct.accountId;
      accountCode = acct.accountCode;
    }

    // Create profile personal — eb_profile_personal_create (29 params)
    const profileId = await profileAdo.createProfilePersonal({
      account_id: accountId,
      first_name: data.first_name,
      last_name: data.last_name,
      middle_name: data.middle_name,
      prefix: data.prefix,
      suffix: data.suffix,
      gender: data.gender,
      birth_date: data.birth_date,
      phone_mobile: data.phone_mobile,
      phone_home: data.phone_home,
      phone_emergency: data.phone_emergency,
      email_id: data.email_id,
      marital_status: data.marital_status,
      religion: data.religion,
      nationality: data.nationality,
      caste: data.caste,
      height_inches: data.height_inches,
      height_cms: data.height_cms,
      weight: data.weight,
      weight_units: data.weight_units,
      complexion: data.complexion,
      linkedin: data.linkedin,
      facebook: data.facebook,
      instagram: data.instagram,
      whatsapp_number: data.whatsapp_number,
      profession: data.profession,
      disability: data.disability,
      created_user: data.created_user || 'admin',
      short_summary: data.short_summary
    });

    return { accountId, accountCode, profileId };
  },

  async updateProfile(profileId, data) {
    const profile = await profileAdo.getProfileById(profileId);
    if (!profile) throw createAppError('PA_PFUP_100_NOT_FOUND');
    data.account_id = profile.account_id;
    await profileAdo.updateProfilePersonal(profileId, data);
    return await profileAdo.getFullProfile(profileId);
  },

  async toggleProfileStatus(profileId, isActive) {
    const profile = await profileAdo.getProfileById(profileId);
    if (!profile) throw createAppError('PA_PFTG_100_NOT_FOUND');
    await profileAdo.toggleAccountStatus(profile.account_id, isActive);
    return true;
  },

  // ══════════════════════════════════════════════════
  // ── Sub-section CRUD (Phase 3)
  // ── No per-request ownership check — profiles are tied to partner via account
  // ══════════════════════════════════════════════════

  // ── Address ──
  async getAddress(profileId) {
    return await profileAdo.getProfileAddress(profileId);
  },
  async createAddress(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileAddress(data);
  },
  async updateAddress(profileId, data) {
    return await profileAdo.updateProfileAddress(data);
  },
  async deleteAddress(profileId, addressId) {
    return await profileAdo.deleteProfileAddress(addressId, profileId);
  },

  // ── Contact ──
  async getContact(profileId) {
    return await profileAdo.getProfileContact(profileId);
  },
  async createContact(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileContact(data);
  },
  async updateContact(profileId, data) {
    return await profileAdo.updateProfileContact(data);
  },
  async deleteContact(profileId, contactId) {
    return await profileAdo.deleteProfileContact(contactId, profileId);
  },

  // ── Education ──
  async getEducation(profileId) {
    return await profileAdo.getProfileEducation(profileId);
  },
  async createEducation(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileEducation(data);
  },
  async updateEducation(profileId, data) {
    return await profileAdo.updateProfileEducation(data);
  },
  async deleteEducation(profileId, educationId) {
    return await profileAdo.deleteProfileEducation(educationId, profileId);
  },

  // ── Employment ──
  async getEmployment(profileId) {
    return await profileAdo.getProfileEmployment(profileId);
  },
  async createEmployment(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileEmployment(data);
  },
  async updateEmployment(profileId, data) {
    return await profileAdo.updateProfileEmployment(data);
  },
  async deleteEmployment(profileId, employmentId) {
    return await profileAdo.deleteProfileEmployment(employmentId, profileId);
  },

  // ── Family ──
  async getFamily(profileId) {
    return await profileAdo.getProfileFamily(profileId);
  },
  async createFamily(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileFamily(data);
  },
  async updateFamily(profileId, data) {
    return await profileAdo.updateProfileFamily(data);
  },
  async deleteFamily(profileId, familyId) {
    return await profileAdo.deleteProfileFamily(familyId, profileId);
  },

  // ── Lifestyle ──
  async getLifestyle(profileId) {
    return await profileAdo.getProfileLifestyle(profileId);
  },
  async createLifestyle(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileLifestyle(data);
  },
  async updateLifestyle(profileId, data) {
    return await profileAdo.updateProfileLifestyle(data);
  },
  async deleteLifestyle(profileId, lifestyleId, user) {
    return await profileAdo.deleteProfileLifestyle(lifestyleId, user);
  },

  // ── Hobby ──
  async getHobby(profileId) {
    return await profileAdo.getProfileHobbyInterest(profileId);
  },
  async createHobby(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileHobby(data);
  },
  async updateHobby(profileId, hobbyId, data) {
    data.profile_id = profileId;
    return await profileAdo.updateProfileHobby(hobbyId, data);
  },
  async deleteHobby(profileId, hobbyId, user) {
    return await profileAdo.deleteProfileHobby(hobbyId, user);
  },

  // ── Property ──
  async getProperty(profileId) {
    return await profileAdo.getProfileProperty(profileId);
  },
  async createProperty(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileProperty(data);
  },
  async updateProperty(profileId, data) {
    return await profileAdo.updateProfileProperty(data);
  },
  async deleteProperty(profileId, propertyId) {
    return await profileAdo.deleteProfileProperty(propertyId, profileId);
  },

  // ── Search Preference ──
  async getSearchPreference(profileId) {
    return await profileAdo.getProfileSearchPreference(profileId);
  },
  async createSearchPreference(profileId, data) {
    data.profile_id = profileId;
    return await profileAdo.createProfileSearchPreference(data);
  },
  async updateSearchPreference(profileId, data) {
    return await profileAdo.updateProfileSearchPreference(data);
  },
  async deleteSearchPreference(profileId, prefId) {
    return await profileAdo.deleteProfileSearchPreference(prefId, profileId);
  },

  // ── Photo ──
  async getPhotos(profileId) {
    return await profileAdo.getProfilePhotos(profileId);
  },

  /**
   * Full upload pipeline: process image (resize, watermark, thumbnail) → upload to Azure → save DB.
   * Replaces the old 3-step SAS flow (getUploadUrl → client PUT → createPhoto).
   * @param {number} profileId
   * @param {number} partnerId
   * @param {Buffer} fileBuffer - Raw image buffer from multer
   * @param {number} photoType - Lookup ID (450-456)
   * @param {string} categoryName - e.g. "Clear Headshot"
   * @param {string} username - Created by
   * @returns {Promise<Object>} Created photo record
   */
  async uploadPhoto(profileId, partnerId, fileBuffer, photoType, categoryName, username) {
    const azureStorage = require('../config/azureStorage');
    const { processImage } = require('../config/imageProcessor');

    // 1. Delete existing photo for this category (if any)
    const existing = await profileAdo.getProfilePhotoByType(profileId, photoType);
    if (existing) {
      // Delete old blobs from Azure (main + thumbnail)
      if (existing.relative_path) {
        try {
          await azureStorage.deleteBlob(existing.relative_path);
          const thumbBlobName = existing.relative_path.replace(/\.(\w+)$/, '_thumb.$1');
          await azureStorage.deleteBlob(thumbBlobName);
        } catch (_) { /* best-effort cleanup */ }
      } else if (existing.url && existing.url.startsWith('http')) {
        try {
          const urlObj = new URL(existing.url.split('?')[0]);
          const container = azureStorage.getContainerName();
          const blobName = urlObj.pathname.replace(`/${container}/`, '');
          await azureStorage.deleteBlob(blobName);
          await azureStorage.deleteBlob(blobName.replace(/\.(\w+)$/, '_thumb.$1'));
        } catch (_) { /* old photo may not be Azure-hosted */ }
      }
      await profileAdo.deleteProfilePhoto(existing.profile_photo_id, profileId, username || 'admin');
    }

    // 2. Get partner logo URL + brand name for watermarking
    const partnerLogoUrl = await profileAdo.getPartnerLogoUrl(partnerId);
    const partnerBrandName = await profileAdo.getPartnerBrandName(partnerId);

    // 3. Process image: resize, watermark (5-point + text), thumbnail
    const { main, thumbnail } = await processImage(fileBuffer, partnerLogoUrl, partnerBrandName);

    // 4. Build blob names and upload both to Azure
    const blobName = azureStorage.buildBlobName(partnerId, profileId, categoryName, 'jpg');
    const thumbBlobName = blobName.replace(/\.jpg$/, '_thumb.jpg');

    const [mainUrl] = await Promise.all([
      azureStorage.uploadBuffer(blobName, main, 'image/jpeg'),
      azureStorage.uploadBuffer(thumbBlobName, thumbnail, 'image/jpeg'),
    ]);

    // 5. Save record to DB via SP
    const result = await profileAdo.createProfilePhoto({
      profile_id: profileId,
      url: mainUrl,
      photo_type: photoType,
      caption: categoryName,
      description: 'Photo upload',
      relative_path: blobName,
      created_user: username || 'admin',
    });

    return result;
  },

  async deletePhoto(profileId, photoId, user) {
    const photos = await profileAdo.getProfilePhotos(profileId);
    const photo = photos.find(p => p.profile_photo_id === photoId);
    if (photo) {
      const azureStorage = require('../config/azureStorage');
      // Delete main blob
      if (photo.relative_path) {
        try {
          await azureStorage.deleteBlob(photo.relative_path);
          const thumbBlobName = photo.relative_path.replace(/\.(\w+)$/, '_thumb.$1');
          await azureStorage.deleteBlob(thumbBlobName);
        } catch (_) { /* best-effort cleanup */ }
      } else if (photo.url && photo.url.startsWith('http')) {
        try {
          const urlObj = new URL(photo.url.split('?')[0]);
          const container = azureStorage.getContainerName();
          const blobName = urlObj.pathname.replace(`/${container}/`, '');
          await azureStorage.deleteBlob(blobName);
          await azureStorage.deleteBlob(blobName.replace(/\.(\w+)$/, '_thumb.$1'));
        } catch (_) { /* best-effort Azure cleanup */ }
      }
    }
    return await profileAdo.deleteProfilePhoto(photoId, profileId, user);
  },
  async setPhotoPrimary(profileId, photoId) {
    return await profileAdo.setProfilePhotoPrimary(photoId, profileId);
  },

  // ── GDPR Delete Operations ──

  /** Soft delete account (deactivate + mark as deleted) */
  async softDeleteAccount(profileId, username, reason) {
    const accountId = await profileAdo.getAccountIdByProfileId(profileId);
    if (!accountId) throw new Error('Profile not found');
    return await profileAdo.softDeleteAccount(accountId, username, reason);
  },

  /** Restore a soft-deleted account */
  async restoreAccount(profileId, partnerId, username) {
    const accountId = await profileAdo.getAccountIdByProfileId(profileId);
    if (!accountId) throw new Error('Profile not found');
    return await profileAdo.restoreAccount(accountId, partnerId, username);
  },

  /** Hard delete — permanent cascading delete + Azure blob cleanup + certificate */
  async hardDeleteProfile(profileId, partnerId, username, reasonType, reasonNotes) {
    const accountId = await profileAdo.getAccountIdByProfileId(profileId);
    if (!accountId) throw new Error('Profile not found');

    const result = await profileAdo.hardDeleteProfile(accountId, partnerId, username, reasonType, reasonNotes);

    // Clean up Azure blobs after successful DB deletion
    if (result && result.photo_blob_paths) {
      const azureStorage = require('../config/azureStorage');
      const paths = result.photo_blob_paths.split('||').filter(Boolean);
      for (const blobPath of paths) {
        try {
          await azureStorage.deleteBlob(blobPath);
          const thumbPath = blobPath.replace(/\.(\w+)$/, '_thumb.$1');
          await azureStorage.deleteBlob(thumbPath);
        } catch (_) { /* best-effort Azure cleanup */ }
      }
    }

    return result;
  },

  /** Anonymize — mask PII + delete photos from Azure + certificate */
  async anonymizeProfile(profileId, partnerId, username, reasonType, reasonNotes) {
    const accountId = await profileAdo.getAccountIdByProfileId(profileId);
    if (!accountId) throw new Error('Profile not found');

    const result = await profileAdo.anonymizeProfile(accountId, partnerId, username, reasonType, reasonNotes);

    // Clean up Azure blobs after successful anonymization
    if (result && result.photo_blob_paths) {
      const azureStorage = require('../config/azureStorage');
      const paths = result.photo_blob_paths.split('||').filter(Boolean);
      for (const blobPath of paths) {
        try {
          await azureStorage.deleteBlob(blobPath);
          const thumbPath = blobPath.replace(/\.(\w+)$/, '_thumb.$1');
          await azureStorage.deleteBlob(thumbPath);
        } catch (_) { /* best-effort Azure cleanup */ }
      }
    }

    return result;
  },

  /** List soft-deleted profiles for a partner */
  async listDeletedProfiles(partnerId, page = 1, pageSize = 20) {
    return await profileAdo.listDeletedProfiles(partnerId, page, pageSize);
  },

  /** Get all deletion certificates for a partner */
  async getDeletionCertificates(partnerId) {
    return await profileAdo.getDeletionCertificates(partnerId);
  },

  /** Get a single deletion certificate */
  async getDeletionCertificate(certificateId, partnerId) {
    return await profileAdo.getDeletionCertificate(certificateId, partnerId);
  },

  // ── Lookups ──
  async getLookups(lookupType) {
    if (lookupType) {
      return await profileAdo.getLookupValues(lookupType);
    }
    return await profileAdo.getAllLookups();
  }
};

module.exports = profileDatalayer;
