const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const adminUserAdo = {
  async listUsers(partnerId, page = 1, limit = 20, search = '') {
    const [results] = await pool.query(
      'CALL partner_admin_list_users(?, ?, ?, ?)',
      [partnerId, page, limit, search || null]
    );
    checkSpResult(results, 'partner_admin_list_users');
    const total = results[0]?.[0]?.total || 0;
    const users = results[1] || [];
    return { users, total, page, limit };
  },

  async createUser(partnerId, username, passwordHash, email, firstName, lastName, role) {
    const [rows] = await pool.query(
      'CALL partner_admin_create_user(?, ?, ?, ?, ?, ?, ?)',
      [partnerId, username, passwordHash, email, firstName, lastName, role]
    );
    checkSpResult(rows, 'partner_admin_create_user');
    return rows[0]?.[0]?.insertId;
  },

  async updateUser(partnerAdminId, partnerId, email, firstName, lastName, role) {
    const [rows] = await pool.query(
      'CALL partner_admin_update_user(?, ?, ?, ?, ?, ?)',
      [partnerAdminId, partnerId, email, firstName, lastName, role]
    );
    checkSpResult(rows, 'partner_admin_update_user');
    return (rows[0]?.[0]?.affected || 0) > 0;
  },

  async toggleUserStatus(partnerAdminId, partnerId, isActive) {
    const [rows] = await pool.query(
      'CALL partner_admin_toggle_user_status(?, ?, ?)',
      [partnerAdminId, partnerId, isActive]
    );
    checkSpResult(rows, 'partner_admin_toggle_user_status');
    return (rows[0]?.[0]?.affected || 0) > 0;
  },

  async getUserById(partnerAdminId, partnerId) {
    const [rows] = await pool.query(
      'CALL partner_admin_get_partner_user_by_id(?, ?)',
      [partnerAdminId, partnerId]
    );
    checkSpResult(rows, 'partner_admin_get_partner_user_by_id');
    return rows[0]?.[0] || null;
  },

  async resetPassword(partnerAdminId, partnerId, passwordHash) {
    const [rows] = await pool.query(
      'CALL partner_admin_reset_user_password(?, ?, ?)',
      [partnerAdminId, partnerId, passwordHash]
    );
    checkSpResult(rows, 'partner_admin_reset_user_password');
    return (rows[0]?.[0]?.affected || 0) > 0;
  }
};

module.exports = adminUserAdo;
