import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { partnerInfo, partnerDomainLinks, countries, states, brandConfigFormatted, updateBrandConfigInput } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

// Stub audit middleware
require.cache[require.resolve('../../middleware/audit')] = {
  id: require.resolve('../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../middleware/audit')
};

const partnerDatalayer = require('../../datalayer/partnerDatalayer');
const brandConfigDatalayer = require('../../datalayer/brandConfigDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Partner API Integration', () => {
  describe('POST /api/partner/info', () => {
    it('should return partner info', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerInfo').resolves(partnerInfo);
      const res = await request.post('/api/partner/info').set('Authorization', `Bearer ${partnerAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.partner_name, 'Ekam Matrimony');
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/partner/info').send({});
      assert.strictEqual(res.status, 401);
    });
  });

  describe('POST /api/partner/domain-links', () => {
    it('should return domain links', async () => {
      sandbox.stub(partnerDatalayer, 'getPartnerDomainLinks').resolves(partnerDomainLinks);
      const res = await request.post('/api/partner/domain-links').set('Authorization', `Bearer ${partnerAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
    });
  });

  describe('POST /api/partner/countries', () => {
    it('should return countries', async () => {
      sandbox.stub(partnerDatalayer, 'getCountries').resolves(countries);
      const res = await request.post('/api/partner/countries').set('Authorization', `Bearer ${partnerAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, countries);
    });

    it('should allow account-admin to access countries', async () => {
      sandbox.stub(partnerDatalayer, 'getCountries').resolves(countries);
      const res = await request.post('/api/partner/countries').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, countries);
    });
  });

  describe('POST /api/partner/states', () => {
    it('should return states for country', async () => {
      sandbox.stub(partnerDatalayer, 'getStates').resolves(states);
      const res = await request.post('/api/partner/states').set('Authorization', `Bearer ${partnerAdminToken}`).send({ countryId: 1 });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, states);
    });

    it('should allow account-admin to access states', async () => {
      sandbox.stub(partnerDatalayer, 'getStates').resolves(states);
      const res = await request.post('/api/partner/states').set('Authorization', `Bearer ${accountAdminToken}`).send({ countryId: 1 });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, states);
    });
  });

  describe('POST /api/partner/brand-config', () => {
    it('should return brand config for any authenticated user', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(brandConfigFormatted);
      const res = await request.post('/api/partner/brand-config').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.templateId, 'modern');
    });
  });

  describe('POST /api/partner/brand-config/update', () => {
    it('should update brand config for partner-admin', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(brandConfigFormatted);
      sandbox.stub(brandConfigDatalayer, 'upsertBrandConfig').resolves({ ...brandConfigFormatted, templateId: 'classic' });
      const res = await request.post('/api/partner/brand-config/update').set('Authorization', `Bearer ${partnerAdminToken}`).send(updateBrandConfigInput);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/partner/brand-config/update').set('Authorization', `Bearer ${accountAdminToken}`).send(updateBrandConfigInput);
      assert.strictEqual(res.status, 403);
    });
  });
});
