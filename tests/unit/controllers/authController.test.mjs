import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { partnerDomains, brandConfigFormatted } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const authDatalayer = require('../../../datalayer/authDatalayer');
const authController = require('../../../controllers/authController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('authController', () => {
  describe('login', () => {
    it('should call next with error if missing fields', async () => {
      const req = mockReq({ body: { username: 'user' } });
      const res = mockRes();
      const next = mockNext();
      await authController.login(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AULG_001_MISSING_CREDENTIALS');
    });

    it('should call next with error for invalid credentials', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(authDatalayer, 'login').rejects(new AppError('PA_AULG_202_INVALID_CREDENTIALS', 'Invalid', 401));
      const req = mockReq({ body: { username: 'bad', password: 'bad', apiKey: 'key' } });
      const res = mockRes();
      const next = mockNext();
      await authController.login(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AULG_202_INVALID_CREDENTIALS');
    });

    it('should return 200 with token on success', async () => {
      sandbox.stub(authDatalayer, 'login').resolves({ success: true, token: 'jwt', user: { id: 1 }, brandConfig: brandConfigFormatted });
      const req = mockReq({ body: { username: 'admin', password: 'pass', apiKey: 'key' } });
      const res = mockRes();
      const next = mockNext();
      await authController.login(req, res, next);
      assert.ok(res.json.calledOnce);
      const body = res.json.firstCall.args[0];
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.token, 'jwt');
    });

    it('should call next on unexpected error', async () => {
      sandbox.stub(authDatalayer, 'login').rejects(new Error('DB down'));
      const req = mockReq({ body: { username: 'a', password: 'b', apiKey: 'c' } });
      const res = mockRes();
      const next = mockNext();
      await authController.login(req, res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getDomains', () => {
    it('should return domains', async () => {
      sandbox.stub(authDatalayer, 'getPartnerDomains').resolves(partnerDomains);
      const res = mockRes();
      const next = mockNext();
      await authController.getDomains(mockReq(), res, next);
      const body = res.json.firstCall.args[0];
      assert.deepStrictEqual(body, { success: true, data: partnerDomains });
    });

    it('should call next on error', async () => {
      sandbox.stub(authDatalayer, 'getPartnerDomains').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await authController.getDomains(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('verifyToken', () => {
    it('should return user from req', async () => {
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();
      await authController.verifyToken(req, res, next);
      const body = res.json.firstCall.args[0];
      assert.strictEqual(body.success, true);
      assert.deepStrictEqual(body.user, req.user);
    });
  });
});
