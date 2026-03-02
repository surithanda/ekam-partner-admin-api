const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const authAdo = {
  async getApiClientByKey(apiKey) {
    const [rows] = await pool.query('CALL partner_admin_get_api_client_by_key(?)', [apiKey]);
    checkSpResult(rows, 'partner_admin_get_api_client_by_key');
    return rows[0]?.[0] || null;
  },

  async getPartnerDomains() {
    const [rows] = await pool.query('CALL partner_admin_get_partner_domains()');
    return rows[0];
  },

  async getPartnerUser(username, partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_partner_user(?, ?)', [username, partnerId]);
    checkSpResult(rows, 'partner_admin_get_partner_user');
    return rows[0]?.[0] || null;
  },

  async updateLastLogin(partnerAdminId) {
    const [rows] = await pool.query('CALL partner_admin_update_last_login(?)', [partnerAdminId]);
    checkSpResult(rows, 'partner_admin_update_last_login');
  }
};

module.exports = authAdo;
