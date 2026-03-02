# Partner Admin — Database Scripts

> All SQL scripts for the Partner Admin module. Extracted from the live `matrimony_services` database.

## Execution Order

Run scripts in numbered order on a fresh database or to rebuild the partner-admin schema:

| # | File | Description |
|---|------|-------------|
| 01 | `01-tables.sql` | 6 tables: `partner_admin_users`, `partner_admin_audit_log`, `partner_admin_error_codes`, `partner_admin_error_log`, `partner_admin_activity_log`, `partner_brand_config` |
| 02 | `02-sp-utility.sql` | 3 helper SPs: `log_error`, `log_api_error`, `log_activity` — **must run first**, used by all other SPs |
| 03 | `03-sp-auth.sql` | 7 SPs: API client lookup, partner user auth, last login update, domain listing, login history |
| 04 | `04-sp-dashboard.sql` | 6 SPs: profile/payment/activity/views/account metrics, recent activities |
| 05 | `05-sp-profiles.sql` | 18 SPs: list, get, create (account + profile + login), update, toggle status, sub-sections (address, education, employment, family, photos, lifestyle, hobbies, property, favorites, views), lookups |
| 06 | `06-sp-partner.sql` | 7 SPs: partner info, domain links, all partners, countries, states |
| 07 | `07-sp-admin-users.sql` | 6 SPs: list, get by ID, create, update, toggle status, reset password |
| 08 | `08-sp-audit.sql` | 2 SPs: insert audit log, get audit logs (with filters + pagination) |
| 09 | `09-sp-background-check.sql` | 2 SPs: get profile for check, log background check request |
| 10 | `10-sp-brand-config.sql` | 2 SPs: get brand config, upsert brand config |
| 11 | `11-seed-error-codes.sql` | 121 error codes — uses `ON DUPLICATE KEY UPDATE` (safe to re-run) |
| 12 | `12-seed-test-users.sql` | 3 test users + default brand config for partner_id=1 (safe to re-run) |
| 13 | `13-sp-accounts.sql` | 7 SPs: 3 new `partner_admin_*` + 4 existing `eb_*` for account management (see details below) |

> **Note:** `06-sp-accounts.sql` is a legacy placeholder — all account SPs are in `13-sp-accounts.sql`.

## Summary

| Category | Count |
|----------|-------|
| Tables | 6 |
| Stored Procedures (partner_admin_*) | 57 |
| Stored Procedures (existing eb_* reused) | 4 |
| Error Codes | 121 |
| Seed Users | 3 |

## 13-sp-accounts.sql — Account Management SPs

### Section A — New `partner_admin_*` SPs (3)

| SP | Params | Used By | Description |
|----|--------|---------|-------------|
| `partner_admin_get_accounts_by_partner` | 5 (partner_id, page, limit, search, status) | `POST /api/accounts/list` | Paginated list with search/status filter, profile count per account |
| `partner_admin_get_account_by_id` | 1 (account_id) | `POST /api/accounts/detail` | Single account + login status + profiles list |
| `partner_admin_soft_delete_account` | 3 (account_id, deleted_user, deleted_reason) | `POST /api/accounts/delete` | Soft-delete: sets `is_deleted=1`, deactivates account + login |

### Section B — Existing `eb_*` SPs Reused (4)

These pre-exist in the `matrimony_services` database. Included in the script for reference and to ensure they are present on a fresh setup.

| SP | Params | Used By | Description |
|----|--------|---------|-------------|
| `eb_account_login_create` | 23 | `POST /api/accounts/create` | Creates account + login in one TX. Auto-generates `account_code`. Uses email as login username. Validates email, password, name, age ≥ 20, duplicate email/phone. Links to partner via `p_partner_id`. |
| `eb_account_update` | 20 | `POST /api/accounts/update` | Updates account fields using `COALESCE` (null = no change). Identifies account by `account_code` + `email`. |
| `eb_enable_disable_account` | 4 | `POST /api/accounts/toggle-status` | Toggles account + login active status. Sets activation/deactivation dates and reasons. |
| `get_accountDetails` | 1 | _(reference only)_ | Gets full account details by email. Not directly called by admin routes (admin uses `partner_admin_get_account_by_id` instead). |

## Notes

- All new SPs use the `partner_admin_` prefix.
- The account module also reuses 4 existing `eb_*` / `get_*` SPs (see above). These use `common_log_error` and `common_log_activity` instead of `partner_admin_log_error`.
- Write SPs (create, update, toggle, reset, delete) include `TRANSACTION`, `EXIT HANDLER`, and `SIGNAL SQLSTATE '45000'` for validation.
- Read SPs include `SQLEXCEPTION` handlers that log to `partner_admin_error_log` via `partner_admin_log_error`.
- The Node.js API uses `partner_admin_log_api_error` (9-param) for fire-and-forget error logging from the Express error handler middleware.
- Seed scripts use `ON DUPLICATE KEY UPDATE` so they are idempotent and safe to re-run.

## Test Users (partner_id = 1)

| Username | Password | Role |
|----------|----------|------|
| partneradmin | Partner@123 | partner-admin |
| accountadmin | Account@123 | account-admin |
| supportadmin | Support@123 | support-admin |
