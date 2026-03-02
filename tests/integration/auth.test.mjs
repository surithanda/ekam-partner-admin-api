import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { partnerDomains, brandConfigFormatted } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

const authDatalayer = require('../../datalayer/authDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Auth API Integration', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for missing fields', async () => {
      const res = await request.post('/api/auth/login').send({ username: 'admin' });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should return 401 for invalid credentials', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(authDatalayer, 'login').rejects(new AppError('PA_AULG_202_INVALID_CREDENTIALS', 'Invalid username or password', 401));
      const res = await request.post('/api/auth/login').send({ username: 'bad', password: 'bad', apiKey: 'key' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'PA_AULG_202_INVALID_CREDENTIALS');
    });

    it('should return 200 with token on valid login', async () => {
      sandbox.stub(authDatalayer, 'login').resolves({
        success: true, token: 'jwt-token',
        user: { id: 1, username: 'partneradmin', role: 'partner-admin' },
        brandConfig: brandConfigFormatted
      });
      const res = await request.post('/api/auth/login').send({ username: 'partneradmin', password: 'Partner@123', apiKey: 'test-key' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.token, 'jwt-token');
      assert.ok(res.body.brandConfig);
    });
  });

  describe('POST /api/auth/domains', () => {
    it('should return domains list', async () => {
      sandbox.stub(authDatalayer, 'getPartnerDomains').resolves(partnerDomains);
      const res = await request.post('/api/auth/domains').send({});
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, partnerDomains);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should return 401 without token', async () => {
      const res = await request.post('/api/auth/verify').send({});
      assert.strictEqual(res.status, 401);
    });

    it('should return user for valid token', async () => {
      const token = generateToken();
      const res = await request.post('/api/auth/verify').set('Authorization', `Bearer ${token}`).send({});
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.user.username, 'partneradmin');
    });
  });
});
