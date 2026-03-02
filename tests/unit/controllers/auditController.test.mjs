import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { auditLogsList } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const auditDatalayer = require('../../../datalayer/auditDatalayer');
const auditController = require('../../../controllers/auditController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('auditController', () => {
  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      sandbox.stub(auditDatalayer, 'getAuditLogs').resolves(auditLogsList);
      const res = mockRes();
      const next = mockNext();
      await auditController.getAuditLogs(mockReq({ body: { page: '1', limit: '20' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: auditLogsList });
    });

    it('should pass filter params', async () => {
      sandbox.stub(auditDatalayer, 'getAuditLogs').resolves(auditLogsList);
      const res = mockRes();
      const next = mockNext();
      await auditController.getAuditLogs(mockReq({
        body: { action: 'auth.login', username: 'partneradmin', entityType: 'auth', dateFrom: '2026-01-01', dateTo: '2026-01-31' }
      }), res, next);
      const callArgs = auditDatalayer.getAuditLogs.firstCall.args;
      assert.strictEqual(callArgs[0], 1); // partnerId
    });

    it('should call next on error', async () => {
      sandbox.stub(auditDatalayer, 'getAuditLogs').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await auditController.getAuditLogs(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
