const accountDatalayer = require('../datalayer/accountDatalayer');

const accountController = {
  async getAccounts(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 20;
      const search = req.body.search || '';
      const status = req.body.status !== undefined && req.body.status !== null && req.body.status !== '' ? parseInt(req.body.status) : null;

      const result = await accountDatalayer.getAccounts(partnerId, page, limit, search, status);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getAccountDetail(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const accountId = parseInt(req.body.id);

      const result = await accountDatalayer.getAccountDetail(accountId, partnerId);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async createAccount(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const data = req.body;

      const result = await accountDatalayer.createAccount(data, partnerId);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateAccount(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const accountId = parseInt(req.body.id);
      const data = req.body;

      const result = await accountDatalayer.updateAccount(accountId, data, partnerId);
      return res.json({ success: true, data: { updated: result } });
    } catch (error) {
      next(error);
    }
  },

  async toggleStatus(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { id, isActive, reason } = req.body;
      const accountId = parseInt(id);
      const username = req.user.username;

      await accountDatalayer.toggleAccountStatus(accountId, isActive, reason, partnerId, username);
      return res.json({ success: true, message: 'Account status updated' });
    } catch (error) {
      next(error);
    }
  },

  async deleteAccount(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { id, reason } = req.body;
      const accountId = parseInt(id);
      const username = req.user.username;

      await accountDatalayer.deleteAccount(accountId, partnerId, username, reason);
      return res.json({ success: true, message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = accountController;
