import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { partnerInfo, partnerDomainLinks, countries, states } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const partnerDatalayer = require('../../../datalayer/partnerDatalayer');
const partnerController = require('../../../controllers/partnerController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('partnerController', () => {
  describe('getPartnerInfo', () => {
    it('should return partner info', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerInfo').resolves(partnerInfo);
      const res = mockRes();
      const next = mockNext();
      await partnerController.getPartnerInfo(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: partnerInfo });
    });

    it('should call next with error when not found', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerInfo').resolves(null);
      const res = mockRes();
      const next = mockNext();
      await partnerController.getPartnerInfo(mockReq(), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_PNGT_100_NOT_FOUND');
    });

    it('should call next on error', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerInfo').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await partnerController.getPartnerInfo(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getDomainLinks', () => {
    it('should return domain links', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerDomainLinks').resolves(partnerDomainLinks);
      const res = mockRes();
      const next = mockNext();
      await partnerController.getDomainLinks(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: partnerDomainLinks });
    });

    it('should call next on error', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerDomainLinks').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await partnerController.getDomainLinks(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getCountries', () => {
    it('should return countries', async () => {
      sandbox.stub(partnerDatalayer, 'getCountries').resolves(countries);
      const res = mockRes();
      const next = mockNext();
      await partnerController.getCountries(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: countries });
    });
  });

  describe('getStates', () => {
    it('should return states for countryId', async () => {
      sandbox.stub(partnerDatalayer, 'getStates').resolves(states);
      const res = mockRes();
      const next = mockNext();
      await partnerController.getStates(mockReq({ body: { countryId: 1 } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: states });
    });

    it('should call next on error', async () => {
      sandbox.stub(partnerDatalayer, 'getStates').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await partnerController.getStates(mockReq({ body: { countryId: 1 } }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
