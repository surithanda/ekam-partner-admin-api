import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { auditLogEntry } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const auditAdo = require('../../../ado/auditAdo');

afterEach(() => pool.query.reset());

describe('auditAdo', () => {
  describe('getAuditLogs', () => {
    it('should return logs with total count', async () => {
      pool.query.resolves([[[{ total: 1 }], [auditLogEntry]]]);
      const result = await auditAdo.getAuditLogs(1, 1, 20);
      assert.strictEqual(result.total, 1);
      assert.deepStrictEqual(result.logs, [auditLogEntry]);
    });

    it('should pass all filter params', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      await auditAdo.getAuditLogs(1, 1, 10, 'auth.login', 'partneradmin', 'auth', '2026-01-01', '2026-01-31');
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_get_audit_logs(?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, 10, 'auth.login', 'partneradmin', 'auth', '2026-01-01', '2026-01-31']
      ));
    });

    it('should default null filters', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      await auditAdo.getAuditLogs(1);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_get_audit_logs(?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 1, 20, null, null, null, null, null]
      ));
    });

    it('should return empty when no logs', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      const result = await auditAdo.getAuditLogs(1);
      assert.strictEqual(result.total, 0);
      assert.deepStrictEqual(result.logs, []);
    });
  });
});
