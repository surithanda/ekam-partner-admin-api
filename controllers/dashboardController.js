const dashboardDatalayer = require('../datalayer/dashboardDatalayer');
const { createAppError } = require('../config/errorCodes');

const dashboardController = {
  async getMetrics(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      if (!partnerId) {
        throw createAppError('PA_DAGT_001_MISSING_PARTNER_ID');
      }

      const metrics = await dashboardDatalayer.getDashboardMetrics(partnerId);
      return res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivities(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const limit = parseInt(req.body.limit) || 20;

      const activities = await dashboardDatalayer.getRecentActivities(partnerId, limit);
      return res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;
