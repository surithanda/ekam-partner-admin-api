const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const accountAdo = {
  // ── List Accounts (new SP) ──

  async getAccountsByPartner(partnerId, page = 1, limit = 20, search = '', status = null) {
    const [results] = await pool.query(
      'CALL partner_admin_get_accounts_by_partner(?, ?, ?, ?, ?)',
      [partnerId, page, limit, search || null, status]
    );
    checkSpResult(results, 'partner_admin_get_accounts_by_partner');
    const total = results[0]?.[0]?.total || 0;
    const accounts = results[1] || [];
    return { accounts, total, page, limit };
  },

  // ── Get Account by ID (new SP) ──

  async getAccountById(accountId) {
    const [results] = await pool.query(
      'CALL partner_admin_get_account_by_id(?)',
      [accountId]
    );
    checkSpResult(results, 'partner_admin_get_account_by_id');
    const account = results[0]?.[0] || null;
    const profiles = results[1] || [];
    return { account, profiles };
  },

  // ── Create Account + Login (existing eb SP) ──

  async createAccountWithLogin(data) {
    const [rows] = await pool.query(
      'CALL eb_account_login_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.email,
        data.password,
        data.first_name,
        data.middle_name || null,
        data.last_name,
        data.birth_date,
        data.gender,
        data.primary_phone,
        data.primary_phone_country || '1',
        data.primary_phone_type || 1,
        data.secondary_phone || null,
        data.secondary_phone_country || null,
        data.secondary_phone_type || null,
        data.address_line1 || '',
        data.address_line2 || null,
        data.city || '',
        data.state || '',
        data.zip || '',
        data.country || '',
        data.photo || null,
        data.secret_question || null,
        data.secret_answer || null,
        data.partner_id
      ]
    );
    checkSpResult(rows, 'eb_account_login_create');
    return {
      account_id: rows[0]?.[0]?.account_id,
      account_code: rows[0]?.[0]?.account_code,
      email: rows[0]?.[0]?.email
    };
  },

  // ── Update Account (existing eb SP) ──

  async updateAccount(data) {
    const [rows] = await pool.query(
      'CALL eb_account_update(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.account_code,
        data.email,
        data.first_name || null,
        data.middle_name || null,
        data.last_name || null,
        data.primary_phone || null,
        data.primary_phone_country || null,
        data.primary_phone_type || null,
        data.birth_date || null,
        data.gender || null,
        data.address_line1 || null,
        data.address_line2 || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.country || null,
        data.photo || null,
        data.secondary_phone || null,
        data.secondary_phone_country || null,
        data.secondary_phone_type || null
      ]
    );
    checkSpResult(rows, 'eb_account_update');
    return (rows[0]?.[0]?.affected_rows || 0) > 0;
  },

  // ── Toggle Account Status (existing eb SP) ──

  async toggleAccountStatus(accountId, isActive, reason, modifiedUser) {
    const [rows] = await pool.query(
      'CALL eb_enable_disable_account(?, ?, ?, ?)',
      [accountId, isActive, reason || null, modifiedUser]
    );
    checkSpResult(rows, 'eb_enable_disable_account');
    return rows[0]?.[0]?.account_id;
  },

  // ── Soft Delete Account (new SP) ──

  async softDeleteAccount(accountId, deletedUser, reason) {
    const [rows] = await pool.query(
      'CALL partner_admin_soft_delete_account(?, ?, ?)',
      [accountId, deletedUser, reason || null]
    );
    checkSpResult(rows, 'partner_admin_soft_delete_account');
    return rows[0]?.[0]?.account_id;
  }
};

module.exports = accountAdo;
