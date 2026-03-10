# Unified Address Verification Service

## 1. Overview

Implement a unified address verification and auto-suggestion service for the EKam Partner Admin application. The service acts as a **provider-agnostic abstraction layer** over multiple free address verification APIs, exposing a single consistent interface to the frontend. This applies to **all UI tabs** that contain address fields (profile creation, address management, account creation, employment addresses, etc.).

---

## 2. Supported Providers

| # | Provider   | Type               | Key Capabilities                                      | Free Tier Limits            |
|---|------------|--------------------|-------------------------------------------------------|-----------------------------|
| 1 | **MailColt** | Address Validation | Full address verification, deliverability scoring     | Limited free requests/month |
| 2 | **Geoapify** | Geocoding / Autocomplete | Address autocomplete, forward/reverse geocoding, structured address parsing | 3,000 requests/day (free)  |
| 3 | **USPS**     | US Address Validation | USPS-official address standardization, ZIP+4 lookup, city/state from ZIP | Free (US addresses only)   |

### Provider Selection Strategy

- **Primary**: Configurable per partner (default: Geoapify for autocomplete, USPS for US address validation)
- **Fallback**: If the primary provider fails or is rate-limited, automatically fall back to the next available provider
- **Country-based routing**: USPS for US addresses only; Geoapify/MailColt for international addresses

---

## 3. Use Cases

### UC-1: Full Address Verification

**Trigger**: User submits or saves an address (create/update)

| Item            | Detail |
|-----------------|--------|
| **Input**       | `address_line1`, `address_line2`, `city`, `state`, `zip`, `country` |
| **Output**      | Verified/standardized address with confidence score, corrections applied, deliverability status |
| **Behavior**    | Before persisting an address (profile address create/update, account creation), call the verification API. Return the standardized address to the frontend for user confirmation if corrections were made. |

### UC-2: ZIP Code → City & State Auto-Suggestion

**Trigger**: User enters a ZIP/postal code

| Item            | Detail |
|-----------------|--------|
| **Input**       | `zip` (minimum 3 characters to start suggesting, full ZIP for exact match) |
| **Output**      | Array of `{ city, state, country }` matches |
| **Behavior**    | As the user types a ZIP code, return matching city and state suggestions. On full ZIP entry, auto-populate city and state fields. |

### UC-3: City → State Auto-Suggestion

**Trigger**: User enters a city name

| Item            | Detail |
|-----------------|--------|
| **Input**       | `city` (minimum 3 characters), optional `country` |
| **Output**      | Array of `{ state, country }` matches |
| **Behavior**    | As the user types a city name, suggest the corresponding state(s). If a city exists in multiple states, show all matches for user selection. |

### UC-4: Address Autocomplete (Type-Ahead)

**Trigger**: User starts typing in `address_line1`

| Item            | Detail |
|-----------------|--------|
| **Input**       | Partial address string (minimum 3 characters), optional `country` filter |
| **Output**      | Array of `{ address_line1, address_line2, city, state, zip, country }` suggestions |
| **Behavior**    | Provide real-time address suggestions as the user types. On selection, auto-populate all address fields. Debounce requests (300ms recommended). |

---

## 4. API Endpoints

All endpoints require authentication (`authenticateToken` middleware).

### 4.1 Verify Address

```
POST /api/address/verify
```

**Request Body:**
```json
{
  "address_line1": "123 Main St",
  "address_line2": "Apt 4B",
  "city": "Springfield",
  "state": "IL",
  "zip": "62704",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": "high",
    "standardized_address": {
      "address_line1": "123 MAIN ST",
      "address_line2": "APT 4B",
      "city": "SPRINGFIELD",
      "state": "IL",
      "zip": "62704-1234",
      "country": "US"
    },
    "corrections": [
      { "field": "zip", "original": "62704", "corrected": "62704-1234" }
    ],
    "provider": "usps"
  }
}
```

### 4.2 Lookup by ZIP Code

```
POST /api/address/lookup-by-zip
```

**Request Body:**
```json
{
  "zip": "62704",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "city": "Springfield", "state": "IL", "country": "US" }
  ]
}
```

### 4.3 Lookup State by City

```
POST /api/address/lookup-by-city
```

**Request Body:**
```json
{
  "city": "Springfield",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "state": "IL", "country": "US" },
    { "state": "MO", "country": "US" },
    { "state": "MA", "country": "US" },
    { "state": "OH", "country": "US" }
  ]
}
```

### 4.4 Address Autocomplete

```
POST /api/address/autocomplete
```

**Request Body:**
```json
{
  "query": "123 Main",
  "country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address_line1": "123 Main St",
      "address_line2": "",
      "city": "Springfield",
      "state": "IL",
      "zip": "62704",
      "country": "US"
    }
  ]
}
```

---

## 5. Architecture

### 5.1 Backend Layer Structure

```
ekam-partner-admin-api/
├── services/
│   └── addressVerification/
│       ├── index.js                  # Unified service (provider router + fallback logic)
│       ├── providers/
│       │   ├── mailcoltProvider.js    # MailColt API integration
│       │   ├── geoapifyProvider.js    # Geoapify API integration
│       │   └── uspsProvider.js        # USPS Web Tools API integration
│       └── addressCache.js           # In-memory / Redis cache for ZIP→city/state lookups
├── controllers/
│   └── addressController.js          # Express route handlers
├── routes/
│   └── addressRoutes.js              # Route definitions
└── config/
    └── addressProviders.js           # Provider API keys, priority config, rate limits
```

### 5.2 Provider Interface

Each provider must implement a standard interface:

```javascript
{
  verifyAddress(address)        → { verified, confidence, standardized_address, corrections }
  lookupByZip(zip, country)     → [{ city, state, country }]
  lookupByCity(city, country)   → [{ state, country }]
  autocomplete(query, country)  → [{ address_line1, address_line2, city, state, zip, country }]
}
```

### 5.3 Fallback & Caching Strategy

- **Provider priority**: Configurable ordered list (e.g., `["usps", "geoapify", "mailcolt"]`)
- **Fallback**: On provider failure (timeout, rate limit, error), try next provider in priority order
- **Caching**: ZIP → city/state lookups cached in-memory (TTL: 24h) to reduce API calls
- **Rate limiting**: Track per-provider request counts; skip provider if daily limit is near

---

## 6. UI Integration Points

Address verification and auto-suggestion apply to **all screens/tabs** that contain address fields:

| UI Screen / Tab                 | Address Fields Used                                                        | Verification Behavior |
|---------------------------------|----------------------------------------------------------------------------|-----------------------|
| **Profile Creation**            | `address_line1`, `address_line2`, `city`, `state`, `zip`, `country`        | Verify on save; auto-suggest on input |
| **Profile Address Tab**         | `address_type`, `address_line1`, `address_line2`, `city`, `state`, `zip`, `country_id`, `landmark1`, `landmark2` | Verify on create/update; auto-suggest on input |
| **Employment Tab**              | Employer address fields (if present)                                       | Auto-suggest on input |
| **Account Creation**            | `address_line1`, `address_line2`, `city`, `state`, `zip`, `country`        | Verify on save |
| **Any future address forms**    | Standard address fields                                                    | Reusable component; auto-suggest + verify |

### Frontend Behavior

1. **Debounced autocomplete**: Trigger autocomplete after 300ms of no typing (minimum 3 chars)
2. **Auto-populate**: When ZIP is entered → auto-fill city + state; when autocomplete suggestion is selected → fill all fields
3. **Verification on save**: Before submitting address forms, call verify endpoint; show corrections to user for confirmation
4. **Reusable component**: Build a shared `AddressForm` component (or hook) that integrates verification + autocomplete, usable in any tab

---

## 7. Configuration

### Environment Variables

```env
# Provider API Keys
ADDRESS_GEOAPIFY_API_KEY=<key>
ADDRESS_MAILCOLT_API_KEY=<key>
ADDRESS_USPS_USER_ID=<usps_web_tools_user_id>

# Provider Priority (comma-separated, first = highest priority)
ADDRESS_PROVIDER_PRIORITY=usps,geoapify,mailcolt

# Cache TTL (seconds)
ADDRESS_CACHE_TTL=86400

# Request timeout per provider (ms)
ADDRESS_PROVIDER_TIMEOUT=5000
```

---

## 8. Error Handling

Follow the existing `partner_admin_error_codes` pattern.

| Error Code                          | HTTP | Description                            |
|-------------------------------------|------|----------------------------------------|
| `PA-AVVR-001_INVALID_ADDRESS`      | 400  | Required address fields missing        |
| `PA-AVVR-002_PROVIDER_UNAVAILABLE` | 503  | All address providers unavailable      |
| `PA-AVVR-003_VERIFICATION_FAILED`  | 422  | Address could not be verified          |
| `PA-AVLK-001_INVALID_ZIP`          | 400  | Invalid or missing ZIP code            |
| `PA-AVLK-002_INVALID_CITY`         | 400  | Invalid or missing city                |
| `PA-AVLK-003_NO_RESULTS`           | 404  | No matching results found              |
| `PA-AVAC-001_QUERY_TOO_SHORT`      | 400  | Autocomplete query below minimum length|

---

## 9. Testing Plan

| Layer           | Test Type    | Count (Est.) | Scope |
|-----------------|-------------|-------------|-------|
| **Providers**   | Unit        | ~15         | Each provider: mock external API, test response normalization, error handling |
| **Service**     | Unit        | ~10         | Fallback logic, caching, provider routing |
| **Controller**  | Unit        | ~10         | Request validation, response formatting |
| **Routes**      | Integration | ~12         | End-to-end with mocked providers, auth checks, error responses |
| **Total**       |             | **~47**     | |

---

## 10. Implementation Phases

### Phase 1 — Core Service, ZIP Lookup & City Lookup 
- Set up provider abstraction layer and configuration (`config/addressProviders.js`)
- Implement Geoapify provider — ZIP→city/state and city→state lookups
- Build `/api/address/lookup-by-zip` endpoint
- Build `/api/address/lookup-by-city` endpoint
- Add in-memory TTL cache for all lookups (`addressCache.js`)
- Add fallback logic across providers (service `index.js`)
- Add 5 error codes to `partner_admin_error_codes` table
- 38 unit + integration tests

### Phase 2 — Address Verification 
- Implement `/api/address/verify` endpoint with full address standardization
- Geoapify geocoding API — returns standardized address, confidence score, corrections
- Cache verified addresses
- Add 2 error codes (`PA_AVVR_001_INVALID_ADDRESS`, `PA_AVVR_003_VERIFICATION_FAILED`)
- 25 unit + integration tests (total: 63 address tests)

### Phase 3 — Autocomplete & UI Integration 
- Implement `autocomplete()` in Geoapify provider (normalize, deduplicate results)
- Add `autocomplete()` to unified service with cache + provider fallback
- Build `POST /api/address/autocomplete` endpoint with validation (min 3 chars)
- Add error code `PA_AVAC_001_QUERY_TOO_SHORT`
- 19 unit + integration tests (provider 5, service 4, controller 4, integration 6)
- Frontend: `useAddressAutocomplete` hook with debounced API calls
- Frontend: `AddressForm` enhanced with autocomplete dropdown on address_line1
- Frontend: ZIP auto-populate (city + state via `lookupByZip`)
- Frontend: Verify-on-save flow with correction confirmation dialog (accept/skip)
- Total: 82 address-related tests across all phases

---

## 11. Dependencies & Prerequisites

- **USPS Web Tools account** (free registration at https://www.usps.com/business/web-tools-apis/)
- **Geoapify API key** (free tier at https://www.geoapify.com/) --414d4ed5be6d4684b780a8f87547c281
- **MailColt API key** (free tier at https://mailcolt.com/) 
- Existing `authenticateToken` middleware for route protection
- Existing error handling infrastructure (`errorCodes.js`, `AppError`, `errorHandler.js`)