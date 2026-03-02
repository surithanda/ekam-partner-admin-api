import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { profilePersonal, profileForCheck } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const backgroundCheckAdo = require('../../../ado/backgroundCheckAdo');
const profileAdo = require('../../../ado/profileAdo');
const backgroundCheckDatalayer = require('../../../datalayer/backgroundCheckDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('backgroundCheckDatalayer', () => {
  describe('getProfileForCheck', () => {
    it('should return profile when ownership matches', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(profilePersonal);
      sandbox.stub(backgroundCheckAdo, 'getProfileForCheck').resolves(profileForCheck);
      const result = await backgroundCheckDatalayer.getProfileForCheck(101, 1);
      assert.deepStrictEqual(result, profileForCheck);
    });

    it('should throw for partner mismatch', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves({ ...profilePersonal, registered_partner_id: 2 });
      await assert.rejects(() => backgroundCheckDatalayer.getProfileForCheck(101, 1),
        err => err.errorCode === 'PA_BCGT_300_ACCESS_DENIED');
    });

    it('should throw for unknown profile', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(null);
      await assert.rejects(() => backgroundCheckDatalayer.getProfileForCheck(999, 1),
        err => err.errorCode === 'PA_BCGT_100_NOT_FOUND');
    });
  });

  describe('initiateBackgroundCheck', () => {
    it('should initiate check for valid profile', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(profilePersonal);
      sandbox.stub(backgroundCheckAdo, 'logBackgroundCheckRequest').resolves();
      const result = await backgroundCheckDatalayer.initiateBackgroundCheck(101, 'identity', 'partneradmin', 'notes', 1);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.checkType, 'identity');
      assert.strictEqual(result.status, 'initiated');
    });

    it('should throw for partner mismatch', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves({ ...profilePersonal, registered_partner_id: 2 });
      await assert.rejects(() => backgroundCheckDatalayer.initiateBackgroundCheck(101, 'identity', 'admin', null, 1),
        err => err.errorCode === 'PA_BCIN_300_ACCESS_DENIED');
    });

    it('should throw for unknown profile', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(null);
      await assert.rejects(() => backgroundCheckDatalayer.initiateBackgroundCheck(999, 'identity', 'admin', null, 1),
        err => err.errorCode === 'PA_BCIN_100_NOT_FOUND');
    });
  });
});
