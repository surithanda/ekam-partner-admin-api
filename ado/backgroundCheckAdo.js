const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const backgroundCheckAdo = {
  async getProfileForCheck(profileId) {
    const [rows] = await pool.query('CALL partner_admin_get_profile_for_check(?)', [profileId]);
    checkSpResult(rows, 'partner_admin_get_profile_for_check');
    return rows[0]?.[0] || null;
  },

  async logBackgroundCheckRequest(profileId, checkType, requestedBy, notes) {
    const [rows] = await pool.query('CALL partner_admin_log_background_check_request(?, ?, ?, ?)',
      [profileId, checkType, requestedBy, notes || null]);
    checkSpResult(rows, 'partner_admin_log_background_check_request');
  },

  // ── Phase 7: Background Check Tracking ──

  async createBackgroundCheck(partnerId, profileId, checkType, notes, externalRefId, requestedBy) {
    const [rows] = await pool.query(
      'CALL partner_admin_create_background_check(?, ?, ?, ?, ?, ?)',
      [partnerId, profileId, checkType, notes || null, externalRefId || null, requestedBy]
    );
    checkSpResult(rows, 'partner_admin_create_background_check');
    return rows[0]?.[0] || null;
  },

  async updateBackgroundCheckStatus(checkId, partnerId, newStatus, resultSummary, notes, updatedBy) {
    const [rows] = await pool.query(
      'CALL partner_admin_update_background_check_status(?, ?, ?, ?, ?, ?)',
      [checkId, partnerId, newStatus, resultSummary || null, notes || null, updatedBy]
    );
    checkSpResult(rows, 'partner_admin_update_background_check_status');
    return rows[0]?.[0] || null;
  },

  async getBackgroundChecksByProfile(profileId, partnerId) {
    const [rows] = await pool.query(
      'CALL partner_admin_get_background_checks_by_profile(?, ?)',
      [profileId, partnerId]
    );
    return rows[0] || [];
  },

  async getBackgroundChecksByPartner(partnerId, status, checkType, dateFrom, dateTo, search, page, pageSize) {
    const [rows] = await pool.query(
      'CALL partner_admin_get_background_checks_by_partner(?, ?, ?, ?, ?, ?, ?, ?)',
      [partnerId, status || null, checkType || null, dateFrom || null, dateTo || null, search || null, page || 1, pageSize || 20]
    );
    const total = rows[0]?.[0]?.total || 0;
    const data = rows[1] || [];
    return { total, data };
  },

  async getBackgroundCheckById(checkId, partnerId) {
    const [rows] = await pool.query(
      'CALL partner_admin_get_background_check_by_id(?, ?)',
      [checkId, partnerId]
    );
    return rows[0]?.[0] || null;
  }
};

module.exports = backgroundCheckAdo;
