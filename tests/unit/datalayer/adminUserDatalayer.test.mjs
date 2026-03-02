import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { partnerUser, accountAdminUser, supportAdminUser } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const adminUserAdo = require('../../../ado/adminUserAdo');
const bcrypt = require('bcryptjs');
const adminUserDatalayer = require('../../../datalayer/adminUserDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('adminUserDatalayer', () => {
  it('listUsers — should pass through to ADO', async () => {
    const expected = { users: [partnerUser], total: 1, page: 1, limit: 20 };
    sandbox.stub(adminUserAdo, 'listUsers').resolves(expected);
    assert.deepStrictEqual(await adminUserDatalayer.listUsers(1, 1, 20, ''), expected);
  });

  describe('createUser', () => {
    it('should hash password and return user info', async () => {
      sandbox.stub(adminUserAdo, 'createUser').resolves(4);
      const result = await adminUserDatalayer.createUser(1, {
        username: 'newadmin', password: 'Test@123',
        email: 'new@ekam.local', firstName: 'New', lastName: 'Admin', role: 'account-admin'
      });
      assert.strictEqual(result.id, 4);
      assert.strictEqual(result.username, 'newadmin');
      const hashArg = adminUserAdo.createUser.firstCall.args[2];
      assert.notStrictEqual(hashArg, 'Test@123');
      assert.ok(await bcrypt.compare('Test@123', hashArg));
    });
  });

  describe('updateUser', () => {
    it('should update and return user', async () => {
      sandbox.stub(adminUserAdo, 'updateUser').resolves(true);
      sandbox.stub(adminUserAdo, 'getUserById').resolves(accountAdminUser);
      const result = await adminUserDatalayer.updateUser(2, 1, { email: 'updated@ekam.local' });
      assert.deepStrictEqual(result, accountAdminUser);
    });

    it('should return null when update fails', async () => {
      sandbox.stub(adminUserAdo, 'updateUser').resolves(false);
      const result = await adminUserDatalayer.updateUser(999, 1, { email: 'x@x.com' });
      assert.strictEqual(result, null);
    });
  });

  it('toggleUserStatus — should pass through', async () => {
    sandbox.stub(adminUserAdo, 'toggleUserStatus').resolves(true);
    assert.strictEqual(await adminUserDatalayer.toggleUserStatus(2, 1, 0), true);
  });

  it('getUserById — should pass through', async () => {
    sandbox.stub(adminUserAdo, 'getUserById').resolves(supportAdminUser);
    assert.deepStrictEqual(await adminUserDatalayer.getUserById(3, 1), supportAdminUser);
  });

  describe('resetPassword', () => {
    it('should hash new password and call ADO', async () => {
      sandbox.stub(adminUserAdo, 'resetPassword').resolves(true);
      const result = await adminUserDatalayer.resetPassword(2, 1, 'NewPass@123');
      assert.strictEqual(result, true);
      const hashArg = adminUserAdo.resetPassword.firstCall.args[2];
      assert.notStrictEqual(hashArg, 'NewPass@123');
      assert.ok(await bcrypt.compare('NewPass@123', hashArg));
    });

    it('should return false when user not found', async () => {
      sandbox.stub(adminUserAdo, 'resetPassword').resolves(false);
      assert.strictEqual(await adminUserDatalayer.resetPassword(999, 1, 'pass'), false);
    });
  });
});
