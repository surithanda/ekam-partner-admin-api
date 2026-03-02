import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { auditLogsList } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

const auditDatalayer = require('../../datalayer/auditDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Audit API Integration', () => {
  describe('POST /api/audit/list', () => {
    it('should return audit logs for partner-admin', async () => {
      sandbox.stub(auditDatalayer, 'getAuditLogs').resolves(auditLogsList);
      const res = await request.post('/api/audit/list').set('Authorization', `Bearer ${partnerAdminToken}`).send({ page: 1, limit: 20 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.logs.length, 1);
    });

    it('should pass filter params', async () => {
      sandbox.stub(auditDatalayer, 'getAuditLogs').resolves(auditLogsList);
      const res = await request.post('/api/audit/list').set('Authorization', `Bearer ${partnerAdminToken}`).send({ action: 'auth.login', username: 'partneradmin' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/audit/list').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 403 for support-admin', async () => {
      const res = await request.post('/api/audit/list').set('Authorization', `Bearer ${supportAdminToken}`).send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/audit/list').send({});
      assert.strictEqual(res.status, 401);
    });
  });
});
