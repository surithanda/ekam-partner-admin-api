const backgroundCheckAdo = require('../ado/backgroundCheckAdo');
const profileAdo = require('../ado/profileAdo');
const { createAppError } = require('../config/errorCodes');

const backgroundCheckDatalayer = {
  async getProfileForCheck(profileId, partnerId) {
    // Verify ownership
    const profile = await profileAdo.getProfileById(profileId);
    if (!profile) throw createAppError('PA_BCGT_100_NOT_FOUND');
    if (profile.registered_partner_id !== partnerId) {
      throw createAppError('PA_BCGT_300_ACCESS_DENIED');
    }
    return await backgroundCheckAdo.getProfileForCheck(profileId);
  },

  async initiateBackgroundCheck(profileId, checkType, requestedBy, notes, partnerId) {
    // Verify ownership
    const profile = await profileAdo.getProfileById(profileId);
    if (!profile) throw createAppError('PA_BCIN_100_NOT_FOUND');
    if (profile.registered_partner_id !== partnerId) {
      throw createAppError('PA_BCIN_300_ACCESS_DENIED');
    }

    await backgroundCheckAdo.logBackgroundCheckRequest(profileId, checkType, requestedBy, notes);

    return {
      success: true,
      message: `Background check (${checkType}) initiated for profile ${profileId}`,
      profileId,
      checkType,
      status: 'initiated',
      requestedAt: new Date().toISOString()
    };
  },

  // ── Phase 7: Background Check Tracking ──

  async createCheck(partnerId, profileId, checkType, notes, externalRefId, requestedBy) {
    const result = await backgroundCheckAdo.createBackgroundCheck(
      partnerId, profileId, checkType, notes, externalRefId, requestedBy
    );
    return result;
  },

  async updateCheckStatus(checkId, partnerId, newStatus, resultSummary, notes, updatedBy) {
    const result = await backgroundCheckAdo.updateBackgroundCheckStatus(
      checkId, partnerId, newStatus, resultSummary, notes, updatedBy
    );
    return result;
  },

  async getChecksByProfile(profileId, partnerId) {
    return await backgroundCheckAdo.getBackgroundChecksByProfile(profileId, partnerId);
  },

  async getChecksByPartner(partnerId, filters) {
    const { status, checkType, dateFrom, dateTo, search, page, pageSize } = filters || {};
    return await backgroundCheckAdo.getBackgroundChecksByPartner(
      partnerId, status, checkType, dateFrom, dateTo, search, page, pageSize
    );
  },

  async getCheckById(checkId, partnerId) {
    const check = await backgroundCheckAdo.getBackgroundCheckById(checkId, partnerId);
    if (!check) throw createAppError('PA_BCUP_100_NOT_FOUND');
    return check;
  }
};

module.exports = backgroundCheckDatalayer;
