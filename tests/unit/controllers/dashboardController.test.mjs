import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { recentActivities } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const dashboardDatalayer = require('../../../datalayer/dashboardDatalayer');
const dashboardController = require('../../../controllers/dashboardController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('dashboardController', () => {
  describe('getMetrics', () => {
    it('should return metrics for valid partner', async () => {
      const metrics = { profiles: { total: 10 } };
      sandbox.stub(dashboardDatalayer, 'getDashboardMetrics').resolves(metrics);
      const res = mockRes();
      const next = mockNext();
      await dashboardController.getMetrics(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: metrics });
    });

    it('should call next with error if no partnerId in token', async () => {
      const req = mockReq({ user: { ...mockReq().user, partnerId: null } });
      const res = mockRes();
      const next = mockNext();
      await dashboardController.getMetrics(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_DAGT_001_MISSING_PARTNER_ID');
    });

    it('should call next on error', async () => {
      sandbox.stub(dashboardDatalayer, 'getDashboardMetrics').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await dashboardController.getMetrics(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getRecentActivities', () => {
    it('should return activities with default limit', async () => {
      sandbox.stub(dashboardDatalayer, 'getRecentActivities').resolves(recentActivities);
      const res = mockRes();
      const next = mockNext();
      await dashboardController.getRecentActivities(mockReq({ body: {} }), res, next);
      assert.ok(dashboardDatalayer.getRecentActivities.calledWith(1, 20));
    });

    it('should respect custom limit', async () => {
      sandbox.stub(dashboardDatalayer, 'getRecentActivities').resolves([]);
      const res = mockRes();
      const next = mockNext();
      await dashboardController.getRecentActivities(mockReq({ body: { limit: '5' } }), res, next);
      assert.ok(dashboardDatalayer.getRecentActivities.calledWith(1, 5));
    });
  });
});
