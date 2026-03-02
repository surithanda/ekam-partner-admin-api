const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const partnerAdo = {
  async getPartnerById(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_partner_by_id(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_partner_by_id');
    return rows[0]?.[0] || null;
  },

  async getPartnerByApiClient(apiClientId) {
    const [rows] = await pool.query('CALL partner_admin_get_partner_by_api_client(?)', [apiClientId]);
    checkSpResult(rows, 'partner_admin_get_partner_by_api_client');
    return rows[0]?.[0] || null;
  },

  async getAllPartners() {
    const [rows] = await pool.query('CALL partner_admin_get_all_partners()');
    checkSpResult(rows, 'partner_admin_get_all_partners');
    return rows[0];
  },

  async getPartnerDomainLinks(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_partner_domain_links(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_partner_domain_links');
    return rows[0]?.[0] || null;
  },

  async getCountries() {
    const [rows] = await pool.query('CALL partner_admin_get_countries()');
    return rows[0];
  },

  async getStates(countryId) {
    const [rows] = await pool.query('CALL partner_admin_get_states(?)', [countryId]);
    return rows[0];
  }
};

module.exports = partnerAdo;
