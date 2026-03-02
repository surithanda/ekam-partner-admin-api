const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const auditAdo = {
  async getAuditLogs(partnerId, page = 1, limit = 20, action = null, username = null, entityType = null, dateFrom = null, dateTo = null) {
    const [results] = await pool.query(
      'CALL partner_admin_get_audit_logs(?, ?, ?, ?, ?, ?, ?, ?)',
      [partnerId, page, limit, action || null, username || null, entityType || null, dateFrom || null, dateTo || null]
    );
    checkSpResult(results, 'partner_admin_get_audit_logs');
    const total = results[0]?.[0]?.total || 0;
    const logs = results[1] || [];
    return { logs, total, page, limit };
  }
};

module.exports = auditAdo;
