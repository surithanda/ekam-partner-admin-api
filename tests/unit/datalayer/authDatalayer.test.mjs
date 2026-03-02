import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { apiClient, apiClientInactive, partnerUser, brandConfigFormatted, partnerDomains } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

process.env.JWT_SECRET = 'test-secret';

// Stub dependencies before requiring
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const authAdo = require('../../../ado/authAdo');
const brandConfigDatalayer = require('../../../datalayer/brandConfigDatalayer');
const authDatalayer = require('../../../datalayer/authDatalayer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
  pool.query.reset();
});

describe('authDatalayer', () => {
  describe('login', () => {
    it('should throw for invalid API key', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(null);
      await assert.rejects(() => authDatalayer.login('user', 'pass', 'bad-key'),
        err => err.errorCode === 'PA_AULG_100_INVALID_API_KEY');
    });

    it('should throw for inactive API client', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(apiClientInactive);
      await assert.rejects(() => authDatalayer.login('user', 'pass', 'key'),
        err => err.errorCode === 'PA_AULG_200_API_CLIENT_INACTIVE');
    });

    it('should throw when no partner linked', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves({ ...apiClient, partner_id: null });
      await assert.rejects(() => authDatalayer.login('user', 'pass', 'key'),
        err => err.errorCode === 'PA_AULG_201_NO_PARTNER_LINKED');
    });

    it('should throw for unknown username', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(apiClient);
      sandbox.stub(authAdo, 'getPartnerUser').resolves(null);
      await assert.rejects(() => authDatalayer.login('nobody', 'pass', 'key'),
        err => err.errorCode === 'PA_AULG_202_INVALID_CREDENTIALS');
    });

    it('should throw for wrong password', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(apiClient);
      const hash = await bcrypt.hash('correct', 10);
      sandbox.stub(authAdo, 'getPartnerUser').resolves({ ...partnerUser, password_hash: hash });
      await assert.rejects(() => authDatalayer.login('partneradmin', 'wrong', 'key'),
        err => err.errorCode === 'PA_AULG_202_INVALID_CREDENTIALS');
    });

    it('should return success with token and brand config', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(apiClient);
      const hash = await bcrypt.hash('Partner@123', 10);
      sandbox.stub(authAdo, 'getPartnerUser').resolves({ ...partnerUser, password_hash: hash });
      sandbox.stub(authAdo, 'updateLastLogin').resolves();
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(brandConfigFormatted);

      const result = await authDatalayer.login('partneradmin', 'Partner@123', 'test-api-key-123');

      assert.strictEqual(result.success, true);
      assert.ok(result.token);
      assert.strictEqual(result.user.username, 'partneradmin');
      assert.strictEqual(result.user.role, 'partner-admin');
      assert.deepStrictEqual(result.brandConfig, brandConfigFormatted);

      const decoded = jwt.verify(result.token, 'test-secret');
      assert.strictEqual(decoded.userId, 1);
      assert.strictEqual(decoded.partnerId, 1);
    });

    it('should return null brandConfig if partner has none', async () => {
      sandbox.stub(authAdo, 'getApiClientByKey').resolves(apiClient);
      const hash = await bcrypt.hash('pass', 10);
      sandbox.stub(authAdo, 'getPartnerUser').resolves({ ...partnerUser, password_hash: hash });
      sandbox.stub(authAdo, 'updateLastLogin').resolves();
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(null);

      const result = await authDatalayer.login('partneradmin', 'pass', 'key');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.brandConfig, null);
    });
  });

  describe('getPartnerDomains', () => {
    it('should return domains from ADO', async () => {
      sandbox.stub(authAdo, 'getPartnerDomains').resolves(partnerDomains);
      const result = await authDatalayer.getPartnerDomains();
      assert.deepStrictEqual(result, partnerDomains);
    });
  });
});
