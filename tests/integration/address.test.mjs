import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';

const require = createRequire(import.meta.url);

// Stub DB pool
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = {
  id: require.resolve('../../config/db'), exports: pool, loaded: true,
  filename: require.resolve('../../config/db')
};
seedErrorCodes();

// Stub addressProviders config
require.cache[require.resolve('../../config/addressProviders')] = {
  id: require.resolve('../../config/addressProviders'),
  exports: {
    providers: { geoapify: { apiKey: 'test-key', baseUrl: 'https://api.geoapify.com/v1/geocode', enabled: true } },
    providerTimeout: 5000, cacheTtl: 86400, priority: ['geoapify']
  },
  loaded: true,
  filename: require.resolve('../../config/addressProviders')
};

// Stub audit middleware
require.cache[require.resolve('../../middleware/audit')] = {
  id: require.resolve('../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../middleware/audit')
};

const addressService = require('../../services/addressVerification');
const addressCache = require('../../services/addressVerification/addressCache');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); addressCache.clear(); });

describe('Address API Integration', () => {
  describe('POST /api/address/lookup-by-zip', () => {
    it('should return city/state for valid zip (partner-admin)', async () => {
      const mockResults = [{ city: 'Springfield', state: 'Illinois', country: 'US' }];
      sandbox.stub(addressService, 'lookupByZip').resolves(mockResults);
      const res = await request.post('/api/address/lookup-by-zip')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ zip: '62704', country: 'us' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].city, 'Springfield');
    });

    it('should allow account-admin access', async () => {
      sandbox.stub(addressService, 'lookupByZip').resolves([]);
      const res = await request.post('/api/address/lookup-by-zip')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({ zip: '62704' });
      assert.strictEqual(res.status, 200);
    });

    it('should allow support-admin access', async () => {
      sandbox.stub(addressService, 'lookupByZip').resolves([]);
      const res = await request.post('/api/address/lookup-by-zip')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .send({ zip: '62704' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/address/lookup-by-zip').send({ zip: '62704' });
      assert.strictEqual(res.status, 401);
    });

    it('should return 400 for missing zip', async () => {
      const res = await request.post('/api/address/lookup-by-zip')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({});
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 for zip too short', async () => {
      const res = await request.post('/api/address/lookup-by-zip')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ zip: '12' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/address/lookup-by-city', () => {
    it('should return states for valid city (partner-admin)', async () => {
      const mockResults = [{ state: 'Illinois', country: 'US' }, { state: 'Missouri', country: 'US' }];
      sandbox.stub(addressService, 'lookupByCity').resolves(mockResults);
      const res = await request.post('/api/address/lookup-by-city')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ city: 'Springfield', country: 'us' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 2);
    });

    it('should allow account-admin access', async () => {
      sandbox.stub(addressService, 'lookupByCity').resolves([]);
      const res = await request.post('/api/address/lookup-by-city')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({ city: 'Springfield' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/address/lookup-by-city').send({ city: 'Springfield' });
      assert.strictEqual(res.status, 401);
    });

    it('should return 400 for missing city', async () => {
      const res = await request.post('/api/address/lookup-by-city')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({});
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 for city too short', async () => {
      const res = await request.post('/api/address/lookup-by-city')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ city: 'AB' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/address/verify', () => {
    const validBody = { address_line1: '123 Main St', city: 'Springfield', state: 'IL', zip: '62704' };
    const mockResult = {
      verified: true, confidence: 'high',
      standardized_address: { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704-1234', country: 'US' },
      corrections: [{ field: 'zip', original: '62704', corrected: '62704-1234' }],
      provider: 'geoapify'
    };

    it('should return verified address (partner-admin)', async () => {
      sandbox.stub(addressService, 'verifyAddress').resolves(mockResult);
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send(validBody);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.verified, true);
      assert.strictEqual(res.body.data.confidence, 'high');
      assert.ok(res.body.data.standardized_address);
    });

    it('should allow account-admin access', async () => {
      sandbox.stub(addressService, 'verifyAddress').resolves(mockResult);
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send(validBody);
      assert.strictEqual(res.status, 200);
    });

    it('should allow support-admin access', async () => {
      sandbox.stub(addressService, 'verifyAddress').resolves(mockResult);
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .send(validBody);
      assert.strictEqual(res.status, 200);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/address/verify').send(validBody);
      assert.strictEqual(res.status, 401);
    });

    it('should return 400 when address_line1 is missing', async () => {
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ city: 'Springfield', state: 'IL', zip: '62704' });
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 when city is missing', async () => {
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ address_line1: '123 Main St', state: 'IL', zip: '62704' });
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 when state is missing', async () => {
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ address_line1: '123 Main St', city: 'Springfield', zip: '62704' });
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 when zip is missing', async () => {
      const res = await request.post('/api/address/verify')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ address_line1: '123 Main St', city: 'Springfield', state: 'IL' });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('POST /api/address/autocomplete', () => {
    const mockSuggestions = [
      { address_line1: '123 Main Street', address_line2: '', city: 'Springfield', state: 'Illinois', zip: '62704', country: 'US' }
    ];

    it('should return suggestions (partner-admin)', async () => {
      sandbox.stub(addressService, 'autocomplete').resolves(mockSuggestions);
      const res = await request.post('/api/address/autocomplete')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ query: '123 Main', country: 'us' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].address_line1, '123 Main Street');
    });

    it('should allow account-admin access', async () => {
      sandbox.stub(addressService, 'autocomplete').resolves([]);
      const res = await request.post('/api/address/autocomplete')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({ query: '123 Main' });
      assert.strictEqual(res.status, 200);
    });

    it('should allow support-admin access', async () => {
      sandbox.stub(addressService, 'autocomplete').resolves([]);
      const res = await request.post('/api/address/autocomplete')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .send({ query: '123 Main' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/address/autocomplete').send({ query: '123 Main' });
      assert.strictEqual(res.status, 401);
    });

    it('should return 400 for missing query', async () => {
      const res = await request.post('/api/address/autocomplete')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({});
      assert.strictEqual(res.status, 400);
    });

    it('should return 400 for query too short', async () => {
      const res = await request.post('/api/address/autocomplete')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ query: 'AB' });
      assert.strictEqual(res.status, 400);
    });
  });
});
