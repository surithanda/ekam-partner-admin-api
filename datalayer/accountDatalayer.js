const accountAdo = require('../ado/accountAdo');
const { createAppError } = require('../config/errorCodes');

const accountDatalayer = {
  async getAccounts(partnerId, page, limit, search, status) {
    return await accountAdo.getAccountsByPartner(partnerId, page, limit, search, status);
  },

  async getAccountDetail(accountId, partnerId) {
    const { account, profiles } = await accountAdo.getAccountById(accountId);
    if (!account) throw createAppError('PA_ACGT_100_NOT_FOUND');

    // Verify account belongs to this partner
    if (account.registered_partner_id !== partnerId) {
      throw createAppError('PA_ACGT_300_ACCESS_DENIED');
    }

    return { account, profiles };
  },

  async createAccount(data, partnerId) {
    data.partner_id = partnerId;
    return await accountAdo.createAccountWithLogin(data);
  },

  async updateAccount(accountId, data, partnerId) {
    // Verify ownership first
    const { account } = await accountAdo.getAccountById(accountId);
    if (!account) throw createAppError('PA_ACGT_100_NOT_FOUND');
    if (account.registered_partner_id !== partnerId) {
      throw createAppError('PA_ACGT_300_ACCESS_DENIED');
    }

    // Pass account_code and email for the eb_account_update SP (identifies by these)
    data.account_code = account.account_code;
    data.email = data.email || account.email;
    return await accountAdo.updateAccount(data);
  },

  async toggleAccountStatus(accountId, isActive, reason, partnerId, username) {
    // Verify ownership first
    const { account } = await accountAdo.getAccountById(accountId);
    if (!account) throw createAppError('PA_ACGT_100_NOT_FOUND');
    if (account.registered_partner_id !== partnerId) {
      throw createAppError('PA_ACGT_300_ACCESS_DENIED');
    }

    return await accountAdo.toggleAccountStatus(accountId, isActive, reason, username);
  },

  async deleteAccount(accountId, partnerId, username, reason) {
    // Verify ownership first
    const { account } = await accountAdo.getAccountById(accountId);
    if (!account) throw createAppError('PA_ACGT_100_NOT_FOUND');
    if (account.registered_partner_id !== partnerId) {
      throw createAppError('PA_ACGT_300_ACCESS_DENIED');
    }

    return await accountAdo.softDeleteAccount(accountId, username, reason);
  }
};

module.exports = accountDatalayer;
