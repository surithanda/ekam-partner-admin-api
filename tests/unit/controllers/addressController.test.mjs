import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';

const require = createRequire(import.meta.url);

// Stub DB pool (required by errorCodes)
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = {
  id: require.resolve('../../../config/db'), exports: pool, loaded: true,
  filename: require.resolve('../../../config/db')
};

// Stub addressProviders config
require.cache[require.resolve('../../../config/addressProviders')] = {
  id: require.resolve('../../../config/addressProviders'),
  exports: {
    providers: { geoapify: { apiKey: 'test-key', baseUrl: 'https://api.geoapify.com/v1/geocode', enabled: true } },
    providerTimeout: 5000, cacheTtl: 86400, priority: ['geoapify']
  },
  loaded: true,
  filename: require.resolve('../../../config/addressProviders')
};

const addressService = require('../../../services/addressVerification');
const addressController = require('../../../controllers/addressController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('addressController', () => {
  describe('lookupByZip', () => {
    it('should return results for valid zip', async () => {
      const mockResults = [{ city: 'Springfield', state: 'Illinois', country: 'US' }];
      sandbox.stub(addressService, 'lookupByZip').resolves(mockResults);
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByZip(mockReq({ body: { zip: '62704', country: 'us' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: mockResults });
    });

    it('should call next with PA_AVLK_001 when zip is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByZip(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVLK_001_INVALID_ZIP');
    });

    it('should call next with PA_AVLK_001 when zip is too short', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByZip(mockReq({ body: { zip: '12' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVLK_001_INVALID_ZIP');
    });

    it('should call next on service error', async () => {
      sandbox.stub(addressService, 'lookupByZip').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByZip(mockReq({ body: { zip: '62704' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('lookupByCity', () => {
    it('should return results for valid city', async () => {
      const mockResults = [{ state: 'Illinois', country: 'US' }, { state: 'Missouri', country: 'US' }];
      sandbox.stub(addressService, 'lookupByCity').resolves(mockResults);
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByCity(mockReq({ body: { city: 'Springfield', country: 'us' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: mockResults });
    });

    it('should call next with PA_AVLK_002 when city is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByCity(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVLK_002_INVALID_CITY');
    });

    it('should call next with PA_AVLK_002 when city is too short', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByCity(mockReq({ body: { city: 'AB' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVLK_002_INVALID_CITY');
    });

    it('should call next on service error', async () => {
      sandbox.stub(addressService, 'lookupByCity').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await addressController.lookupByCity(mockReq({ body: { city: 'Springfield' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('verifyAddress', () => {
    const validBody = { address_line1: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704' };
    const mockResult = {
      verified: true, confidence: 'high',
      standardized_address: { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704-1234', country: 'US' },
      corrections: [{ field: 'zip', original: '62704', corrected: '62704-1234' }],
      provider: 'geoapify'
    };

    it('should return verification result for valid address', async () => {
      sandbox.stub(addressService, 'verifyAddress').resolves(mockResult);
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: validBody }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: mockResult });
    });

    it('should call next with PA_AVVR_001 when address_line1 is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: { city: 'Springfield', state: 'IL', zip: '62704' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVVR_001_INVALID_ADDRESS');
    });

    it('should call next with PA_AVVR_001 when city is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: { address_line1: '123 Main St', state: 'IL', zip: '62704' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVVR_001_INVALID_ADDRESS');
    });

    it('should call next with PA_AVVR_001 when state is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: { address_line1: '123 Main St', city: 'Springfield', zip: '62704' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVVR_001_INVALID_ADDRESS');
    });

    it('should call next with PA_AVVR_001 when zip is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: { address_line1: '123 Main St', city: 'Springfield', state: 'IL' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVVR_001_INVALID_ADDRESS');
    });

    it('should call next on service error', async () => {
      sandbox.stub(addressService, 'verifyAddress').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await addressController.verifyAddress(mockReq({ body: validBody }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('autocomplete', () => {
    const mockSuggestions = [
      { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704', country: 'US' }
    ];

    it('should return suggestions for valid query', async () => {
      sandbox.stub(addressService, 'autocomplete').resolves(mockSuggestions);
      const res = mockRes();
      const next = mockNext();
      await addressController.autocomplete(mockReq({ body: { query: '123 Main', country: 'us' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: mockSuggestions });
    });

    it('should call next with PA_AVAC_001 when query is missing', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.autocomplete(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVAC_001_QUERY_TOO_SHORT');
    });

    it('should call next with PA_AVAC_001 when query is too short', async () => {
      const res = mockRes();
      const next = mockNext();
      await addressController.autocomplete(mockReq({ body: { query: 'AB' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_AVAC_001_QUERY_TOO_SHORT');
    });

    it('should call next on service error', async () => {
      sandbox.stub(addressService, 'autocomplete').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await addressController.autocomplete(mockReq({ body: { query: '123 Main' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
