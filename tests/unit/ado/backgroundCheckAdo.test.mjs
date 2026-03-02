import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { profileForCheck } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const backgroundCheckAdo = require('../../../ado/backgroundCheckAdo');

afterEach(() => pool.query.reset());

describe('backgroundCheckAdo', () => {
  describe('getProfileForCheck', () => {
    it('should return profile data for check', async () => {
      pool.query.resolves([[[profileForCheck]]]);
      const result = await backgroundCheckAdo.getProfileForCheck(101);
      assert.deepStrictEqual(result, profileForCheck);
    });

    it('should return null for unknown profile', async () => {
      pool.query.resolves([[[]]]);
      const result = await backgroundCheckAdo.getProfileForCheck(999);
      assert.strictEqual(result, null);
    });
  });

  describe('logBackgroundCheckRequest', () => {
    it('should call stored procedure with params', async () => {
      pool.query.resolves([[]]);
      await backgroundCheckAdo.logBackgroundCheckRequest(101, 'identity', 'partneradmin', 'Test notes');
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_log_background_check_request(?, ?, ?, ?)',
        [101, 'identity', 'partneradmin', 'Test notes']
      ));
    });

    it('should pass null for empty notes', async () => {
      pool.query.resolves([[]]);
      await backgroundCheckAdo.logBackgroundCheckRequest(101, 'identity', 'partneradmin', null);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_log_background_check_request(?, ?, ?, ?)',
        [101, 'identity', 'partneradmin', null]
      ));
    });
  });
});
