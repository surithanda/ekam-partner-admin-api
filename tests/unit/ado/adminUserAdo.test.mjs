import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { partnerUser, accountAdminUser, supportAdminUser } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const adminUserAdo = require('../../../ado/adminUserAdo');

afterEach(() => pool.query.reset());

describe('adminUserAdo', () => {
  describe('listUsers', () => {
    it('should return users with total count', async () => {
      pool.query.resolves([[[{ total: 3 }], [partnerUser, accountAdminUser, supportAdminUser]]]);
      const result = await adminUserAdo.listUsers(1, 1, 20, '');
      assert.strictEqual(result.total, 3);
      assert.strictEqual(result.users.length, 3);
    });

    it('should pass null for empty search', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      await adminUserAdo.listUsers(1, 1, 20, '');
      assert.ok(pool.query.calledWith('CALL partner_admin_list_users(?, ?, ?, ?)', [1, 1, 20, null]));
    });
  });

  describe('createUser', () => {
    it('should return insert id', async () => {
      pool.query.resolves([[[{ insertId: 4 }]]]);
      const result = await adminUserAdo.createUser(1, 'newadmin', 'hash', 'new@ekam.local', 'New', 'Admin', 'account-admin');
      assert.strictEqual(result, 4);
    });
  });

  describe('updateUser', () => {
    it('should return true when rows affected', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await adminUserAdo.updateUser(2, 1, 'updated@ekam.local', 'Updated', 'User', 'support-admin');
      assert.strictEqual(result, true);
    });

    it('should return false when no rows affected', async () => {
      pool.query.resolves([[[{ affected: 0 }]]]);
      const result = await adminUserAdo.updateUser(999, 1, 'x@x.com', 'X', 'Y', 'account-admin');
      assert.strictEqual(result, false);
    });
  });

  describe('toggleUserStatus', () => {
    it('should return true when toggled', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await adminUserAdo.toggleUserStatus(2, 1, 0);
      assert.strictEqual(result, true);
    });
  });

  describe('getUserById', () => {
    it('should return user', async () => {
      pool.query.resolves([[[accountAdminUser]]]);
      const result = await adminUserAdo.getUserById(2, 1);
      assert.deepStrictEqual(result, accountAdminUser);
    });

    it('should return null for unknown user', async () => {
      pool.query.resolves([[[]]]);
      const result = await adminUserAdo.getUserById(999, 1);
      assert.strictEqual(result, null);
    });
  });

  describe('resetPassword', () => {
    it('should return true on success', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await adminUserAdo.resetPassword(2, 1, 'newhash');
      assert.strictEqual(result, true);
      assert.ok(pool.query.calledWith('CALL partner_admin_reset_user_password(?, ?, ?)', [2, 1, 'newhash']));
    });

    it('should return false when user not found', async () => {
      pool.query.resolves([[[{ affected: 0 }]]]);
      const result = await adminUserAdo.resetPassword(999, 1, 'newhash');
      assert.strictEqual(result, false);
    });
  });
});
