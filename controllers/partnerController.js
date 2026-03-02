const partnerDatalayer = require('../datalayer/partnerDatalayer');
const { createAppError } = require('../config/errorCodes');

const partnerController = {
  async getPartnerInfo(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const partner = await partnerDatalayer.getPartnerInfo(partnerId);
      if (!partner) {
        throw createAppError('PA_PNGT_100_NOT_FOUND');
      }
      return res.json({ success: true, data: partner });
    } catch (error) {
      next(error);
    }
  },

  async getDomainLinks(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const links = await partnerDatalayer.getPartnerDomainLinks(partnerId);
      return res.json({ success: true, data: links });
    } catch (error) {
      next(error);
    }
  },

  async getCountries(req, res, next) {
    try {
      const countries = await partnerDatalayer.getCountries();
      return res.json({ success: true, data: countries });
    } catch (error) {
      next(error);
    }
  },

  async getStates(req, res, next) {
    try {
      const countryId = parseInt(req.body.countryId);
      const states = await partnerDatalayer.getStates(countryId);
      return res.json({ success: true, data: states });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = partnerController;
