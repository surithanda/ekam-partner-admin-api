import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { auditLogsList } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const auditAdo = require('../../../ado/auditAdo');
const auditDatalayer = require('../../../datalayer/auditDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('auditDatalayer', () => {
  it('should pass filters to ADO', async () => {
    sandbox.stub(auditAdo, 'getAuditLogs').resolves(auditLogsList);
    const filters = { action: 'auth.login', username: 'partneradmin', entityType: 'auth', dateFrom: '2026-01-01', dateTo: '2026-01-31' };
    const result = await auditDatalayer.getAuditLogs(1, 1, 20, filters);
    assert.deepStrictEqual(result, auditLogsList);
    assert.ok(auditAdo.getAuditLogs.calledWith(1, 1, 20, 'auth.login', 'partneradmin', 'auth', '2026-01-01', '2026-01-31'));
  });

  it('should handle empty filters', async () => {
    sandbox.stub(auditAdo, 'getAuditLogs').resolves({ logs: [], total: 0, page: 1, limit: 20 });
    await auditDatalayer.getAuditLogs(1, 1, 20, {});
    assert.ok(auditAdo.getAuditLogs.calledWith(1, 1, 20, undefined, undefined, undefined, undefined, undefined));
  });
});
