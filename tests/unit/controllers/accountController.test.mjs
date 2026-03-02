import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const accountDatalayer = require('../../../datalayer/accountDatalayer');
const accountController = require('../../../controllers/accountController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

const mockAccount = { account_id: 5, account_code: 'EKM1001', email: 'test@test.com', first_name: 'John', last_name: 'Doe', registered_partner_id: 1 };

describe('accountController', () => {

  describe('getAccounts', () => {
    it('should return accounts list', async () => {
      const data = { accounts: [mockAccount], total: 1, page: 1, limit: 20 };
      sandbox.stub(accountDatalayer, 'getAccounts').resolves(data);
      const res = mockRes();
      const next = mockNext();
      await accountController.getAccounts(mockReq({ body: { page: '1', limit: '20' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data });
    });

    it('should call next on error', async () => {
      sandbox.stub(accountDatalayer, 'getAccounts').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await accountController.getAccounts(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getAccountDetail', () => {
    it('should return account with profiles', async () => {
      const data = { account: mockAccount, profiles: [] };
      sandbox.stub(accountDatalayer, 'getAccountDetail').resolves(data);
      const res = mockRes();
      const next = mockNext();
      await accountController.getAccountDetail(mockReq({ body: { id: '5' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data });
    });

    it('should call next with error when not found', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(accountDatalayer, 'getAccountDetail').rejects(new AppError('PA_ACGT_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await accountController.getAccountDetail(mockReq({ body: { id: '999' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_ACGT_100_NOT_FOUND');
    });
  });

  describe('createAccount', () => {
    it('should return 201 on success', async () => {
      const result = { account_id: 201, account_code: 'EKM1001', email: 'new@test.com' };
      sandbox.stub(accountDatalayer, 'createAccount').resolves(result);
      const res = mockRes();
      const next = mockNext();
      await accountController.createAccount(mockReq({ body: { email: 'new@test.com', password: 'Pass@123', first_name: 'New', last_name: 'User', birth_date: '2000-01-01', gender: 1, primary_phone: '123' } }), res, next);
      assert.ok(res.status.calledWith(201));
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: result });
    });

    it('should call next on error', async () => {
      sandbox.stub(accountDatalayer, 'createAccount').rejects(new Error('dup email'));
      const res = mockRes();
      const next = mockNext();
      await accountController.createAccount(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('updateAccount', () => {
    it('should return success on update', async () => {
      sandbox.stub(accountDatalayer, 'updateAccount').resolves(true);
      const res = mockRes();
      const next = mockNext();
      await accountController.updateAccount(mockReq({ body: { id: '5', first_name: 'Updated' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: { updated: true } });
    });
  });

  describe('toggleStatus', () => {
    it('should return success message', async () => {
      sandbox.stub(accountDatalayer, 'toggleAccountStatus').resolves(5);
      const res = mockRes();
      const next = mockNext();
      await accountController.toggleStatus(mockReq({ body: { id: '5', isActive: 0, reason: 'test' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, message: 'Account status updated' });
    });
  });

  describe('deleteAccount', () => {
    it('should return success message', async () => {
      sandbox.stub(accountDatalayer, 'deleteAccount').resolves(5);
      const res = mockRes();
      const next = mockNext();
      await accountController.deleteAccount(mockReq({ body: { id: '5', reason: 'no longer needed' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, message: 'Account deleted' });
    });

    it('should call next on error', async () => {
      sandbox.stub(accountDatalayer, 'deleteAccount').rejects(new Error('access denied'));
      const res = mockRes();
      const next = mockNext();
      await accountController.deleteAccount(mockReq({ body: { id: '5' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
