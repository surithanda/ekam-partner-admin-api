import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Stub config
require.cache[require.resolve('../../../config/addressProviders')] = {
  id: require.resolve('../../../config/addressProviders'),
  exports: {
    providers: {
      geoapify: { apiKey: 'test-key', baseUrl: 'https://api.geoapify.com/v1/geocode', enabled: true }
    },
    providerTimeout: 5000,
    cacheTtl: 86400,
    priority: ['geoapify']
  },
  loaded: true,
  filename: require.resolve('../../../config/addressProviders')
};

// Stub DB pool (required by errorCodes)
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = {
  id: require.resolve('../../../config/db'), exports: pool, loaded: true,
  filename: require.resolve('../../../config/db')
};

const addressCache = require('../../../services/addressVerification/addressCache');
const geoapifyProvider = require('../../../services/addressVerification/providers/geoapifyProvider');
const addressService = require('../../../services/addressVerification');

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
  addressCache.clear();
});

describe('addressService', () => {
  describe('lookupByZip', () => {
    it('should return results from provider', async () => {
      const mockResults = [{ city: 'Springfield', state: 'Illinois', country: 'US' }];
      sandbox.stub(geoapifyProvider, 'lookupByZip').resolves(mockResults);

      const results = await addressService.lookupByZip('62704', 'us');
      assert.deepStrictEqual(results, mockResults);
    });

    it('should cache results after first call', async () => {
      const mockResults = [{ city: 'Springfield', state: 'Illinois', country: 'US' }];
      const stub = sandbox.stub(geoapifyProvider, 'lookupByZip').resolves(mockResults);

      await addressService.lookupByZip('62704', 'us');
      const cached = await addressService.lookupByZip('62704', 'us');
      assert.deepStrictEqual(cached, mockResults);
      assert.strictEqual(stub.callCount, 1);
    });

    it('should not cache empty results', async () => {
      const stub = sandbox.stub(geoapifyProvider, 'lookupByZip').resolves([]);

      await addressService.lookupByZip('00000', 'us');
      await addressService.lookupByZip('00000', 'us');
      assert.strictEqual(stub.callCount, 2);
    });

    it('should throw PA_AVVR_002 when provider fails', async () => {
      sandbox.stub(geoapifyProvider, 'lookupByZip').rejects(new Error('API down'));

      try {
        await addressService.lookupByZip('62704', 'us');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.errorCode, 'PA_AVVR_002_PROVIDER_UNAVAILABLE');
      }
    });
  });

  describe('lookupByCity', () => {
    it('should return results from provider', async () => {
      const mockResults = [{ state: 'Illinois', country: 'US' }];
      sandbox.stub(geoapifyProvider, 'lookupByCity').resolves(mockResults);

      const results = await addressService.lookupByCity('Springfield', 'us');
      assert.deepStrictEqual(results, mockResults);
    });

    it('should cache results after first call', async () => {
      const mockResults = [{ state: 'Illinois', country: 'US' }];
      const stub = sandbox.stub(geoapifyProvider, 'lookupByCity').resolves(mockResults);

      await addressService.lookupByCity('Springfield', 'us');
      const cached = await addressService.lookupByCity('Springfield', 'us');
      assert.deepStrictEqual(cached, mockResults);
      assert.strictEqual(stub.callCount, 1);
    });

    it('should throw PA_AVVR_002 when provider fails', async () => {
      sandbox.stub(geoapifyProvider, 'lookupByCity').rejects(new Error('timeout'));

      try {
        await addressService.lookupByCity('Springfield', 'us');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.errorCode, 'PA_AVVR_002_PROVIDER_UNAVAILABLE');
      }
    });
  });

  describe('verifyAddress', () => {
    const mockAddress = { address_line1: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704', country: 'us' };
    const mockResult = {
      verified: true, confidence: 'high',
      standardized_address: { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704-1234', country: 'US' },
      corrections: [{ field: 'zip', original: '62704', corrected: '62704-1234' }],
      provider: 'geoapify'
    };

    it('should return result from provider', async () => {
      sandbox.stub(geoapifyProvider, 'verifyAddress').resolves(mockResult);
      const result = await addressService.verifyAddress(mockAddress);
      assert.deepStrictEqual(result, mockResult);
    });

    it('should cache result when standardized_address is present', async () => {
      const stub = sandbox.stub(geoapifyProvider, 'verifyAddress').resolves(mockResult);
      await addressService.verifyAddress(mockAddress);
      const cached = await addressService.verifyAddress(mockAddress);
      assert.deepStrictEqual(cached, mockResult);
      assert.strictEqual(stub.callCount, 1);
    });

    it('should not cache result when standardized_address is null', async () => {
      const noMatch = { verified: false, confidence: 'none', standardized_address: null, corrections: [], provider: 'geoapify' };
      const stub = sandbox.stub(geoapifyProvider, 'verifyAddress').resolves(noMatch);
      await addressService.verifyAddress(mockAddress);
      await addressService.verifyAddress(mockAddress);
      assert.strictEqual(stub.callCount, 2);
    });

    it('should throw PA_AVVR_002 when provider fails', async () => {
      sandbox.stub(geoapifyProvider, 'verifyAddress').rejects(new Error('timeout'));
      try {
        await addressService.verifyAddress(mockAddress);
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.errorCode, 'PA_AVVR_002_PROVIDER_UNAVAILABLE');
      }
    });
  });

  describe('autocomplete', () => {
    const mockSuggestions = [
      { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704', country: 'US' }
    ];

    it('should return results from provider', async () => {
      sandbox.stub(geoapifyProvider, 'autocomplete').resolves(mockSuggestions);
      const results = await addressService.autocomplete('123 Main', 'us');
      assert.deepStrictEqual(results, mockSuggestions);
    });

    it('should cache results after first call', async () => {
      const stub = sandbox.stub(geoapifyProvider, 'autocomplete').resolves(mockSuggestions);
      await addressService.autocomplete('123 Main', 'us');
      const cached = await addressService.autocomplete('123 Main', 'us');
      assert.deepStrictEqual(cached, mockSuggestions);
      assert.strictEqual(stub.callCount, 1);
    });

    it('should not cache empty results', async () => {
      const stub = sandbox.stub(geoapifyProvider, 'autocomplete').resolves([]);
      await addressService.autocomplete('zzzzz', 'us');
      await addressService.autocomplete('zzzzz', 'us');
      assert.strictEqual(stub.callCount, 2);
    });

    it('should throw PA_AVVR_002 when provider fails', async () => {
      sandbox.stub(geoapifyProvider, 'autocomplete').rejects(new Error('timeout'));
      try {
        await addressService.autocomplete('123 Main', 'us');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.strictEqual(err.errorCode, 'PA_AVVR_002_PROVIDER_UNAVAILABLE');
      }
    });
  });

  describe('getEnabledProviders', () => {
    it('should return geoapify when enabled', () => {
      const providers = addressService.getEnabledProviders();
      assert.strictEqual(providers.length, 1);
      assert.strictEqual(providers[0].name, 'geoapify');
    });
  });
});
