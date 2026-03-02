import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { recentActivities } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

const dashboardDatalayer = require('../../datalayer/dashboardDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Dashboard API Integration', () => {
  describe('POST /api/dashboard/metrics', () => {
    it('should return metrics for partner-admin', async () => {
      const metrics = { profiles: { total: 10 }, payments: {}, activity: {}, views: {}, accounts: {} };
      sandbox.stub(dashboardDatalayer, 'getDashboardMetrics').resolves(metrics);
      const res = await request.post('/api/dashboard/metrics').set('Authorization', `Bearer ${partnerAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.profiles.total, 10);
    });

    it('should return metrics for account-admin', async () => {
      sandbox.stub(dashboardDatalayer, 'getDashboardMetrics').resolves({ profiles: {} });
      const res = await request.post('/api/dashboard/metrics').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
    });

    it('should return 403 for support-admin', async () => {
      const res = await request.post('/api/dashboard/metrics').set('Authorization', `Bearer ${supportAdminToken}`).send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/dashboard/metrics').send({});
      assert.strictEqual(res.status, 401);
    });
  });

  describe('POST /api/dashboard/activities', () => {
    it('should return recent activities', async () => {
      sandbox.stub(dashboardDatalayer, 'getRecentActivities').resolves(recentActivities);
      const res = await request.post('/api/dashboard/activities').set('Authorization', `Bearer ${partnerAdminToken}`).send({ limit: 5 });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, recentActivities);
    });
  });
});
