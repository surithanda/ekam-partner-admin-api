const auditDatalayer = require('../datalayer/auditDatalayer');

const auditController = {
  async getAuditLogs(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 20;
      const filters = {
        action: req.body.action || null,
        username: req.body.username || null,
        entityType: req.body.entityType || null,
        dateFrom: req.body.dateFrom || null,
        dateTo: req.body.dateTo || null
      };

      const result = await auditDatalayer.getAuditLogs(partnerId, page, limit, filters);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = auditController;
