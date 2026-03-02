Account Management Feature Plan
Add standalone account CRUD to the partner admin portal, separating account creation from profile creation so that accounts (with login) are created first and profiles are then attached to them. Maximizes reuse of existing eb_* SPs.

Current State
Entity	Table	Key FK
Account	account (39 cols)	registered_partner_id → partner
Login	login (11 cols)	account_id → account
Profile	profile_personal (37 cols)	account_id → account
Problem: Account + Login creation is embedded inside profileDatalayer.createProfile(). No way to list, view, update, or delete accounts independently.

Existing SPs to Reuse
SP	Purpose	Params	Returns
eb_account_login_create	Create account + login in one TX, auto-generates account_code, uses email as username	23 (email, pwd, name, phone, address, partner_id, etc.)	account_id, account_code, email
eb_account_update	Update account fields (COALESCE null-safe)	20 (identifies by account_code + email)	affected_rows, status
eb_enable_disable_account	Toggle account + login status, sets activation/deactivation dates	4 (account_id, is_active, reason, modified_user)	account_id, message
get_accountDetails	Get single account by email	1 (email_id)	All account columns
eb_login_validate	Customer login validation with OTP	6	Not needed for admin portal
New SPs Needed (06-sp-accounts.sql)
Only 3 new SPs — everything else is covered by existing:

SP Name	Purpose
partner_admin_get_accounts_by_partner	Paginated list with search/status filter, scoped by registered_partner_id, includes profile count per account
partner_admin_get_account_by_id	Single account + login status + profile count, looked up by account_id (existing get_accountDetails uses email, not ID)
partner_admin_soft_delete_account	Soft-delete (is_deleted=1, deleted_date, deleted_user, deleted_reason)
What Changes
1. Backend — New Files
File	Contents
ado/accountAdo.js	DB calls: 3 new SPs + wrappers for eb_account_login_create, eb_account_update, eb_enable_disable_account, get_accountDetails
datalayer/accountDatalayer.js	Business logic + partner ownership verification
controllers/accountController.js	Request handling — extract params, call datalayer
routes/accountRoutes.js	/api/accounts/* routes with role-based auth
API Routes (all POST, auth required):

Route	Roles	Action	SP Used
/api/accounts/list	all 3 roles	Paginated list for partner	partner_admin_get_accounts_by_partner (new)
/api/accounts/detail	all 3 roles	Get account + profiles	partner_admin_get_account_by_id (new)
/api/accounts/create	partner-admin, support-admin	Create account + login	eb_account_login_create (existing)
/api/accounts/update	partner-admin, support-admin	Update account fields	eb_account_update (existing)
/api/accounts/toggle-status	partner-admin, support-admin	Enable/disable	eb_enable_disable_account (existing)
/api/accounts/delete	partner-admin	Soft delete	partner_admin_soft_delete_account (new)
2. Backend — Refactor Existing Code
profileDatalayer.createProfile() — Accept optional account_id. If provided, skip account creation and attach profile directly. If not provided, keep current combined flow.
server.js — Mount accountRoutes at /api/accounts.
3. Backend Tests
Test File	Coverage
tests/unit/ado/accountAdo.test.mjs	All ADO methods
tests/unit/datalayer/accountDatalayer.test.mjs	Business logic, ownership verification
tests/unit/controllers/accountController.test.mjs	Request parsing, response formatting
4. Frontend — API Client (api.ts)
New methods: getAccounts, getAccountDetail, createAccount, updateAccount, toggleAccountStatus, deleteAccount

5. Frontend — New UI Pages
Page	Description
/accounts (list)	Paginated table with search, status filter, profile count column. Actions: View, Edit, Toggle, Delete.
/accounts/[id] (detail)	Account info card (editable inline) + Login info + Profiles list with "Add Profile" button
/accounts/create	Form: name, email, phone, DOB, gender, address + password (email used as username per eb_account_login_create)
6. Frontend — Modifications
File	Change
sidebarMenu.ts	Add "Accounts" + "Create Account" items before Profiles
/profiles/create/page.tsx	Add account selector — pick existing account, account_id sent with profile data
/profiles/page.tsx	Add "Account" column linking to /accounts/[id]
7. Sidebar Menu (Updated Order)
Dashboard → Accounts → Create Account → Profiles → Create Profile → Background Check → ...
Implementation Order
Step	Layer	Est. Effort
Step 1	DB: Write 06-sp-accounts.sql (3 new SPs only)	~120 lines
Step 2	Backend: accountAdo.js + tests	~200 lines
Step 3	Backend: accountDatalayer.js + tests	~180 lines
Step 4	Backend: accountController.js + accountRoutes.js + tests	~220 lines
Step 5	Backend: Mount routes in server.js, refactor profileDatalayer.createProfile	~30 lines
Step 6	Frontend: API client methods in api.ts	~25 lines
Step 7	Frontend: /accounts list page	~250 lines
Step 8	Frontend: /accounts/[id] detail page	~300 lines
Step 9	Frontend: /accounts/create page	~200 lines
Step 10	Frontend: Update sidebar, profile list, profile create flow	~80 lines
Step 11	Update requirements doc (profile-management-plan.md)	~100 lines
Total: ~11 steps, ~1,700 lines

Key Design Decisions
Account owns Login (1:1, mandatory): eb_account_login_create creates both in one TX. Email is used as username. Password is required.
Account owns Profiles: One account → many profiles (1:N via profile_personal.account_id).
Partner scoping: account.registered_partner_id set on create. Ownership verified in datalayer.
Maximize existing SP reuse: Only 3 new SPs needed. eb_account_login_create, eb_account_update, eb_enable_disable_account, get_accountDetails are all reused.
Soft delete: New partner_admin_soft_delete_account sets is_deleted=1 — does NOT cascade-delete profiles.
Profile create refactor: Profile creation accepts optional account_id. Old combined flow preserved as fallback.
No breaking changes: Existing profile CRUD, tests, and UI remain functional.

## Implementation Status (COMPLETED)

### Backend
- `partner-admin-dbscripts/06-sp-accounts.sql` — 3 new SPs created and deployed
- `ado/accountAdo.js` — 6 methods (list, get, create, update, toggle, delete)
- `datalayer/accountDatalayer.js` — 5 methods with partner ownership verification
- `controllers/accountController.js` — 6 endpoints
- `routes/accountRoutes.js` — 6 routes mounted at /api/accounts
- `server.js` — accountRoutes mounted
- `profileDatalayer.createProfile()` — refactored to accept optional account_id
- `partner-admin-dbscripts/11-seed-error-codes.sql` — 12 new account error codes added

### Backend Tests (35 new, all passing)
- `tests/unit/ado/accountAdo.test.mjs` — 12 tests
- `tests/unit/datalayer/accountDatalayer.test.mjs` — 13 tests
- `tests/unit/controllers/accountController.test.mjs` — 10 tests

### Frontend
- `src/lib/api.ts` — 6 new account API methods
- `src/app/(admin)/accounts/page.tsx` — Accounts list with search, status filter, pagination
- `src/app/(admin)/accounts/[id]/page.tsx` — Account detail with inline edit + profiles list
- `src/app/(admin)/accounts/create/page.tsx` — Create account form (email as login username)
- `src/components/layout/variants/sidebarMenu.ts` — Accounts + Create Account menu items added
- `src/app/(admin)/profiles/page.tsx` — Account column added linking to account detail
- `src/app/(admin)/profiles/create/page.tsx` — Accepts ?account_id query param for linking