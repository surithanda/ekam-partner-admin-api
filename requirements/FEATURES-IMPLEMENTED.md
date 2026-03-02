# EKam Partner Admin — Implemented Features

> **Last Updated**: February 27, 2026
> **Deployment**: Dev/Test → Vercel | Production → Azure
> - **API**: https://ekam-admin-api.vercel.app
> - **UI**: https://ekam-admin-ui.vercel.app

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS, Radix UI, Lucide Icons |
| **Backend** | Express.js, Node.js 20+, MySQL2, JWT, Helmet, CORS |
| **Database** | MySQL 8.0 (stored procedures pattern) |
| **Storage** | Azure Blob Storage (photos) |
| **Image Processing** | Sharp (resize, watermark, thumbnail) |
| **Deployment** | Vercel CLI (API + UI) |

---

## 1. Authentication & Authorization

### API Endpoints (`/api/auth`)
| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | JWT login with username, password, API key |
| `POST /auth/domains` | Get partner domain links |
| `POST /auth/verify` | Verify JWT token validity |

### Roles
- **partner-admin** — Full access (CRUD all resources)
- **account-admin** — Read access + limited write
- **support-admin** — Read + write access (no admin user management)

### UI Features
- Login page with domain selector (3 layout variants: centered, split, fullscreen)
- JWT token stored in localStorage
- Auto-redirect on expired token
- Role-based sidebar menu visibility

---

## 2. Dashboard

### API Endpoints (`/api/dashboard`)
| Endpoint | Description |
|----------|-------------|
| `POST /dashboard/metrics` | Aggregate counts (profiles, accounts, active/inactive) |
| `POST /dashboard/activities` | Recent activity log |

### UI Features
- Metrics cards with counts
- Recent activities timeline
- Quick-action links

---

## 3. Profile Management (Phases 1–5)

### 3.1 Profile List & CRUD

#### API Endpoints (`/api/profiles`)
| Endpoint | Description | Roles |
|----------|-------------|-------|
| `POST /profiles/list` | Paginated list with search, status, gender filters | All |
| `POST /profiles/detail` | Full profile detail by ID | All |
| `POST /profiles/create` | Create new profile (account + login + profile) | Write |
| `POST /profiles/update` | Update personal info | Write |
| `POST /profiles/toggle-status` | Activate/deactivate account | Write |
| `POST /profiles/personal/get` | Get personal section data | All |

#### UI Features
- **Profile List Page** (`/profiles`)
  - Paginated table with search by name/email/phone/account code
  - Filters: status (active/inactive), gender
  - Action buttons: View, Edit, Activate/Deactivate
  - Badge indicators for status
- **Profile Create Page** (`/profiles/create`)
  - Multi-field form: name, DOB, gender, phones, email, address, photo
  - Lookup-driven dropdowns (gender, marital status, religion, etc.)
  - Validation and error handling
- **Profile Detail Page** (`/profiles/[id]`)
  - Sidebar navigation with 11 section tabs
  - Headshot avatar in header (fetched on mount, updates on photo change)
  - Inline edit mode with Save/Cancel
  - Activate/Deactivate toggle
  - View/Export and Delete action buttons

### 3.2 Profile Sub-Sections (Full CRUD)

Each section has 4 endpoints: `get`, `create`, `update`, `delete`

| Section | Endpoints | SP Pattern | UI Component |
|---------|-----------|------------|--------------|
| **Address** | `/profiles/address/*` | `eb_profile_address_*` | `AddressForm.tsx` |
| **Contact** | `/profiles/contact/*` | `eb_profile_contact_*` | `ContactForm.tsx` |
| **Education** | `/profiles/education/*` | `eb_profile_education_*` | `EducationForm.tsx` |
| **Employment** | `/profiles/employment/*` | `eb_profile_employment_*` | `EmploymentForm.tsx` |
| **Family / References** | `/profiles/family/*` | `eb_profile_family_*` | `FamilyForm.tsx` |
| **Lifestyle** | `/profiles/lifestyle/*` | `eb_profile_lifestyle_*` | `LifestyleForm.tsx` |
| **Hobby / Interest** | `/profiles/hobby/*` | `eb_profile_hobby_*` | `HobbyForm.tsx` |
| **Property** | `/profiles/property/*` | `eb_profile_property_*` | `PropertyForm.tsx` |

**Total: 32 sub-section CRUD endpoints**

#### Shared UI Components
- `LookupSelect.tsx` — Cached lookup dropdown with `preloadLookup()` and `getLookupName()` helpers
- `CountryStateSelect.tsx` — Country/State cascading dropdowns with cache + `getCountryName()`/`getStateName()` helpers
- `ConfirmDeleteDialog.tsx` — Reusable confirmation dialog for record deletion
- All forms use consistent header bar pattern, `bg-background` theming, and lookup name resolution

### 3.3 Photo Management

#### API Endpoints (`/api/profiles/photos`)
| Endpoint | Description |
|----------|-------------|
| `POST /profiles/photos/get` | Get all photos for a profile (with Azure SAS URLs) |
| `POST /profiles/photos/upload` | Upload photo (multipart) → resize + watermark + thumbnail → Azure |
| `POST /profiles/photos/delete` | Delete photo + Azure blob cleanup |
| `POST /profiles/photos/set-primary` | Set a photo as primary/headshot |

#### Image Processing Pipeline (`config/imageProcessor.js`)
- **Auto-rotate** based on EXIF data
- **Resize** main image to max 1200px width
- **5-point logo watermark** — partner logo at 15% opacity in 4 corners + center
- **Diagonal text watermark** — partner brand name repeated across image at 6% opacity (baked into pixels)
- **Thumbnail generation** — 300px width from watermarked main image
- **Logo caching** — 1-hour in-memory cache for partner logos
- **Azure Blob Storage** — main + thumbnail uploaded with SAS URL generation

#### UI Features (`PhotoForm.tsx`)
- Photo grid display with type labels
- Upload with category selection (Headshot, Full Body, etc.)
- Delete with confirmation
- Set as primary action
- Real-time headshot avatar update in profile header

### 3.4 Search Preferences

#### API Endpoints (`/api/profiles/search-preference`)
| Endpoint | Description |
|----------|-------------|
| `POST /search-preference/get` | Get search preferences for profile |
| `POST /search-preference/create` | Create preferences (11 params including created_user) |
| `POST /search-preference/update` | Update preferences |
| `POST /search-preference/delete` | Delete preferences |

#### UI Features (`SearchPreferenceForm.tsx`)
- Age range, gender, religion, education, occupation, marital status, country, caste
- Lookup-driven dropdowns

---

## 4. Account Management

### API Endpoints (`/api/accounts`)
| Endpoint | Description |
|----------|-------------|
| `POST /accounts/list` | Paginated account list |
| `POST /accounts/detail` | Account detail by ID |
| `POST /accounts/create` | Create account |
| `POST /accounts/update` | Update account |
| `POST /accounts/toggle-status` | Enable/disable account + login (`eb_enable_disable_account`) |
| `POST /accounts/delete` | Delete account |

### UI Features
- Account list page with search and filters
- Account detail/edit page
- Activate/Deactivate toggle (disables at account + login level)

---

## 5. Admin User Management

### API Endpoints (`/api/admin-users`)
| Endpoint | Description |
|----------|-------------|
| `POST /admin-users/list` | List admin users |
| `POST /admin-users/create` | Create admin user |
| `POST /admin-users/update` | Update admin user |
| `POST /admin-users/toggle-status` | Enable/disable admin user |
| `POST /admin-users/reset-password` | Reset admin user password |

### UI Features
- Admin users list page
- Create/Edit admin user forms
- Toggle status, reset password actions

---

## 6. GDPR Delete Operations (Phase 6)

### Database
- **Table**: `partner_admin_deletion_certificate` — permanent GDPR compliance records
- **SPs**:
  - `partner_admin_soft_delete_account` — mark account as deleted (reversible)
  - `partner_admin_hard_delete_profile` — cascading delete across 17 tables + certificate
  - `partner_admin_anonymize_profile` — mask PII, preserve statistical data + certificate
  - `partner_admin_restore_account` — reverse soft delete
- **SQL Script**: `partner-admin-dbscripts/15-sp-profile-delete-gdpr.sql`

### API Endpoints (`/api/profiles`)
| Endpoint | Description |
|----------|-------------|
| `POST /profiles/soft-delete` | Soft delete (deactivate + mark deleted, with reason) |
| `POST /profiles/restore` | Restore soft-deleted profile |
| `POST /profiles/hard-delete` | Permanent delete — requires typing "DELETE", reason type + notes |
| `POST /profiles/anonymize` | Anonymize PII — mask personal data, delete photos, issue certificate |
| `POST /profiles/deleted-list` | Paginated list of deleted profiles |
| `POST /profiles/deletion-certificates` | List all GDPR certificates |
| `POST /profiles/deletion-certificate` | Get single certificate detail |

### GDPR Features
- **Certificate codes**: `GDPR-DEL-YYYY-NNNNN` (hard delete) / `GDPR-ANO-YYYY-NNNNN` (anonymize)
- **Reason types**: Customer Phone/Email/Written Request, Legal/Court Order, Partner Decision, GDPR Subject Access Request, Other
- **Hard delete requires** typing "DELETE" to confirm
- **Azure blob cleanup** on hard delete and anonymize
- **Audit JSON** stored with each certificate for compliance

### UI Features
- **DeleteProfileDialog** component (dropdown menu):
  - Soft Delete — asks for reason text
  - Anonymize (GDPR) — reason type selector + notes, issues certificate
  - Permanent Delete — reason type + notes + type "DELETE" confirmation
- **Profiles List Page** — 3 tabs:
  - Active Profiles (default)
  - Deleted Profiles (with Restore button)
  - GDPR Certificates (table: code, type, holder, reason, date, status)

---

## 7. Profile PDF Export & View (Phase 8)

### Full Profile View (`/profiles/[id]/view`)
All sections loaded in parallel, displayed in a single print-friendly layout:

| Section | Display Format |
|---------|---------------|
| Profile Header | Photo + name + badges + age/gender/religion/caste |
| Personal Information | 3-column grid — DOB, height, weight, complexion, profession, etc. |
| Addresses | Grouped by type with country/state name resolution |
| Contacts | Type + value + primary flag |
| Education | Table — level, institution, field of study, year, grade |
| Employment | Table — company, title, city, date range |
| Family / References | Father, mother, siblings, 2 references with relations |
| Hobbies | Badge chips |
| Lifestyle | Grid — eating, diet, smoking, drinking, activity, sleep |
| Properties | Type, ownership, location, description |
| Photos | 4-column grid with watermark overlay |

### PDF Export
- **"Export PDF" button** — triggers `window.print()` with `@media print` CSS
- **Page watermark** — diagonal partner logo + brand name (8% opacity, visible only in print)
- **A4 page size** with 15mm margins
- **`break-inside: avoid`** on sections
- **Footer**: Generated date/time + "Confidential" + Profile ID

### Photo Watermark & Anti-Copy Protection

#### Server-Side (new uploads)
- **5-point logo watermark** at 15% opacity (corners + center)
- **Diagonal text watermark** — partner brand name repeated across image at 6% opacity
- Both baked into image pixels via Sharp — survives save/screenshot

#### Client-Side (view page deterrents)
| Protection | Implementation |
|------------|---------------|
| Right-click block | `contextmenu` event prevented on `.print-area` |
| Transparent shield | Invisible `div.photo-shield` overlay on each photo |
| No drag | `draggable={false}` + `onDragStart` prevented |
| No select | `user-select: none` + `pointer-events: none` on images |
| Blur on focus loss | Photos blur 12px when window loses focus (snipping tool deterrent) |
| Brand name banner | CSS `::after` overlay with partner name on each photo |

---

## 8. Partner & Branding

### API Endpoints (`/api/partner`)
| Endpoint | Description |
|----------|-------------|
| `POST /partner/info` | Get partner information |
| `POST /partner/domain-links` | Get partner domain links |
| `POST /partner/countries` | Get country list |
| `POST /partner/states` | Get states by country |
| `POST /partner/brand-config` | Get brand configuration |
| `POST /partner/brand-config/update` | Update brand configuration |

### Brand Configuration System (`BrandContext.tsx`)
- **6 template presets**: Modern, Classic, Elegant, Corporate, Minimal, Vibrant
- **Customizable**: primary/secondary/accent colors, font family, border radius
- **Layout variants**: sidebar style (standard/slim/dark/branded), login layout, header style
- **Dynamic**: CSS variables applied at runtime, logo injection, favicon, document title
- **Persisted**: localStorage + server sync

### UI Features
- Theme settings page (`/settings/themes`)
- Live preview of template presets
- Color picker and font customization
- Logo URL configuration

---

## 9. Audit Log

### API Endpoints (`/api/audit`)
| Endpoint | Description |
|----------|-------------|
| `POST /audit/list` | Paginated audit log entries |

### UI Features
- Audit log page with timestamp, user, action, details

---

## 10. Background Check Tracking (Phase 7)

### Database
- **Table**: `partner_admin_background_check_requests` — full lifecycle tracking
- **Columns**: check_id, partner_id, profile_id, check_type, status (enum: pending/in_progress/completed/failed/cancelled), requested_by, requested_at, updated_by, updated_at, completed_at, result_summary, notes, external_ref_id
- **5 new SPs**: create, update-status, get-by-profile, get-by-partner (paginated+filters), get-by-id
- **SQL Script**: `partner-admin-dbscripts/16-sp-background-check-v2.sql`

### API Endpoints (`/api/background-check`)
| Endpoint | Description | Roles |
|----------|-------------|-------|
| `POST /background-check/profile` | Get profile data for check (legacy) | Write |
| `POST /background-check/initiate` | Initiate check via activity_log (legacy) | Write |
| `POST /background-check/create` | Create tracked check request | Write |
| `POST /background-check/update-status` | Update check status + result summary | Write |
| `POST /background-check/profile-history` | Get all checks for a profile | All |
| `POST /background-check/list` | Paginated list with filters (status, type, date, search) | All |
| `POST /background-check/detail` | Single check detail with profile info | All |

### Check Types
- Identity Verification, Criminal Record Check, Employment Verification, Education Verification, Address Verification, Comprehensive Check

### Status Lifecycle
`pending` → `in_progress` → `completed` / `failed` / `cancelled`

### UI Features
- **Enhanced `/background-check` page** — 2 tabs:
  - **All Checks**: Paginated table with status/type/search filters, status badges (color-coded), View Detail modal, Update Status modal (with result summary for terminal states)
  - **New Check**: Search profile by ID → show profile details → select check type + external ref ID + notes → create
- **Background Check tab on profile detail page** (`BackgroundCheckForm.tsx`):
  - Check history table for the profile
  - Inline "New Check" form
  - Update Status and View Detail modals
  - Status badges: Pending (yellow), In Progress (blue), Completed (green), Failed (red), Cancelled (gray)

---

## 11. GDPR Certificate PDF Generation (Phase 6g)

### Technology
- **pdfkit** (~5MB, no browser dependency) for programmatic PDF generation

### API Endpoint
| Endpoint | Description |
|----------|-------------|
| `POST /profiles/deletion-certificate/download` | Generate and download GDPR certificate as PDF |

### PDF Layout
- A4 page with double border (accent color based on deletion type)
- Partner brand name header
- "GDPR COMPLIANCE CERTIFICATE" title
- Certificate code, type label, divider
- Details grid: holder name, email, account code, profile ID, reason type, performed by/at, legal basis, status
- Reason notes section
- Data categories affected section
- Tables/records affected section
- Compliance statement (different text for hard delete vs anonymize)
- Footer: generated date + partner name + "Confidential"

### UI Features
- **"PDF" download button** on each row in the GDPR Certificates tab
- Downloads as `{certificate_code}.pdf` (e.g., `GDPR-DEL-2026-00001.pdf`)
- Loading spinner while generating

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **API Endpoints (Total)** | 86 |
| **Profile CRUD Endpoints** | 55 |
| **Background Check Endpoints** | 7 |
| **Database Scripts** | 18 SQL files |
| **UI Pages** | 14 |
| **UI Components (Profile)** | 15 form components (incl. BackgroundCheckForm) |
| **Stored Procedures Used** | 55+ (eb_* + partner_admin_*) |
| **Lookup Categories** | 17+ cached categories |

---

## Deployment

| Target | Platform | URL |
|--------|----------|-----|
| API (Dev/Test) | Vercel | https://ekam-admin-api.vercel.app |
| UI (Dev/Test) | Vercel | https://ekam-admin-ui.vercel.app |
| API (Production) | Azure | TBD |
| UI (Production) | Azure | TBD |

### Environment Variables
**API**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`
**UI**: `NEXT_PUBLIC_API_URL`

---

## Pending / Deferred Items

| Item | Priority | Notes |
|------|----------|-------|
| Replace getCountries/getStates SPs | Medium | Switch to `lkp_get_Country_List` / `lkp_get_Country_States` |
| Phase 9 — Advanced Search | Future | Age range, religion, caste filters on profile list |
| Phase 10 — Reporting & Analytics | Future | Charts, export, partner metrics |
| Phase 10 — Tests | Future | ~210 new tests across all phases |
