import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes } from '../../helpers/mockReqRes.mjs';

const require = createRequire(import.meta.url);

process.env.JWT_SECRET = 'test-secret';

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const jwt = require('jsonwebtoken');
const { authenticateToken, validateApiKey, authorizeRoles } = require('../../../middleware/auth');

afterEach(() => sinon.restore());

describe('auth middleware', () => {
  describe('authenticateToken', () => {
    it('should call next with error if no token provided', () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      const next = sinon.stub();
      authenticateToken(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_001_NO_TOKEN');
    });

    it('should call next with error for invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
      const res = mockRes();
      const next = sinon.stub();
      authenticateToken(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_002_INVALID_TOKEN');
    });

    it('should set req.user and call next for valid token', () => {
      const token = jwt.sign({ userId: 1, username: 'admin', role: 'partner-admin', partnerId: 1 }, 'test-secret');
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      const next = sinon.stub();
      authenticateToken(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(req.user.userId, 1);
      assert.strictEqual(req.user.username, 'admin');
    });
  });

  describe('validateApiKey', () => {
    it('should call next with error if no API key', () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      const next = sinon.stub();
      validateApiKey(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_003_NO_API_KEY');
    });

    it('should set req.apiKey and call next', () => {
      const req = mockReq({ headers: { 'x-api-key': 'test-key' } });
      const res = mockRes();
      const next = sinon.stub();
      validateApiKey(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(req.apiKey, 'test-key');
    });
  });

  describe('authorizeRoles', () => {
    it('should call next with error if no user', () => {
      const req = mockReq({ user: null });
      const res = mockRes();
      const next = sinon.stub();
      authorizeRoles('partner-admin')(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_300_INSUFFICIENT_ROLE');
    });

    it('should call next with error if role not allowed', () => {
      const req = mockReq({ user: { role: 'support-admin' } });
      const res = mockRes();
      const next = sinon.stub();
      authorizeRoles('partner-admin')(req, res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_300_INSUFFICIENT_ROLE');
    });

    it('should call next for allowed role', () => {
      const req = mockReq({ user: { role: 'partner-admin' } });
      const res = mockRes();
      const next = sinon.stub();
      authorizeRoles('partner-admin')(req, res, next);
      assert.ok(next.calledOnce);
    });

    it('should allow multiple roles', () => {
      const req = mockReq({ user: { role: 'account-admin' } });
      const res = mockRes();
      const next = sinon.stub();
      authorizeRoles('partner-admin', 'account-admin')(req, res, next);
      assert.ok(next.calledOnce);
    });
  });
});
