import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { profileForCheck } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const backgroundCheckDatalayer = require('../../../datalayer/backgroundCheckDatalayer');
const backgroundCheckController = require('../../../controllers/backgroundCheckController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('backgroundCheckController', () => {
  describe('getProfileForCheck', () => {
    it('should return profile for check', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').resolves(profileForCheck);
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.getProfileForCheck(mockReq({ body: { profileId: 101 } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: profileForCheck });
    });

    it('should call next with error for missing profileId', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').rejects(new AppError('PA_BCGT_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.getProfileForCheck(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
    });

    it('should call next with error when not found', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').rejects(new AppError('PA_BCGT_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.getProfileForCheck(mockReq({ body: { profileId: 999 } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_BCGT_100_NOT_FOUND');
    });

    it('should call next on error', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'getProfileForCheck').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.getProfileForCheck(mockReq({ body: { profileId: 101 } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('initiateCheck', () => {
    it('should initiate check successfully', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'initiateBackgroundCheck').resolves({
        success: true, message: 'Check initiated', profileId: 101, checkType: 'identity', status: 'initiated'
      });
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.initiateCheck(mockReq({ body: { profileId: 101, checkType: 'identity', notes: 'test' } }), res, next);
      assert.strictEqual(res.json.firstCall.args[0].success, true);
    });

    it('should call next with error for missing fields', async () => {
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.initiateCheck(mockReq({ body: { profileId: 101 } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_BCIN_001_MISSING_FIELDS');
    });

    it('should call next with error when check fails', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(backgroundCheckDatalayer, 'initiateBackgroundCheck').rejects(new AppError('PA_BCIN_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.initiateCheck(mockReq({ body: { profileId: 999, checkType: 'identity' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_BCIN_100_NOT_FOUND');
    });

    it('should call next on error', async () => {
      sandbox.stub(backgroundCheckDatalayer, 'initiateBackgroundCheck').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await backgroundCheckController.initiateCheck(mockReq({ body: { profileId: 101, checkType: 'identity' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
