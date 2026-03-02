const backgroundCheckDatalayer = require('../datalayer/backgroundCheckDatalayer');
const { createAppError } = require('../config/errorCodes');

const backgroundCheckController = {
  async getProfileForCheck(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const profileId = parseInt(req.body.profileId);

      const profile = await backgroundCheckDatalayer.getProfileForCheck(profileId, partnerId);
      return res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  },

  async initiateCheck(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId, checkType, notes } = req.body;

      if (!profileId || !checkType) {
        throw createAppError('PA_BCIN_001_MISSING_FIELDS');
      }

      const result = await backgroundCheckDatalayer.initiateBackgroundCheck(
        profileId, checkType, req.user.username, notes, partnerId
      );

      return res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Phase 7: Background Check Tracking ──

  async createCheck(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId, checkType, notes, externalRefId } = req.body;

      if (!profileId || !checkType) {
        throw createAppError('PA_BCIN_001_MISSING_FIELDS');
      }

      const result = await backgroundCheckDatalayer.createCheck(
        partnerId, parseInt(profileId), checkType, notes, externalRefId, req.user.username
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateCheckStatus(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { checkId, status, resultSummary, notes } = req.body;

      if (!checkId || !status) {
        throw createAppError('PA_BCIN_001_MISSING_FIELDS');
      }

      const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }

      const result = await backgroundCheckDatalayer.updateCheckStatus(
        parseInt(checkId), partnerId, status, resultSummary, notes, req.user.username
      );

      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getChecksByProfile(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId } = req.body;

      if (!profileId) {
        throw createAppError('PA_BCIN_001_MISSING_FIELDS');
      }

      const data = await backgroundCheckDatalayer.getChecksByProfile(parseInt(profileId), partnerId);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getChecksList(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { status, checkType, dateFrom, dateTo, search, page, pageSize } = req.body;

      const result = await backgroundCheckDatalayer.getChecksByPartner(partnerId, {
        status, checkType, dateFrom, dateTo, search, page, pageSize
      });

      return res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      next(error);
    }
  },

  async getCheckDetail(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { checkId } = req.body;

      if (!checkId) {
        throw createAppError('PA_BCIN_001_MISSING_FIELDS');
      }

      const data = await backgroundCheckDatalayer.getCheckById(parseInt(checkId), partnerId);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = backgroundCheckController;
