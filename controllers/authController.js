const authDatalayer = require('../datalayer/authDatalayer');
const { createAppError } = require('../config/errorCodes');

const authController = {
  async login(req, res, next) {
    try {
      const { username, password, apiKey } = req.body;

      if (!username || !password || !apiKey) {
        throw createAppError('PA_AULG_001_MISSING_CREDENTIALS');
      }

      const result = await authDatalayer.login(username, password, apiKey);
      return res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getDomains(req, res, next) {
    try {
      const domains = await authDatalayer.getPartnerDomains();
      return res.json({ success: true, data: domains });
    } catch (error) {
      next(error);
    }
  },

  async verifyToken(req, res, next) {
    try {
      return res.json({ success: true, user: req.user });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = authController;
