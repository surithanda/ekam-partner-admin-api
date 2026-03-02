import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { apiClient, partnerUser, partnerDomains } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

// Stub pool before requiring ADO
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const authAdo = require('../../../ado/authAdo');

afterEach(() => pool.query.reset());

describe('authAdo', () => {
  describe('getApiClientByKey', () => {
    it('should return api client for valid key', async () => {
      pool.query.resolves([[[apiClient]]]);
      const result = await authAdo.getApiClientByKey('test-api-key-123');
      assert.deepStrictEqual(result, apiClient);
      assert.ok(pool.query.calledWith('CALL partner_admin_get_api_client_by_key(?)', ['test-api-key-123']));
    });

    it('should return null for unknown key', async () => {
      pool.query.resolves([[[]]]);
      const result = await authAdo.getApiClientByKey('bad-key');
      assert.strictEqual(result, null);
    });
  });

  describe('getPartnerDomains', () => {
    it('should return array of domains', async () => {
      pool.query.resolves([[partnerDomains]]);
      const result = await authAdo.getPartnerDomains();
      assert.deepStrictEqual(result, partnerDomains);
    });
  });

  describe('getPartnerUser', () => {
    it('should return user by username and partnerId', async () => {
      pool.query.resolves([[[partnerUser]]]);
      const result = await authAdo.getPartnerUser('partneradmin', 1);
      assert.deepStrictEqual(result, partnerUser);
      assert.ok(pool.query.calledWith('CALL partner_admin_get_partner_user(?, ?)', ['partneradmin', 1]));
    });

    it('should return null for unknown user', async () => {
      pool.query.resolves([[[]]]);
      const result = await authAdo.getPartnerUser('nobody', 1);
      assert.strictEqual(result, null);
    });
  });

  describe('updateLastLogin', () => {
    it('should call stored procedure', async () => {
      pool.query.resolves([[]]);
      await authAdo.updateLastLogin(1);
      assert.ok(pool.query.calledWith('CALL partner_admin_update_last_login(?)', [1]));
    });
  });
});
