import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const accountAdo = require('../../../ado/accountAdo');
const accountDatalayer = require('../../../datalayer/accountDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

const mockAccount = { account_id: 5, account_code: 'EKM1001', email: 'test@test.com', first_name: 'John', last_name: 'Doe', registered_partner_id: 1 };
const mockProfile = { profile_id: 10, first_name: 'Jane', last_name: 'Doe' };

describe('accountDatalayer', () => {

  describe('getAccounts', () => {
    it('should pass through to ADO', async () => {
      const expected = { accounts: [mockAccount], total: 1, page: 1, limit: 20 };
      sandbox.stub(accountAdo, 'getAccountsByPartner').resolves(expected);
      const result = await accountDatalayer.getAccounts(1, 1, 20, '', null);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('getAccountDetail', () => {
    it('should return account and profiles for matching partner', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: mockAccount, profiles: [mockProfile] });
      const result = await accountDatalayer.getAccountDetail(5, 1);
      assert.deepStrictEqual(result.account, mockAccount);
      assert.deepStrictEqual(result.profiles, [mockProfile]);
    });

    it('should throw when account not found', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: null, profiles: [] });
      await assert.rejects(() => accountDatalayer.getAccountDetail(999, 1),
        err => err.errorCode === 'PA_ACGT_100_NOT_FOUND');
    });

    it('should throw when partner mismatch', async () => {
      const wrongPartner = { ...mockAccount, registered_partner_id: 2 };
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: wrongPartner, profiles: [] });
      await assert.rejects(() => accountDatalayer.getAccountDetail(5, 1),
        err => err.errorCode === 'PA_ACGT_300_ACCESS_DENIED');
    });
  });

  describe('createAccount', () => {
    it('should set partner_id and delegate to ADO', async () => {
      sandbox.stub(accountAdo, 'createAccountWithLogin').resolves({ account_id: 201, account_code: 'EKM1001', email: 'new@test.com' });
      const result = await accountDatalayer.createAccount({ email: 'new@test.com', password: 'Pass@123', first_name: 'New', last_name: 'User', birth_date: '2000-01-01', gender: 1, primary_phone: '123' }, 1);
      assert.strictEqual(result.account_id, 201);
      assert.ok(accountAdo.createAccountWithLogin.calledOnce);
      assert.strictEqual(accountAdo.createAccountWithLogin.firstCall.args[0].partner_id, 1);
    });
  });

  describe('updateAccount', () => {
    it('should verify ownership and delegate to ADO', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: mockAccount, profiles: [] });
      sandbox.stub(accountAdo, 'updateAccount').resolves(true);
      const result = await accountDatalayer.updateAccount(5, { first_name: 'Updated' }, 1);
      assert.strictEqual(result, true);
    });

    it('should throw for partner mismatch', async () => {
      const wrongPartner = { ...mockAccount, registered_partner_id: 2 };
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: wrongPartner, profiles: [] });
      await assert.rejects(() => accountDatalayer.updateAccount(5, { first_name: 'X' }, 1),
        err => err.errorCode === 'PA_ACGT_300_ACCESS_DENIED');
    });

    it('should throw when account not found', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: null, profiles: [] });
      await assert.rejects(() => accountDatalayer.updateAccount(999, {}, 1),
        err => err.errorCode === 'PA_ACGT_100_NOT_FOUND');
    });
  });

  describe('toggleAccountStatus', () => {
    it('should verify ownership and delegate to ADO', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: mockAccount, profiles: [] });
      sandbox.stub(accountAdo, 'toggleAccountStatus').resolves(5);
      const result = await accountDatalayer.toggleAccountStatus(5, 0, 'testing', 1, 'admin');
      assert.strictEqual(result, 5);
    });

    it('should throw for partner mismatch', async () => {
      const wrongPartner = { ...mockAccount, registered_partner_id: 2 };
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: wrongPartner, profiles: [] });
      await assert.rejects(() => accountDatalayer.toggleAccountStatus(5, 0, 'test', 1, 'admin'),
        err => err.errorCode === 'PA_ACGT_300_ACCESS_DENIED');
    });
  });

  describe('deleteAccount', () => {
    it('should verify ownership and delegate to ADO', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: mockAccount, profiles: [] });
      sandbox.stub(accountAdo, 'softDeleteAccount').resolves(5);
      const result = await accountDatalayer.deleteAccount(5, 1, 'admin', 'no longer needed');
      assert.strictEqual(result, 5);
    });

    it('should throw for partner mismatch', async () => {
      const wrongPartner = { ...mockAccount, registered_partner_id: 2 };
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: wrongPartner, profiles: [] });
      await assert.rejects(() => accountDatalayer.deleteAccount(5, 1, 'admin', 'test'),
        err => err.errorCode === 'PA_ACGT_300_ACCESS_DENIED');
    });

    it('should throw when account not found', async () => {
      sandbox.stub(accountAdo, 'getAccountById').resolves({ account: null, profiles: [] });
      await assert.rejects(() => accountDatalayer.deleteAccount(999, 1, 'admin', 'test'),
        err => err.errorCode === 'PA_ACGT_100_NOT_FOUND');
    });
  });
});
