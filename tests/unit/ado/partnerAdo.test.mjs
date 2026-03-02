import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { partnerInfo, partnerDomainLinks, countries, states } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const partnerAdo = require('../../../ado/partnerAdo');

afterEach(() => pool.query.reset());

describe('partnerAdo', () => {
  describe('getPartnerById', () => {
    it('should return partner info', async () => {
      pool.query.resolves([[[partnerInfo]]]);
      const result = await partnerAdo.getPartnerById(1);
      assert.deepStrictEqual(result, partnerInfo);
    });

    it('should return null for unknown partner', async () => {
      pool.query.resolves([[[]]]);
      const result = await partnerAdo.getPartnerById(999);
      assert.strictEqual(result, null);
    });
  });

  describe('getPartnerByApiClient', () => {
    it('should return partner by api client id', async () => {
      pool.query.resolves([[[partnerInfo]]]);
      const result = await partnerAdo.getPartnerByApiClient(1);
      assert.deepStrictEqual(result, partnerInfo);
    });
  });

  describe('getAllPartners', () => {
    it('should return all partners', async () => {
      pool.query.resolves([[[partnerInfo]]]);
      const result = await partnerAdo.getAllPartners();
      assert.deepStrictEqual(result, [partnerInfo]);
    });
  });

  describe('getPartnerDomainLinks', () => {
    it('should return domain links', async () => {
      pool.query.resolves([[[partnerDomainLinks]]]);
      const result = await partnerAdo.getPartnerDomainLinks(1);
      assert.deepStrictEqual(result, partnerDomainLinks);
    });
  });

  describe('getCountries', () => {
    it('should return countries list', async () => {
      pool.query.resolves([[countries]]);
      const result = await partnerAdo.getCountries();
      assert.deepStrictEqual(result, countries);
    });
  });

  describe('getStates', () => {
    it('should return states for a country', async () => {
      pool.query.resolves([[states]]);
      const result = await partnerAdo.getStates(1);
      assert.deepStrictEqual(result, states);
      assert.ok(pool.query.calledWith('CALL partner_admin_get_states(?)', [1]));
    });
  });
});
