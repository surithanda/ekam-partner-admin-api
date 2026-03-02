const partnerAdo = require('../ado/partnerAdo');

const partnerDatalayer = {
  async getPartnerInfo(partnerId) {
    return await partnerAdo.getPartnerById(partnerId);
  },

  async getPartnerDomainLinks(partnerId) {
    return await partnerAdo.getPartnerDomainLinks(partnerId);
  },

  async getAllPartners() {
    return await partnerAdo.getAllPartners();
  },

  async getCountries() {
    return await partnerAdo.getCountries();
  },

  async getStates(countryId) {
    return await partnerAdo.getStates(countryId);
  }
};

module.exports = partnerDatalayer;
