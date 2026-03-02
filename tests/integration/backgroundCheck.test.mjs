import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { profileForCheck } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

const backgroundCheckDatalayer = require('../../datalayer/backgroundCheckDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Background Check API Integration', () => {
  describe('POST /api/background-check/profile', () => {
    it('should return profile for check for partner-admin', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').resolves(profileForCheck);
      const res = await request.post('/api/background-check/profile').set('Authorization', `Bearer ${partnerAdminToken}`).send({ profileId: 101 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.first_name, 'John');
    });

    it('should return profile for check for support-admin', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').resolves(profileForCheck);
      const res = await request.post('/api/background-check/profile').set('Authorization', `Bearer ${supportAdminToken}`).send({ profileId: 101 });
      assert.strictEqual(res.status, 200);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/background-check/profile').set('Authorization', `Bearer ${accountAdminToken}`).send({ profileId: 101 });
      assert.strictEqual(res.status, 403);
    });

    it('should return 404 when not found', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').rejects(new AppError('PA_BCGT_100_NOT_FOUND', 'Not found', 404));
      const res = await request.post('/api/background-check/profile').set('Authorization', `Bearer ${partnerAdminToken}`).send({ profileId: 999 });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'PA_BCGT_100_NOT_FOUND');
    });
  });

  describe('POST /api/background-check/initiate', () => {
    it('should initiate check successfully', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'initiateBackgroundCheck').resolves({
        success: true, message: 'Check initiated', profileId: 101, checkType: 'identity', status: 'initiated'
      });
      const res = await request.post('/api/background-check/initiate').set('Authorization', `Bearer ${partnerAdminToken}`).send({ profileId: 101, checkType: 'identity', notes: 'test' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request.post('/api/background-check/initiate').set('Authorization', `Bearer ${partnerAdminToken}`).send({ profileId: 101 });
      assert.strictEqual(res.status, 400);
    });

    it('should return 404 when datalayer fails', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(backgroundCheckDatalayer, 'initiateBackgroundCheck').rejects(new AppError('PA_BCIN_100_NOT_FOUND', 'Not found', 404));
      const res = await request.post('/api/background-check/initiate').set('Authorization', `Bearer ${partnerAdminToken}`).send({ profileId: 999, checkType: 'identity' });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'PA_BCIN_100_NOT_FOUND');
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/background-check/initiate').set('Authorization', `Bearer ${accountAdminToken}`).send({ profileId: 101, checkType: 'identity' });
      assert.strictEqual(res.status, 403);
    });
  });
});
