# EKam Admin API

Multi-tenant partner admin portal API built with **Express.js**, **MySQL**, and **JWT authentication**.

## Architecture

- **Zero raw SQL** — All database access is via MySQL stored procedures (`partner_admin_*` prefix)
- **POST-only** — Every endpoint uses HTTP POST. No data in URLs, query strings, or path parameters
- **JWT + API Key** — Dual-layer authentication for all protected endpoints
- **Role-based access (RBAC)** — `partner-admin`, `account-admin`, `support-admin` with middleware enforcement
- **Audit logging** — Every mutating action is tracked with before/after data for compliance and recovery
- **Layered design** — ADO → DataLayer → Controller → Route → Server

## Quick Start

```bash
# Install dependencies
npm install

# Start with nodemon (auto-reload)
npm run dev

# Start for production
npm start
```

## Environment Variables

Create a `.env` file (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | API server port |
| `DB_HOST` | `65.254.80.213` | MySQL host |
| `DB_USER` | `admin-test` | MySQL user |
| `DB_PASSWORD` | `January@2026` | MySQL password |
| `DB_NAME` | `matrimony_services` | MySQL database |
| `DB_PORT` | `3306` | MySQL port |
| `JWT_SECRET` | `ekam-admin-secret-2024` | JWT signing secret |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

## Dev Test Credentials

**Domain:** `MatrimonyServices.org` | **API Key:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

| Username | Password | Role | Access |
|----------|----------|------|--------|
| `partneradmin` | `Partner@123` | `partner-admin` | Full access — dashboard, profiles, background checks, settings, admin users, audit log |
| `accountadmin` | `Account@123` | `account-admin` | Dashboard, profiles (read-only) |
| `supportadmin` | `Support@123` | `support-admin` | Profiles (CRUD), background checks only |

### Role Access Matrix

| Endpoint | partner-admin | account-admin | support-admin |
|----------|:---:|:---:|:---:|
| Dashboard (metrics, activities) | ✅ | ✅ | ❌ |
| Profiles (list, detail, lookups) | ✅ | ✅ | ✅ |
| Profiles (create, update, toggle) | ✅ | ❌ | ✅ |
| Background Check | ✅ | ❌ | ✅ |
| Partner Info & Domains | ✅ | ❌ | ❌ |
| Settings (themes) | ✅ | ❌ | ❌ |
| Brand Config (get) | ✅ | ✅ | ✅ |
| Brand Config (update) | ✅ | ❌ | ❌ |
| Admin Users (list, create, update, toggle) | ✅ | ❌ | ❌ |
| Audit Log | ✅ | ❌ | ❌ |

## API Documentation (Swagger)

Once the server is running, open:

```
http://localhost:4000/api/docs
```

JSON spec available at:

```
http://localhost:4000/api/docs.json
```

## Test Commands (PowerShell)

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get
```

### Get Domains
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/domains" -Method Post -ContentType "application/json" -Body '{}'
```

### Login (partner-admin)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"partneradmin","password":"Partner@123","apiKey":"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"}'
```

### Dashboard Metrics (with token)
```powershell
$login = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"partneradmin","password":"Partner@123","apiKey":"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"}'

$token = $login.token

Invoke-RestMethod -Uri "http://localhost:4000/api/dashboard/metrics" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{}'
```

### List Profiles (with filters)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":5}'

# With status filter (1=active, 0=inactive)
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":5,"status":1}'

# With gender filter (lookup_table IDs: 9=Male, 10=Female, 11=Other)
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":5,"gender":9}'
```

### Get Profile Detail
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/profiles/detail" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"id":2}'
```

### Partner Info
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/partner/info" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{}'
```

### List Admin Users (partner-admin only)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/admin-users/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":10}'
```

### Create Admin User (partner-admin only)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/admin-users/create" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"username":"newadmin","password":"New@123","email":"new@test.com","firstName":"New","lastName":"Admin","role":"support-admin"}'
```

### View Audit Log (partner-admin only)
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/audit/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":20}'

# With filters
Invoke-RestMethod -Uri "http://localhost:4000/api/audit/list" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"page":1,"limit":20,"action":"admin_user.create","dateFrom":"2026-01-01"}'
```

## API Endpoints

All endpoints are `POST` only. Protected endpoints require `Authorization: Bearer <token>` header.

### Auth
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/auth/login` | No | — | Login with username, password, API key |
| `/api/auth/domains` | No | — | List active partner domains |
| `/api/auth/verify` | Yes | All | Verify JWT token |

### Dashboard
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/dashboard/metrics` | Yes | partner-admin, account-admin | Profile, payment, activity, view metrics |
| `/api/dashboard/activities` | Yes | partner-admin, account-admin | Recent activity log |

### Profiles
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/profiles/list` | Yes | All | Paginated profile list with search, status, gender filters |
| `/api/profiles/detail` | Yes | All | Full profile with all sub-tables |
| `/api/profiles/create` | Yes | partner-admin, support-admin | Create account + profile + login |
| `/api/profiles/update` | Yes | partner-admin, support-admin | Update profile (partial) |
| `/api/profiles/toggle-status` | Yes | partner-admin, support-admin | Activate/deactivate profile |
| `/api/profiles/lookups` | Yes | All | Lookup values by category (gender, religion, etc.) |

### Partner
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/partner/info` | Yes | partner-admin | Partner business details |
| `/api/partner/domain-links` | Yes | partner-admin | Partner domain & social links |
| `/api/partner/countries` | Yes | partner-admin, support-admin | Countries list |
| `/api/partner/states` | Yes | partner-admin, support-admin | States by country |

### Background Check
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/background-check/profile` | Yes | partner-admin, support-admin | Profile data for background check |
| `/api/background-check/initiate` | Yes | partner-admin, support-admin | Initiate a background check |

### Brand Config
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/partner/brand-config` | Yes | All | Get partner brand config (colors, fonts, logos, layout variants) |
| `/api/partner/brand-config/update` | Yes | partner-admin | Upsert partner brand config (persisted to DB) |

### Admin Users (partner-admin only)
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/admin-users/list` | Yes | partner-admin | List admin users with search |
| `/api/admin-users/create` | Yes | partner-admin | Create account-admin or support-admin user |
| `/api/admin-users/update` | Yes | partner-admin | Update admin user (email, name, role) |
| `/api/admin-users/toggle-status` | Yes | partner-admin | Activate/deactivate admin user |

### Audit Log (partner-admin only)
| Endpoint | Auth | Roles | Description |
|----------|------|-------|-------------|
| `/api/audit/list` | Yes | partner-admin | Query audit log with filters (action, username, entity, date range) |

## Audit Logging

Every significant action is recorded in `partner_admin_audit_log` with full context:

| Field | Description |
|-------|-------------|
| `action` | e.g. `auth.login`, `admin_user.create`, `admin_user.deactivate` |
| `entity_type` / `entity_id` | What was affected (e.g. `admin_user #4`) |
| `request_body` | Sanitized request payload (passwords replaced with `***`) |
| `previous_data` | State before the change (for updates/deletes) |
| `new_data` | State after the change |
| `username` / `user_role` | Who performed the action |
| `ip_address` / `user_agent` | Client context |

### Tracked Events

| Event | Trigger |
|-------|---------|
| `auth.login` | Successful login |
| `admin_user.create` | New admin user created |
| `admin_user.update` | Admin user details changed (before + after captured) |
| `admin_user.activate` | Admin user reactivated |
| `admin_user.deactivate` | Admin user deactivated |
| `brand_config.update` | Brand config changed (template, colors, fonts, logos, layout) |

## Stored Procedures

All database access uses `CALL partner_admin_*()` — no inline SQL in the API code.

| Module | Procedures |
|--------|-----------|
| **Auth** | `get_api_client_by_key`, `get_partner_domains`, `get_partner_user`, `update_last_login` |
| **Dashboard** | `get_profile_metrics`, `get_payment_metrics`, `get_activity_metrics`, `get_recent_activities`, `get_profile_views_metrics`, `get_account_metrics` |
| **Profile** | `get_profiles_by_partner`, `get_profile_by_id`, `get_profile_address`, `get_profile_education`, `get_profile_employment`, `get_profile_family`, `get_profile_photos`, `get_profile_lifestyle`, `get_profile_hobby_interest`, `get_profile_property`, `get_profile_views`, `get_profile_favorites`, `get_full_profile`, `create_account`, `create_profile_personal`, `create_login`, `update_profile_personal`, `toggle_profile_status`, `get_lookup_values`, `get_all_lookups`, `generate_account_code`, `get_gender_lookups` |
| **Partner** | `get_partner_by_id`, `get_partner_by_api_client`, `get_all_partners`, `get_partner_domain_links`, `get_countries`, `get_states` |
| **Brand Config** | `get_brand_config`, `upsert_brand_config` |
| **Background Check** | `get_profile_for_check`, `log_background_check_request` |
| **Admin Users** | `list_users`, `create_user`, `update_user`, `toggle_user_status`, `get_partner_user_by_id` |
| **Audit** | `insert_audit_log`, `get_audit_logs` |

## Project Structure

```
ekam-admin-api/
├── ado/                    # Data Access Objects (CALL stored procedures)
│   ├── authAdo.js
│   ├── dashboardAdo.js
│   ├── profileAdo.js
│   ├── partnerAdo.js
│   ├── brandConfigAdo.js
│   ├── backgroundCheckAdo.js
│   ├── adminUserAdo.js
│   └── auditAdo.js
├── datalayer/              # Business logic
│   ├── authDatalayer.js
│   ├── dashboardDatalayer.js
│   ├── profileDatalayer.js
│   ├── partnerDatalayer.js
│   ├── brandConfigDatalayer.js
│   ├── backgroundCheckDatalayer.js
│   ├── adminUserDatalayer.js
│   └── auditDatalayer.js
├── controllers/            # Request/response handlers
│   ├── authController.js
│   ├── dashboardController.js
│   ├── profileController.js
│   ├── partnerController.js
│   ├── brandConfigController.js
│   ├── backgroundCheckController.js
│   ├── adminUserController.js
│   └── auditController.js
├── routes/                 # Express route definitions
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── profileRoutes.js
│   ├── partnerRoutes.js
│   ├── backgroundCheckRoutes.js
│   ├── adminUserRoutes.js
│   └── auditRoutes.js
├── config/
│   └── db.js               # MySQL connection pool
├── middleware/
│   ├── auth.js             # JWT + API key + authorizeRoles middleware
│   └── audit.js            # Audit logging middleware + logAuditEvent helper
├── docs/
│   └── swagger.js          # OpenAPI/Swagger configuration
├── server.js               # Express app setup
├── .env                    # Environment variables
└── package.json
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `partner_admin_users` | Admin portal logins with role (partner-admin, account-admin, support-admin) |
| `partner_admin_audit_log` | Activity audit trail with before/after data |
| `partner_brand_config` | White-label brand settings per partner (template, colors, fonts, logos, layout variants, custom CSS) |
| `account` | User accounts linked to partners |
| `profile_personal` | Profile data (name, gender, DOB, contact, etc.) |
| `lookup_table` | Reference data by category (gender, religion, address_type, etc.) |

## White-Label / Brand Config

The API supports server-driven white-labeling via the `partner_brand_config` table. Each partner can customize:

| Property | Description |
|----------|-------------|
| `template_id` | Template preset (modern, classic, elegant, corporate, minimal, vibrant) |
| `brand_name` / `brand_tagline` | Brand identity text |
| `logo_url` / `logo_small_url` / `favicon_url` | Logo and favicon URLs |
| `primary_color` / `secondary_color` / `accent_color` | HSL color values |
| `font_family` | CSS font-family string |
| `border_radius` | CSS border-radius value |
| `sidebar_style` | standard, slim, dark, branded |
| `login_layout` | centered, split, fullscreen |
| `header_style` | minimal, branded, compact |
| `custom_css` | Arbitrary CSS injected at runtime |

Brand config is returned with the login response so the UI applies it immediately — zero extra API calls needed.

## Security

- **POST-only** — No sensitive data in URLs (avoids server log exposure, browser history, proxy caches)
- **Stored procedures** — SQL injection prevention at the database layer
- **JWT tokens** — 8-hour expiry, signed with HS256
- **Role-based access** — `authorizeRoles()` middleware enforces per-route role restrictions
- **Audit trail** — All admin actions logged with user context, before/after data, IP address
- **Sensitive data sanitization** — Passwords, tokens, API keys replaced with `***` in audit logs
- **Helmet** — HTTP security headers
- **Rate limiting** — 100 requests per 15 minutes on login endpoint
- **CORS** — Locked to configured origin, POST method only
- **bcrypt** — Password hashing with 10 salt rounds
- **Self-protection** — Partner-admin cannot deactivate their own account
- **Role restriction** — Only `account-admin` and `support-admin` can be created via UI (no `partner-admin` escalation)
