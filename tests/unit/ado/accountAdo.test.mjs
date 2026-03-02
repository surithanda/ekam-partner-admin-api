import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const accountAdo = require('../../../ado/accountAdo');

afterEach(() => pool.query.reset());

describe('accountAdo', () => {

  // ── List Accounts ──

  describe('getAccountsByPartner', () => {
    it('should return accounts list with total', async () => {
      const mockAccount = { account_id: 1, email: 'test@example.com', first_name: 'John', last_name: 'Doe', profile_count: 2 };
      pool.query.resolves([[[{ total: 1 }], [mockAccount]]]);
      const result = await accountAdo.getAccountsByPartner(1, 1, 20);
      assert.strictEqual(result.total, 1);
      assert.deepStrictEqual(result.accounts, [mockAccount]);
    });

    it('should return empty when no accounts', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      const result = await accountAdo.getAccountsByPartner(1);
      assert.strictEqual(result.total, 0);
      assert.deepStrictEqual(result.accounts, []);
    });

    it('should call SP with correct params', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      await accountAdo.getAccountsByPartner(1, 2, 10, 'john', 1);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_get_accounts_by_partner(?, ?, ?, ?, ?)',
        [1, 2, 10, 'john', 1]
      ));
    });
  });

  // ── Get Account by ID ──

  describe('getAccountById', () => {
    it('should return account and profiles', async () => {
      const mockAccount = { account_id: 5, email: 'test@example.com', login_username: 'test@example.com', profile_count: 1 };
      const mockProfile = { profile_id: 10, first_name: 'Jane' };
      pool.query.resolves([[[mockAccount], [mockProfile]]]);
      const result = await accountAdo.getAccountById(5);
      assert.deepStrictEqual(result.account, mockAccount);
      assert.deepStrictEqual(result.profiles, [mockProfile]);
    });

    it('should return null account when not found', async () => {
      pool.query.resolves([[[]]]);
      const result = await accountAdo.getAccountById(999);
      assert.strictEqual(result.account, null);
    });
  });

  // ── Create Account + Login ──

  describe('createAccountWithLogin', () => {
    it('should call eb_account_login_create and return ids', async () => {
      pool.query.resolves([[[{ status: 'success', account_id: 201, account_code: 'EKM1001', email: 'new@test.com' }]]]);
      const result = await accountAdo.createAccountWithLogin({
        email: 'new@test.com', password: 'Pass@123', first_name: 'New', last_name: 'User',
        birth_date: '2000-01-01', gender: 1, primary_phone: '1234567890', partner_id: 1
      });
      assert.strictEqual(result.account_id, 201);
      assert.strictEqual(result.account_code, 'EKM1001');
      assert.strictEqual(result.email, 'new@test.com');
      assert.ok(pool.query.calledOnce);
    });

    it('should throw on SP failure', async () => {
      pool.query.resolves([[[{ status: 'fail', error_code: '45001', error_message: 'Email is required' }]]]);
      await assert.rejects(
        () => accountAdo.createAccountWithLogin({ email: '', password: 'x', first_name: 'A', last_name: 'B', birth_date: '2000-01-01', gender: 1, primary_phone: '123', partner_id: 1 }),
        (err) => err.message.includes('Email is required') || err.message.includes('45001')
      );
    });
  });

  // ── Update Account ──

  describe('updateAccount', () => {
    it('should return true when rows affected', async () => {
      pool.query.resolves([[[{ affected_rows: 1, status: 'success' }]]]);
      const result = await accountAdo.updateAccount({ account_code: 'EKM1001', email: 'test@test.com', first_name: 'Updated' });
      assert.strictEqual(result, true);
    });

    it('should return false when no rows affected', async () => {
      pool.query.resolves([[[{ affected_rows: 0, status: 'success' }]]]);
      const result = await accountAdo.updateAccount({ account_code: 'BAD', email: 'bad@test.com' });
      assert.strictEqual(result, false);
    });
  });

  // ── Toggle Account Status ──

  describe('toggleAccountStatus', () => {
    it('should call eb_enable_disable_account and return account_id', async () => {
      pool.query.resolves([[[{ account_id: 5, message: 'Account disabled successfully' }], [{ error_code: null, error_message: null }]]]);
      const result = await accountAdo.toggleAccountStatus(5, 0, 'testing', 'admin');
      assert.strictEqual(result, 5);
      assert.ok(pool.query.calledWith(
        'CALL eb_enable_disable_account(?, ?, ?, ?)',
        [5, 0, 'testing', 'admin']
      ));
    });
  });

  // ── Soft Delete Account ──

  describe('softDeleteAccount', () => {
    it('should call SP and return account_id on success', async () => {
      pool.query.resolves([[[{ status: 'success', account_id: 5 }]]]);
      const result = await accountAdo.softDeleteAccount(5, 'admin', 'no longer needed');
      assert.strictEqual(result, 5);
    });

    it('should throw when account not found', async () => {
      pool.query.resolves([[[{ status: 'fail', error_code: 'PA_ACDL_001_NOT_FOUND', error_message: 'Account not found or already deleted' }]]]);
      await assert.rejects(
        () => accountAdo.softDeleteAccount(999, 'admin', 'test'),
        (err) => err.message.includes('not found') || err.message.includes('PA_ACDL')
      );
    });
  });
});
