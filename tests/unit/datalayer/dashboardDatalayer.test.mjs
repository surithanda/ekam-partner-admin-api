import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { profileMetrics, paymentMetrics, activityMetrics, viewsMetrics, accountMetrics, recentActivities } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const dashboardAdo = require('../../../ado/dashboardAdo');
const dashboardDatalayer = require('../../../datalayer/dashboardDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('dashboardDatalayer', () => {
  describe('getDashboardMetrics', () => {
    it('should aggregate all metrics into structured response', async () => {
      sandbox.stub(dashboardAdo, 'getProfileMetrics').resolves(profileMetrics);
      sandbox.stub(dashboardAdo, 'getPaymentMetrics').resolves(paymentMetrics);
      sandbox.stub(dashboardAdo, 'getActivityMetrics').resolves(activityMetrics);
      sandbox.stub(dashboardAdo, 'getProfileViewsMetrics').resolves(viewsMetrics);
      sandbox.stub(dashboardAdo, 'getAccountMetrics').resolves(accountMetrics);

      const result = await dashboardDatalayer.getDashboardMetrics(1);
      assert.strictEqual(result.profiles.total, 150);
      assert.strictEqual(result.profiles.active, 120);
      assert.strictEqual(result.profiles.genderBreakdown.length, 2);
      assert.strictEqual(result.payments.total, 50);
      assert.strictEqual(result.activity.last24h, 20);
      assert.strictEqual(result.views.total, 1000);
      assert.strictEqual(result.accounts.newLast30d, 15);
    });

    it('should handle missing/null metrics gracefully', async () => {
      sandbox.stub(dashboardAdo, 'getProfileMetrics').resolves({});
      sandbox.stub(dashboardAdo, 'getPaymentMetrics').resolves({});
      sandbox.stub(dashboardAdo, 'getActivityMetrics').resolves({});
      sandbox.stub(dashboardAdo, 'getProfileViewsMetrics').resolves({});
      sandbox.stub(dashboardAdo, 'getAccountMetrics').resolves({});

      const result = await dashboardDatalayer.getDashboardMetrics(1);
      assert.strictEqual(result.profiles.total, 0);
      assert.strictEqual(result.payments.totalAmount, 0);
      assert.strictEqual(result.views.total, 0);
      assert.strictEqual(result.accounts.total, 0);
    });
  });

  describe('getRecentActivities', () => {
    it('should pass through to ADO', async () => {
      sandbox.stub(dashboardAdo, 'getRecentActivities').resolves(recentActivities);
      const result = await dashboardDatalayer.getRecentActivities(1, 10);
      assert.deepStrictEqual(result, recentActivities);
      assert.ok(dashboardAdo.getRecentActivities.calledWith(1, 10));
    });
  });
});
