const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const dashboardAdo = {
  async getProfileMetrics(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_profile_metrics(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_profile_metrics');
    const totals = rows[0]?.[0] || {};
    const genderBreakdown = rows[1] || [];
    return { ...totals, genderBreakdown };
  },

  async getPaymentMetrics(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_payment_metrics(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_payment_metrics');
    return rows[0]?.[0];
  },

  async getActivityMetrics(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_activity_metrics(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_activity_metrics');
    return rows[0]?.[0];
  },

  async getRecentActivities(partnerId, limit = 20) {
    const [rows] = await pool.query('CALL partner_admin_get_recent_activities(?, ?)', [partnerId, limit]);
    checkSpResult(rows, 'partner_admin_get_recent_activities');
    return rows[0];
  },

  async getProfileViewsMetrics(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_profile_views_metrics(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_profile_views_metrics');
    return rows[0]?.[0];
  },

  async getAccountMetrics(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_account_metrics(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_account_metrics');
    return rows[0]?.[0];
  }
};

module.exports = dashboardAdo;
