const auditAdo = require('../ado/auditAdo');

const auditDatalayer = {
  async getAuditLogs(partnerId, page, limit, filters = {}) {
    return await auditAdo.getAuditLogs(
      partnerId, page, limit,
      filters.action, filters.username, filters.entityType,
      filters.dateFrom, filters.dateTo
    );
  }
};

module.exports = auditDatalayer;
