import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { partnerUser, accountAdminUser } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

// Stub audit middleware
require.cache[require.resolve('../../middleware/audit')] = {
  id: require.resolve('../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../middleware/audit')
};

const adminUserDatalayer = require('../../datalayer/adminUserDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Admin Users API Integration', () => {
  describe('POST /api/admin-users/list', () => {
    it('should return users for partner-admin', async () => {
      sandbox.stub(adminUserDatalayer, 'listUsers').resolves({ users: [partnerUser, accountAdminUser], total: 2, page: 1, limit: 20 });
      const res = await request.post('/api/admin-users/list').set('Authorization', `Bearer ${partnerAdminToken}`).send({ page: 1 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.users.length, 2);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/admin-users/list').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 403 for support-admin', async () => {
      const res = await request.post('/api/admin-users/list').set('Authorization', `Bearer ${supportAdminToken}`).send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/admin-users/list').send({});
      assert.strictEqual(res.status, 401);
    });
  });

  describe('POST /api/admin-users/create', () => {
    it('should create user for partner-admin', async () => {
      sandbox.stub(adminUserDatalayer, 'createUser').resolves({ id: 4, username: 'newadmin', email: 'n@e.com', role: 'account-admin' });
      const res = await request.post('/api/admin-users/create').set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ username: 'newadmin', password: 'Pass@123', email: 'n@e.com', firstName: 'N', lastName: 'A', role: 'account-admin' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.username, 'newadmin');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request.post('/api/admin-users/create').set('Authorization', `Bearer ${partnerAdminToken}`).send({ username: 'test' });
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 for invalid role (partner-admin)', async () => {
      const res = await request.post('/api/admin-users/create').set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ username: 'u', password: 'p', email: 'e@e.com', firstName: 'F', lastName: 'L', role: 'partner-admin' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/admin-users/update', () => {
    it('should update user', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'updateUser').resolves(accountAdminUser);
      const res = await request.post('/api/admin-users/update').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 2, email: 'updated@test.com' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 400 without id', async () => {
      const res = await request.post('/api/admin-users/update').set('Authorization', `Bearer ${partnerAdminToken}`).send({ email: 'test@test.com' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/admin-users/toggle-status', () => {
    it('should toggle user status', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'toggleUserStatus').resolves(true);
      const res = await request.post('/api/admin-users/toggle-status').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 2, isActive: 0 });
      assert.strictEqual(res.status, 200);
    });

    it('should return 400 when deactivating self', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(partnerUser);
      const res = await request.post('/api/admin-users/toggle-status').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 1, isActive: 0 });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/admin-users/reset-password', () => {
    it('should reset password for partner-admin', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'resetPassword').resolves(true);
      const res = await request.post('/api/admin-users/reset-password').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 2, newPassword: 'NewPass@123' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 400 for short password', async () => {
      const res = await request.post('/api/admin-users/reset-password').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 2, newPassword: 'abc' });
      assert.strictEqual(res.status, 400);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/admin-users/reset-password').set('Authorization', `Bearer ${accountAdminToken}`).send({ id: 2, newPassword: 'NewPass@123' });
      assert.strictEqual(res.status, 403);
    });

    it('should return 404 when user not found', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(null);
      const res = await request.post('/api/admin-users/reset-password').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 999, newPassword: 'NewPass@123' });
      assert.strictEqual(res.status, 404);
    });
  });
});
