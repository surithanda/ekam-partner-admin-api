import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { profileMetrics, paymentMetrics, activityMetrics, viewsMetrics, accountMetrics, recentActivities } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const dashboardAdo = require('../../../ado/dashboardAdo');

afterEach(() => pool.query.reset());

describe('dashboardAdo', () => {
  describe('getProfileMetrics', () => {
    it('should return profile metrics with gender breakdown', async () => {
      pool.query.resolves([[
        [{ total_profiles: 150, active_profiles: 120, inactive_profiles: 30 }],
        profileMetrics.genderBreakdown
      ]]);
      const result = await dashboardAdo.getProfileMetrics(1);
      assert.strictEqual(result.total_profiles, 150);
      assert.deepStrictEqual(result.genderBreakdown, profileMetrics.genderBreakdown);
    });
  });

  describe('getPaymentMetrics', () => {
    it('should return payment metrics', async () => {
      pool.query.resolves([[[paymentMetrics]]]);
      const result = await dashboardAdo.getPaymentMetrics(1);
      assert.deepStrictEqual(result, paymentMetrics);
    });
  });

  describe('getActivityMetrics', () => {
    it('should return activity metrics', async () => {
      pool.query.resolves([[[activityMetrics]]]);
      const result = await dashboardAdo.getActivityMetrics(1);
      assert.deepStrictEqual(result, activityMetrics);
    });
  });

  describe('getRecentActivities', () => {
    it('should return recent activities with default limit', async () => {
      pool.query.resolves([[recentActivities]]);
      const result = await dashboardAdo.getRecentActivities(1);
      assert.deepStrictEqual(result, recentActivities);
      assert.ok(pool.query.calledWith('CALL partner_admin_get_recent_activities(?, ?)', [1, 20]));
    });

    it('should respect custom limit', async () => {
      pool.query.resolves([[recentActivities]]);
      await dashboardAdo.getRecentActivities(1, 5);
      assert.ok(pool.query.calledWith('CALL partner_admin_get_recent_activities(?, ?)', [1, 5]));
    });
  });

  describe('getProfileViewsMetrics', () => {
    it('should return views metrics', async () => {
      pool.query.resolves([[[viewsMetrics]]]);
      const result = await dashboardAdo.getProfileViewsMetrics(1);
      assert.deepStrictEqual(result, viewsMetrics);
    });
  });

  describe('getAccountMetrics', () => {
    it('should return account metrics', async () => {
      pool.query.resolves([[[accountMetrics]]]);
      const result = await dashboardAdo.getAccountMetrics(1);
      assert.deepStrictEqual(result, accountMetrics);
    });
  });
});
