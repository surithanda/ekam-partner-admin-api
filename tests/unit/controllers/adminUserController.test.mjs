import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { partnerUser, accountAdminUser, supportAdminUser } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

// Stub audit middleware before requiring controller
require.cache[require.resolve('../../../middleware/audit')] = {
  id: require.resolve('../../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../../middleware/audit')
};

const adminUserDatalayer = require('../../../datalayer/adminUserDatalayer');
const adminUserController = require('../../../controllers/adminUserController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('adminUserController', () => {
  describe('listUsers', () => {
    it('should return users list', async () => {
      const data = { users: [partnerUser, accountAdminUser], total: 2, page: 1, limit: 20 };
      sandbox.stub(adminUserDatalayer, 'listUsers').resolves(data);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.listUsers(mockReq({ body: { page: '1' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data });
    });

    it('should call next on error', async () => {
      sandbox.stub(adminUserDatalayer, 'listUsers').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await adminUserController.listUsers(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('createUser', () => {
    it('should return 201 on success', async () => {
      sandbox.stub(adminUserDatalayer, 'createUser').resolves({ id: 4, username: 'newadmin' });
      const res = mockRes();
      const next = mockNext();
      await adminUserController.createUser(mockReq({
        body: { username: 'newadmin', password: 'Pass@123', email: 'n@e.com', firstName: 'N', lastName: 'A', role: 'account-admin' }
      }), res, next);
      assert.ok(res.status.calledWith(201));
    });

    it('should call next with error for missing fields', async () => {
      const res = mockRes();
      const next = mockNext();
      await adminUserController.createUser(mockReq({ body: { username: 'test' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USCR_001_MISSING_FIELDS');
    });

    it('should call next with error for partner-admin role creation', async () => {
      const res = mockRes();
      const next = mockNext();
      await adminUserController.createUser(mockReq({
        body: { username: 'u', password: 'p', email: 'e@e.com', firstName: 'F', lastName: 'L', role: 'partner-admin' }
      }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USCR_200_INVALID_ROLE');
    });

    it('should call next on duplicate username error', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(adminUserDatalayer, 'createUser').rejects(new AppError('PA_USCR_400_DUPLICATE_USERNAME', 'Duplicate', 409));
      const res = mockRes();
      const next = mockNext();
      await adminUserController.createUser(mockReq({
        body: { username: 'dup', password: 'Pass@123', email: 'e@e.com', firstName: 'F', lastName: 'L', role: 'account-admin' }
      }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USCR_400_DUPLICATE_USERNAME');
    });
  });

  describe('updateUser', () => {
    it('should return 200 on success', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'updateUser').resolves(accountAdminUser);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.updateUser(mockReq({ body: { id: '2', email: 'up@test.com' } }), res, next);
      assert.ok(res.json.calledOnce);
    });

    it('should call next with error without id', async () => {
      const res = mockRes();
      const next = mockNext();
      await adminUserController.updateUser(mockReq({ body: { email: 'x@x.com' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USUP_001_MISSING_ID');
    });

    it('should call next with not-found error', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(null);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.updateUser(mockReq({ body: { id: '999' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USUP_100_NOT_FOUND');
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle status', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'toggleUserStatus').resolves(true);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.toggleUserStatus(mockReq({ body: { id: '2', isActive: 0 } }), res, next);
      assert.ok(res.json.calledOnce);
    });

    it('should call next with error when deactivating self', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(partnerUser);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.toggleUserStatus(mockReq({ body: { id: 1, isActive: 0 } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USTG_200_SELF_DEACTIVATE');
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(accountAdminUser);
      sandbox.stub(adminUserDatalayer, 'resetPassword').resolves(true);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.resetPassword(mockReq({ body: { id: '2', newPassword: 'NewPass@123' } }), res, next);
      assert.ok(res.json.calledOnce);
      assert.strictEqual(res.json.firstCall.args[0].success, true);
    });

    it('should call next with error for short password', async () => {
      const res = mockRes();
      const next = mockNext();
      await adminUserController.resetPassword(mockReq({ body: { id: '2', newPassword: 'abc' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USRS_002_WEAK_PASSWORD');
    });

    it('should call next with not-found error', async () => {
      sandbox.stub(adminUserDatalayer, 'getUserById').resolves(null);
      const res = mockRes();
      const next = mockNext();
      await adminUserController.resetPassword(mockReq({ body: { id: '999', newPassword: 'NewPass@123' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_USRS_100_NOT_FOUND');
    });
  });
});
