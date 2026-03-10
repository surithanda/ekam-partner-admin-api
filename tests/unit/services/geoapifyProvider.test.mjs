import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Stub config before requiring provider
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

const geoapifyProvider = require('../../../services/addressVerification/providers/geoapifyProvider');

describe('geoapifyProvider', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('lookupByZip', () => {
    it('should return normalized city/state from Geoapify response', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { city: 'Springfield', state: 'Illinois', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByZip('62704', 'us');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].city, 'Springfield');
      assert.strictEqual(results[0].state, 'Illinois');
      assert.strictEqual(results[0].country, 'US');
    });

    it('should deduplicate results by city+state', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { city: 'Springfield', state: 'Illinois', country_code: 'us' },
            { city: 'Springfield', state: 'Illinois', country_code: 'us' },
            { city: 'Springfield', state: 'Missouri', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByZip('62704', 'us');
      assert.strictEqual(results.length, 2);
    });

    it('should return empty array when no results', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ results: [] })
      });

      const results = await geoapifyProvider.lookupByZip('00000', 'us');
      assert.strictEqual(results.length, 0);
    });

    it('should skip entries without city', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { state: 'Illinois', country_code: 'us' },
            { city: 'Springfield', state: 'Illinois', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByZip('62704', 'us');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].city, 'Springfield');
    });

    it('should throw on non-ok response', async () => {
      fetchStub.resolves({ ok: false, status: 429, statusText: 'Too Many Requests' });
      await assert.rejects(
        () => geoapifyProvider.lookupByZip('62704', 'us'),
        { message: 'Geoapify API error: 429 Too Many Requests' }
      );
    });

    it('should use county as fallback when city is missing', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { county: 'Sangamon County', state: 'Illinois', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByZip('62704', 'us');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].city, 'Sangamon County');
    });

    it('should default country to us', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ results: [{ city: 'Test', state: 'TX', country_code: 'us' }] })
      });

      const results = await geoapifyProvider.lookupByZip('75001');
      assert.strictEqual(results[0].country, 'US');
      const calledUrl = fetchStub.firstCall.args[0];
      assert.ok(calledUrl.includes('countrycode:us'));
    });
  });

  describe('lookupByCity', () => {
    it('should return normalized state list from Geoapify response', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { state: 'Illinois', country_code: 'us' },
            { state: 'Missouri', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByCity('Springfield', 'us');
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].state, 'Illinois');
      assert.strictEqual(results[1].state, 'Missouri');
    });

    it('should deduplicate states', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { state: 'Illinois', country_code: 'us' },
            { state: 'Illinois', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByCity('Springfield', 'us');
      assert.strictEqual(results.length, 1);
    });

    it('should skip entries without state', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { country_code: 'us' },
            { state: 'Illinois', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.lookupByCity('Springfield', 'us');
      assert.strictEqual(results.length, 1);
    });

    it('should throw on non-ok response', async () => {
      fetchStub.resolves({ ok: false, status: 500, statusText: 'Internal Server Error' });
      await assert.rejects(
        () => geoapifyProvider.lookupByCity('Springfield', 'us'),
        { message: 'Geoapify API error: 500 Internal Server Error' }
      );
    });
  });

  describe('verifyAddress', () => {
    const inputAddress = {
      address_line1: '123 Main St',
      address_line2: 'Apt 4B',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      country: 'us'
    };

    it('should return verified address with high confidence', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [{
            housenumber: '123',
            street: 'Main Street',
            city: 'Springfield',
            state: 'Illinois',
            postcode: '62704-1234',
            country_code: 'us',
            rank: { confidence: 0.95 }
          }]
        })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.confidence, 'high');
      assert.strictEqual(result.provider, 'geoapify');
      assert.strictEqual(result.standardized_address.address_line1, '123 Main Street');
      assert.strictEqual(result.standardized_address.city, 'Springfield');
      assert.strictEqual(result.standardized_address.zip, '62704-1234');
    });

    it('should return medium confidence for scores between 0.5 and 0.8', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [{
            street: 'Main St',
            city: 'Springfield',
            state: 'Illinois',
            postcode: '62704',
            country_code: 'us',
            rank: { confidence: 0.65 }
          }]
        })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.strictEqual(result.verified, true);
      assert.strictEqual(result.confidence, 'medium');
    });

    it('should return low confidence and unverified for scores below 0.5', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [{
            street: 'Other St',
            city: 'Somewhere',
            state: 'Illinois',
            postcode: '60000',
            country_code: 'us',
            rank: { confidence: 0.2 }
          }]
        })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.confidence, 'low');
    });

    it('should return unverified with no results', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ results: [] })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.strictEqual(result.verified, false);
      assert.strictEqual(result.confidence, 'none');
      assert.strictEqual(result.standardized_address, null);
    });

    it('should detect corrections between input and standardized', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [{
            housenumber: '123',
            street: 'Main Street',
            city: 'Springfield',
            state: 'Illinois',
            postcode: '62704-1234',
            country_code: 'us',
            rank: { confidence: 0.9 }
          }]
        })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.ok(result.corrections.length > 0);
      const zipCorrection = result.corrections.find(c => c.field === 'zip');
      assert.ok(zipCorrection);
      assert.strictEqual(zipCorrection.original, '62704');
      assert.strictEqual(zipCorrection.corrected, '62704-1234');
    });

    it('should throw on non-ok response', async () => {
      fetchStub.resolves({ ok: false, status: 503, statusText: 'Service Unavailable' });
      await assert.rejects(
        () => geoapifyProvider.verifyAddress(inputAddress),
        { message: 'Geoapify API error: 503 Service Unavailable' }
      );
    });

    it('should use street when housenumber is missing', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [{
            street: 'Main Street',
            city: 'Springfield',
            state: 'Illinois',
            postcode: '62704',
            country_code: 'us',
            rank: { confidence: 0.8 }
          }]
        })
      });

      const result = await geoapifyProvider.verifyAddress(inputAddress);
      assert.strictEqual(result.standardized_address.address_line1, 'Main Street');
    });
  });

  describe('autocomplete', () => {
    it('should return normalized address suggestions', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { housenumber: '123', street: 'Main Street', city: 'Springfield', state: 'Illinois', postcode: '62704', country_code: 'us' },
            { street: 'Main Avenue', city: 'Springfield', state: 'Missouri', postcode: '65801', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.autocomplete('123 Main', 'us');
      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].address_line1, '123 Main Street');
      assert.strictEqual(results[0].city, 'Springfield');
      assert.strictEqual(results[0].zip, '62704');
      assert.strictEqual(results[1].address_line1, 'Main Avenue');
    });

    it('should deduplicate results', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { housenumber: '123', street: 'Main St', city: 'Springfield', state: 'Illinois', postcode: '62704', country_code: 'us' },
            { housenumber: '123', street: 'Main St', city: 'Springfield', state: 'Illinois', postcode: '62704', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.autocomplete('123 Main', 'us');
      assert.strictEqual(results.length, 1);
    });

    it('should return empty array when no results', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({ results: [] })
      });

      const results = await geoapifyProvider.autocomplete('zzzzz', 'us');
      assert.strictEqual(results.length, 0);
    });

    it('should skip entries without address_line1 and city', async () => {
      fetchStub.resolves({
        ok: true,
        json: async () => ({
          results: [
            { state: 'Illinois', country_code: 'us' },
            { street: 'Main St', city: 'Springfield', state: 'Illinois', postcode: '62704', country_code: 'us' }
          ]
        })
      });

      const results = await geoapifyProvider.autocomplete('Main', 'us');
      assert.strictEqual(results.length, 1);
    });

    it('should throw on non-ok response', async () => {
      fetchStub.resolves({ ok: false, status: 429, statusText: 'Too Many Requests' });
      await assert.rejects(
        () => geoapifyProvider.autocomplete('123 Main', 'us'),
        { message: 'Geoapify API error: 429 Too Many Requests' }
      );
    });
  });
});
