# EKam Admin API — Testing Guide

> **Last updated:** Feb 2026 · **Tests:** 246 passing · **Node:** ≥ 20.0.0

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Technology Stack](#2-technology-stack)
3. [Directory Structure](#3-directory-structure)
4. [Test Runner](#4-test-runner)
5. [Helper Files](#5-helper-files)
6. [Mock Data (Fixtures)](#6-mock-data-fixtures)
7. [Writing Tests — Layer by Layer](#7-writing-tests--layer-by-layer)
   - 7.1 [ADO Tests](#71-ado-tests)
   - 7.2 [Datalayer Tests](#72-datalayer-tests)
   - 7.3 [Controller Tests](#73-controller-tests)
   - 7.4 [Middleware Tests](#74-middleware-tests)
   - 7.5 [Integration Tests](#75-integration-tests)
8. [Error Handling in Tests](#8-error-handling-in-tests)
9. [Adding a New Feature — Step-by-Step Checklist](#9-adding-a-new-feature--step-by-step-checklist)
10. [Common Patterns & Recipes](#10-common-patterns--recipes)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Quick Start

```bash
# Run all 246 tests (unit + integration)
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

All three scripts use `tests/run.mjs`, a cross-platform test file finder that recursively discovers every `*.test.mjs` file under `tests/unit/` and/or `tests/integration/`.

---

## 2. Technology Stack

| Tool | Purpose |
|------|---------|
| **`node:test`** | Built-in Node.js test runner (describe / it / afterEach) |
| **`node:assert/strict`** | Built-in strict assertions |
| **Sinon 21.x** | Stubs, spies, sandboxes |
| **Supertest 7.x** | HTTP assertions for integration tests |

> **No Jest.** The project uses Node's native test runner exclusively. All test files use the `.mjs` extension (ESM), while the source code is CommonJS (`.js`).

---

## 3. Directory Structure

```
tests/
├── run.mjs                          # Cross-platform test runner script
├── fixtures/
│   └── mockData.mjs                 # Centralized mock data for all entities
├── helpers/
│   ├── mockPool.mjs                 # Sinon-stubbed DB pool
│   ├── mockReqRes.mjs               # Mock Express req/res/next factories
│   ├── seedErrorCodes.mjs           # Seeds ERROR_CODES Map for tests
│   └── testApp.mjs                  # JWT token generator for integration tests
├── unit/
│   ├── ado/                         # 8 test files  → 63 tests
│   │   ├── authAdo.test.mjs
│   │   ├── dashboardAdo.test.mjs
│   │   ├── profileAdo.test.mjs
│   │   ├── partnerAdo.test.mjs
│   │   ├── backgroundCheckAdo.test.mjs
│   │   ├── adminUserAdo.test.mjs
│   │   ├── auditAdo.test.mjs
│   │   └── brandConfigAdo.test.mjs
│   ├── datalayer/                   # 8 test files  → 49 tests
│   │   └── (same entity naming)
│   ├── controllers/                 # 8 test files  → 62 tests
│   │   └── (same entity naming)
│   └── middleware/
│       └── auth.test.mjs            # 9 tests
└── integration/                     # 8 test files  → 63 tests
    ├── auth.test.mjs
    ├── dashboard.test.mjs
    ├── profiles.test.mjs
    ├── partner.test.mjs
    ├── backgroundCheck.test.mjs
    ├── adminUsers.test.mjs
    ├── audit.test.mjs
    └── health.test.mjs
```

**Test counts by layer:**

| Layer | Files | Tests |
|-------|-------|-------|
| ADO (unit) | 8 | 63 |
| Datalayer (unit) | 8 | 49 |
| Controller (unit) | 8 | 62 |
| Middleware (unit) | 1 | 9 |
| Integration | 8 | 63 |
| **Total** | **33** | **246** |

---

## 4. Test Runner

**File:** `tests/run.mjs`

```bash
node tests/run.mjs all          # both unit + integration
node tests/run.mjs unit         # only unit
node tests/run.mjs integration  # only integration
```

The runner recursively finds all `*.test.mjs` files, then invokes `node --test <files>`. It works on Windows (PowerShell), macOS, and Linux.

---

## 5. Helper Files

### 5.1 `mockPool.mjs` — Stubbed DB Pool

Provides a `sinon.stub()` for `pool.query` so ADO tests can simulate stored procedure results without a real database.

```js
import pool, { resetPool } from '../helpers/mockPool.mjs';

afterEach(() => resetPool());  // clears stub call history
```

> **Note:** Most test files create their own inline pool stub (see patterns below) rather than importing this helper, because the pool must be injected into `require.cache` before requiring CJS source modules.

### 5.2 `mockReqRes.mjs` — Express Request/Response Factories

```js
import { mockReq, mockRes, mockNext } from '../helpers/mockReqRes.mjs';
```

| Function | Returns |
|----------|---------|
| `mockReq(overrides)` | `{ body: {}, headers: {...}, user: { userId: 1, username: 'partneradmin', role: 'partner-admin', partnerId: 1, ... }, ip: '127.0.0.1', originalUrl: '/api/test', ...overrides }` |
| `mockRes()` | `{ status: sinon.stub().returns(res), json: sinon.stub().returns(res) }` |
| `mockNext()` | `sinon.stub()` |

### 5.3 `seedErrorCodes.mjs` — Error Codes Map Seeder

Seeds the in-memory `ERROR_CODES` Map (from `config/errorCodes.js`) with test data that mirrors the `partner_admin_error_codes` database table. This is **required for integration tests** where HTTP status codes flow through `createAppError()` → `errorHandler`.

```js
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';

// Call AFTER pool mock setup, BEFORE requiring source modules
seedErrorCodes();
```

**When to use:**
- ✅ **Integration tests** — always (they assert HTTP status codes like 400, 401, 403, 404)
- ❌ **Unit tests** — not needed (they only check `errorCode` string, not HTTP status)

**When adding a new error code**, add a matching entry to the `TEST_ERROR_CODES` array in this file.

### 5.4 `testApp.mjs` — JWT Token Generator

```js
import { generateToken } from '../helpers/testApp.mjs';

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });
```

Default payload: `{ userId: 1, username: 'partneradmin', role: 'partner-admin', partnerId: 1, ... }`  
Override any field by passing it in the object argument.

---

## 6. Mock Data (Fixtures)

**File:** `tests/fixtures/mockData.mjs`

All mock data lives in a single file. Each export mirrors the exact shape returned by stored procedures / DB rows:

| Category | Exports |
|----------|---------|
| Auth | `apiClient`, `apiClientInactive`, `partnerUser`, `accountAdminUser`, `supportAdminUser`, `partnerDomains` |
| Dashboard | `profileMetrics`, `paymentMetrics`, `activityMetrics`, `viewsMetrics`, `accountMetrics`, `recentActivities` |
| Profiles | `profilePersonal`, `profileAddress`, `profileEducation`, `profileEmployment`, `profileFamily`, `profilePhotos`, `profileLifestyle`, `profileHobbies`, `profileProperty`, `fullProfile`, `createProfileInput`, `lookupValues` |
| Partner | `partnerInfo`, `partnerDomainLinks`, `countries`, `states` |
| Admin Users | `createAdminUserInput` |
| Audit | `auditLogEntry`, `auditLogsList` |
| Brand Config | `brandConfigRow`, `brandConfigFormatted`, `updateBrandConfigInput` |
| Background Check | `profileForCheck` |

**When adding new fixtures**, follow the existing naming convention and keep them grouped by domain.

---

## 7. Writing Tests — Layer by Layer

### Key Concept: CJS ↔ ESM Bridge

Source code is **CommonJS** (`.js`), test files are **ESM** (`.mjs`). The bridge:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
```

This gives you a `require()` function scoped to the test file's directory, allowing you to load CJS modules and manipulate `require.cache`.

### Key Concept: Pool Mock Injection

**Every test file** that touches source code must inject the mock pool into `require.cache` **before** requiring any source module:

```js
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = {
  id: require.resolve('../../config/db'),
  exports: pool,
  loaded: true,
  filename: require.resolve('../../config/db')
};

// NOW safe to require source modules
const myAdo = require('../../ado/myAdo');
```

This ensures all source modules get the stubbed pool instead of a real MySQL connection.

---

### 7.1 ADO Tests

**Purpose:** Verify that ADO functions call the correct stored procedures with the right parameters and return the expected shapes.

**Pattern:**

```js
// tests/unit/ado/myEntityAdo.test.mjs
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { myFixture } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

// 1. Stub pool BEFORE requiring ADO
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = {
  id: require.resolve('../../../config/db'),
  exports: pool,
  loaded: true,
  filename: require.resolve('../../../config/db')
};

// 2. Require the ADO
const myEntityAdo = require('../../../ado/myEntityAdo');

// 3. Reset after each test
afterEach(() => pool.query.reset());

describe('myEntityAdo', () => {
  describe('getById', () => {
    it('should return entity for valid id', async () => {
      // SP returns: [ [ [row] ] ]  (array of result sets, first set is array of rows)
      pool.query.resolves([[[myFixture]]]);

      const result = await myEntityAdo.getById(1);

      assert.deepStrictEqual(result, myFixture);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_get_my_entity(?)', [1]
      ));
    });

    it('should return null for unknown id', async () => {
      pool.query.resolves([[[]]]);
      const result = await myEntityAdo.getById(999);
      assert.strictEqual(result, null);
    });
  });
});
```

**SP result shape guide:**

| SP returns | pool.query resolves with |
|------------|--------------------------|
| Single row (e.g., get by ID) | `[[[row]]]` |
| Empty result | `[[[   ]]]` |
| Array of rows (e.g., list) | `[[ [row1, row2] ]]` |
| No result set (e.g., update/delete) | `[[]]` |

---

### 7.2 Datalayer Tests

**Purpose:** Verify business logic — correct ADO calls, error throwing, data transformation.

**Pattern:**

```js
// tests/unit/datalayer/myEntityDatalayer.test.mjs
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { myFixture } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

// 1. Stub pool
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = {
  id: require.resolve('../../../config/db'),
  exports: pool,
  loaded: true,
  filename: require.resolve('../../../config/db')
};

// 2. Require ADO and datalayer
const myEntityAdo = require('../../../ado/myEntityAdo');
const myEntityDatalayer = require('../../../datalayer/myEntityDatalayer');

// 3. Use sandbox for stubbing ADO methods
const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();  // restores all ADO stubs
  pool.query.reset();
});

describe('myEntityDatalayer', () => {
  it('should return entity when found', async () => {
    sandbox.stub(myEntityAdo, 'getById').resolves(myFixture);
    const result = await myEntityDatalayer.getEntity(1, 1);
    assert.deepStrictEqual(result, myFixture);
  });

  it('should throw AppError when not found', async () => {
    sandbox.stub(myEntityAdo, 'getById').resolves(null);
    await assert.rejects(
      () => myEntityDatalayer.getEntity(999, 1),
      err => err.errorCode === 'PA_MYGT_100_NOT_FOUND'
    );
  });

  it('should throw AppError for partner mismatch', async () => {
    sandbox.stub(myEntityAdo, 'getById').resolves({ ...myFixture, registered_partner_id: 2 });
    await assert.rejects(
      () => myEntityDatalayer.getEntity(1, 1),
      err => err.errorCode === 'PA_MYGT_300_ACCESS_DENIED'
    );
  });
});
```

**Key points:**
- Stub ADO methods with `sandbox.stub()`, not pool directly
- Error tests use `assert.rejects()` and check `err.errorCode`
- Always restore sandbox in `afterEach`

---

### 7.3 Controller Tests

**Purpose:** Verify request validation, correct datalayer calls, response shaping, and error delegation to `next()`.

**Pattern:**

```js
// tests/unit/controllers/myEntityController.test.mjs
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { myFixture } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = {
  id: require.resolve('../../../config/db'),
  exports: pool,
  loaded: true,
  filename: require.resolve('../../../config/db')
};

const myEntityDatalayer = require('../../../datalayer/myEntityDatalayer');
const myEntityController = require('../../../controllers/myEntityController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('myEntityController', () => {
  describe('getEntity', () => {
    it('should return 200 with data on success', async () => {
      sandbox.stub(myEntityDatalayer, 'getEntity').resolves(myFixture);
      const res = mockRes();
      const next = mockNext();

      await myEntityController.getEntity(mockReq({ body: { id: 1 } }), res, next);

      assert.ok(res.json.calledOnce);
      assert.deepStrictEqual(res.json.firstCall.args[0], {
        success: true,
        data: myFixture
      });
    });

    it('should call next with error for missing fields', async () => {
      const res = mockRes();
      const next = mockNext();

      await myEntityController.getEntity(mockReq({ body: {} }), res, next);

      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MYGT_001_MISSING_FIELDS');
    });

    it('should call next on unexpected error', async () => {
      sandbox.stub(myEntityDatalayer, 'getEntity').rejects(new Error('DB down'));
      const res = mockRes();
      const next = mockNext();

      await myEntityController.getEntity(mockReq({ body: { id: 1 } }), res, next);

      assert.ok(next.calledOnce);
    });
  });
});
```

**Key points:**
- Stub the datalayer, not the ADO
- Validation errors: check `next.firstCall.args[0].errorCode`
- Success paths: check `res.json.firstCall.args[0]` or `res.status.calledWith(201)`
- Always include an "unexpected error → next()" test

---

### 7.4 Middleware Tests

**Purpose:** Verify auth token parsing, API key validation, and role authorization.

Test patterns are identical to controller tests but call middleware functions directly:

```js
it('should call next with error if no token provided', () => {
  const req = mockReq({ headers: {} });
  const res = mockRes();
  const next = sinon.stub();

  authenticateToken(req, res, next);

  assert.ok(next.calledOnce);
  assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_MWAU_001_NO_TOKEN');
});
```

---

### 7.5 Integration Tests

**Purpose:** Verify end-to-end HTTP request/response through the full Express stack (routes → middleware → controller → datalayer → response).

**Pattern:**

```js
// tests/integration/myEntity.test.mjs
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { myFixture } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

// 1. Mock pool
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = {
  id: require.resolve('../../config/db'),
  exports: pool,
  loaded: true,
  filename: require.resolve('../../config/db')
};

// 2. Seed error codes (REQUIRED for correct HTTP status codes)
seedErrorCodes();

// 3. Stub audit middleware if the route uses it
require.cache[require.resolve('../../middleware/audit')] = {
  id: require.resolve('../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../middleware/audit')
};

// 4. Require app and datalayer
const myEntityDatalayer = require('../../datalayer/myEntityDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

// 5. Generate tokens for different roles
const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('My Entity API Integration', () => {
  describe('POST /api/my-entity/list', () => {
    it('should return 200 for authorized role', async () => {
      sandbox.stub(myEntityDatalayer, 'listEntities').resolves({ items: [], total: 0 });
      const res = await request
        .post('/api/my-entity/list')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ page: 1 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/my-entity/list').send({});
      assert.strictEqual(res.status, 401);
    });

    it('should return 403 for unauthorized role', async () => {
      const res = await request
        .post('/api/my-entity/list')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({});
      assert.strictEqual(res.status, 403);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request
        .post('/api/my-entity/create')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({});
      assert.strictEqual(res.status, 400);
    });

    it('should return error from datalayer', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(myEntityDatalayer, 'getEntity')
        .rejects(new AppError('PA_MYGT_100_NOT_FOUND', 'Not found', 404));
      const res = await request
        .post('/api/my-entity/detail')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ id: 999 });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'PA_MYGT_100_NOT_FOUND');
    });
  });
});
```

**Key differences from unit tests:**
- Uses `supertest` to make real HTTP requests
- Must call `seedErrorCodes()` so `createAppError()` produces correct HTTP status codes
- Tests the full stack: auth middleware → role check → controller → response
- Must stub the audit middleware for routes that use it (admin-users, partner brand-config)

---

## 8. Error Handling in Tests

### How Errors Flow

```
Controller/Middleware
    → throw createAppError('PA_XXXX_NNN_CODE')   // or next(createAppError(...))
    → errorHandler middleware catches it
    → responds with { success: false, error: { code, type, message } }
    → also logs to DB via partner_admin_log_api_error (fire-and-forget)
```

### Error Codes — DB-Driven

Production: `config/errorCodes.js` loads error codes from `partner_admin_error_codes` table at startup via `initErrorCodes()`.

Tests: `seedErrorCodes()` populates the same in-memory `Map` with test data. **If you add a new error code to the DB, also add it to `tests/helpers/seedErrorCodes.mjs`.**

### Assertion Patterns

**Unit tests** — check error code string only:
```js
assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_XXXX_NNN_CODE');
```

**Datalayer tests** — check thrown error:
```js
await assert.rejects(
  () => datalayer.doSomething(args),
  err => err.errorCode === 'PA_XXXX_NNN_CODE'
);
```

**Integration tests** — check HTTP response:
```js
assert.strictEqual(res.status, 400);
assert.strictEqual(res.body.error.code, 'PA_XXXX_NNN_CODE');
```

---

## 9. Adding a New Feature — Step-by-Step Checklist

Suppose you're adding a new module called **"Payments"** with routes under `/api/payments/*`.

### Step 1: Add Mock Data

Edit `tests/fixtures/mockData.mjs`:

```js
// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentRecord = {
  payment_id: 1, partner_id: 1, profile_id: 101,
  amount: 5000, status: 'completed', created_at: '2026-01-15T10:00:00Z'
};

export const paymentsList = {
  payments: [paymentRecord], total: 1, page: 1, limit: 20
};
```

### Step 2: Add Error Codes to Seed Helper

If your new controllers/datalayers use `createAppError()`, edit `tests/helpers/seedErrorCodes.mjs`:

```js
// Payments
{ error_code: 'PA_PYGT_001_MISSING_FIELDS', http_status: 400, error_type: 'validation', default_message: 'Payment ID is required' },
{ error_code: 'PA_PYGT_100_NOT_FOUND',      http_status: 404, error_type: 'not_found',  default_message: 'Payment not found' },
```

> **Also insert these codes into the `partner_admin_error_codes` DB table.**

### Step 3: Write ADO Test

Create `tests/unit/ado/paymentAdo.test.mjs` following the [ADO pattern](#71-ado-tests).

### Step 4: Write Datalayer Test

Create `tests/unit/datalayer/paymentDatalayer.test.mjs` following the [Datalayer pattern](#72-datalayer-tests).

### Step 5: Write Controller Test

Create `tests/unit/controllers/paymentController.test.mjs` following the [Controller pattern](#73-controller-tests).

### Step 6: Write Integration Test

Create `tests/integration/payments.test.mjs` following the [Integration pattern](#75-integration-tests). Remember to:
- Call `seedErrorCodes()`
- Stub audit middleware if the route uses it
- Test all three roles (partner-admin, account-admin, support-admin)
- Test 401 (no token), 403 (wrong role), 400 (validation), 404 (not found)

### Step 7: Run Tests

```bash
npm test
```

Verify all tests pass, including your new ones.

---

## 10. Common Patterns & Recipes

### 10.1 Testing a Route That Uses Audit Middleware

Some routes (admin-users, brand-config update) use the audit middleware. Stub it before requiring server:

```js
require.cache[require.resolve('../../middleware/audit')] = {
  id: require.resolve('../../middleware/audit'),
  exports: {
    auditLog: () => (req, res, next) => next(),
    logAuditEvent: sinon.stub()
  },
  loaded: true,
  filename: require.resolve('../../middleware/audit')
};
```

### 10.2 Testing 201 Created Response

```js
it('should return 201 on success', async () => {
  sandbox.stub(datalayer, 'create').resolves({ id: 1, name: 'New' });
  const res = mockRes();
  const next = mockNext();
  await controller.create(mockReq({ body: validInput }), res, next);
  assert.ok(res.status.calledWith(201));
  assert.ok(res.json.calledOnce);
});
```

### 10.3 Testing Password Hashing (bcryptjs)

Since `bcrypt.hash()` is async and slow (~400ms), keep password-related tests to a minimum:

```js
it('should hash password and call ADO', async () => {
  sandbox.stub(myAdo, 'createUser').resolves({ id: 1 });
  const result = await datalayer.createUser(1, { password: 'Test@123', ... });
  // Verify the hashed password was passed (not the plain text)
  const hashedArg = myAdo.createUser.firstCall.args[1];
  assert.ok(hashedArg.startsWith('$2a$'));
});
```

### 10.4 Testing with Different Roles

Integration tests should verify role-based access for every route:

```js
const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

it('should return 403 for account-admin', async () => {
  const res = await request.post('/api/admin-only-route')
    .set('Authorization', `Bearer ${accountAdminToken}`).send({});
  assert.strictEqual(res.status, 403);
});
```

### 10.5 Testing AppError from Datalayer Stubs

In integration tests, when you want a datalayer to throw a specific error:

```js
it('should return 404 from datalayer', async () => {
  const AppError = require('../../utils/AppError');
  sandbox.stub(datalayer, 'getEntity')
    .rejects(new AppError('PA_MYGT_100_NOT_FOUND', 'Not found', 404));
  const res = await request.post('/api/my-entity/detail')
    .set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 999 });
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.error.code, 'PA_MYGT_100_NOT_FOUND');
});
```

> Note: When constructing `AppError` directly in test stubs, you pass `httpStatus` explicitly — this bypasses the `ERROR_CODES` Map entirely.

---

## 11. Troubleshooting

### "Cannot find module" error

Ensure the pool is injected into `require.cache` **before** any `require()` call to source modules. The require.resolve path must match exactly.

### Tests pass individually but fail together

Check for shared state leakage. Ensure every `afterEach` calls:
- `sandbox.restore()` (for datalayer/controller stubs)
- `pool.query.reset()` (for pool stubs)

### HTTP status 500 instead of 400/401/403/404 in integration tests

You forgot to call `seedErrorCodes()`. Without it, all `createAppError()` calls fall back to status 500.

### "Pool.query is not a function"

The pool mock was not injected before requiring the source module. Check the order of operations at the top of your test file.

### Tests hang or timeout

Likely an unresolved promise. Check that all stubs `.resolves()` or `.rejects()` something — an unconfigured stub returns `undefined`, which can cause `await` to hang if the code expects a result.

### Environment variables

`testApp.mjs` sets `JWT_SECRET` and `CORS_ORIGIN`. If your feature needs other env vars, set them at the top of your test file:

```js
process.env.MY_VAR = 'test-value';
```
