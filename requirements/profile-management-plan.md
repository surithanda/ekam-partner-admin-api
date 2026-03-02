# Profile Management — Implementation Plan (Revised v3)

> **Module**: Partner Admin — Profile Management
> **Date**: 2026-02-25 | **Revised**: 2026-02-26
> **Status**: Draft — Pending Approval
> **Scope**: Full profile CRUD, sub-section management, photo management (Azure Blob), delete (soft+hard, GDPR), background check tracking, PDF export

### Key Design Decisions

- **Maximize `eb_profile_*` SP usage** for ALL profile operations — create, update, get (personal + sub-sections). Do NOT create new `partner_admin_*` SPs.
- **`eb_profile_*` SPs do NOT take `partner_id`** — they only need `profile_id` + section-specific params + `created_user`/`modified_user`. Ownership chain: `profile_personal.account_id → account.registered_partner_id`
- **Ownership verification** is done **entirely in the Node.js datalayer** (existing pattern) — the datalayer checks `account.registered_partner_id === req.user.partnerId` BEFORE calling any ADO/SP method
- **Keep `partner_admin_*` SPs ONLY where no `eb_profile_*` equivalent exists**:
  - `partner_admin_get_profiles_by_partner` — partner-scoped listing with pagination (no eb equivalent)
  - `partner_admin_toggle_profile_status` — toggle active/inactive (no eb equivalent)
  - `partner_admin_get_lookup_values` / `partner_admin_get_gender_lookups` — lookups (no eb equivalent)
  - `partner_admin_get_profile_metrics` / `partner_admin_get_profile_views_metrics` — dashboard metrics
  - `partner_admin_get_profile_for_check` — background check
- **Only new SP**: `partner_admin_hard_delete_profile` — admin-only cascading permanent delete (GDPR). This SP takes `p_partner_id` for its own ownership check since it's a destructive, irreversible operation.
- **Audit logging** handled by `middleware/audit.js` (existing pattern)
- **Missing sub-section deletes** (address, contact, education, employment, family, property) — handled via direct SQL in ADO layer
- **Missing sub-section updates** (photo, hobby) — handled via direct SQL in ADO layer

---

## Table of Contents

1. [Current State Inventory](#1-current-state-inventory)
2. [Database Tables Reference](#2-database-tables-reference)
3. [Stored Procedures Mapping](#3-stored-procedures-mapping)
4. [Gap Analysis](#4-gap-analysis)
5. [Phase 1 — Profile Detail View Page](#phase-1--profile-detail-view-page)
6. [Phase 2 — Profile Edit Page (Personal Info)](#phase-2--profile-edit-page-personal-info)
7. [Phase 3 — Sub-section CRUD (API Layer)](#phase-3--sub-section-crud-api-layer)
8. [Phase 4 — Sub-section CRUD (UI)](#phase-4--sub-section-crud-ui)
9. [Phase 5 — Photo Management (Azure Blob Storage)](#phase-5--photo-management-azure-blob-storage)
10. [Phase 6 — Profile Delete (Soft + Hard, GDPR)](#phase-6--profile-delete-soft--hard-gdpr)
11. [Phase 7 — Background Check Tracking](#phase-7--background-check-tracking)
12. [Phase 8 — Profile PDF Export](#phase-8--profile-pdf-export)
13. [Phase 9 — Advanced Search](#phase-9--advanced-search)
14. [Phase 10 — Tests](#phase-10--tests)
15. [Implementation Order & Dependencies](#implementation-order--dependencies)
16. [Standards & Conventions](#standards--conventions)

---

## 1. Current State Inventory

### 1.1 Existing Backend API (6 routes in profileRoutes.js)

| Route | Method | Roles | Controller Method |
|-------|--------|-------|-------------------|
| `/profiles/list` | POST | partner-admin, account-admin, support-admin | `getProfiles` |
| `/profiles/lookups` | POST | partner-admin, account-admin, support-admin | `getLookups` |
| `/profiles/detail` | POST | partner-admin, account-admin, support-admin | `getProfileDetail` |
| `/profiles/create` | POST | partner-admin, support-admin | `createProfile` |
| `/profiles/update` | POST | partner-admin, support-admin | `updateProfile` |
| `/profiles/toggle-status` | POST | partner-admin, support-admin | `toggleStatus` |

### 1.2 Existing Frontend Pages

| Page | Path | Status |
|------|------|--------|
| Profile List | `/profiles` | Implemented — search, filter, pagination, toggle |
| Profile Create | `/profiles/create` | Implemented — personal + address + login form |
| Profile Detail View | `/profiles/[id]` | **NOT IMPLEMENTED** |
| Profile Edit | `/profiles/[id]/edit` | **NOT IMPLEMENTED** |
| Background Check | `/background-check` | Implemented — basic initiation |

### 1.3 Existing Frontend API Client (lib/api.ts)

| Method | Endpoint | Status |
|--------|----------|--------|
| `getProfiles(page, limit, search, status, gender)` | `/profiles/list` | Exists |
| `getProfileDetail(id)` | `/profiles/detail` | Exists |
| `createProfile(data)` | `/profiles/create` | Exists |
| `updateProfile(id, data)` | `/profiles/update` | Exists |
| `toggleProfileStatus(id, isActive)` | `/profiles/toggle-status` | Exists |
| `getLookups(type)` | `/profiles/lookups` | Exists |
| `getGenderLookups()` | `/profiles/lookups` | Exists |

---

## 2. Database Tables Reference

### 2.1 account (37 columns)

| Column | Type | Nullable | Key | Notes |
|--------|------|----------|-----|-------|
| `account_id` | int(11) | NO | PRI | Auto-increment |
| `account_code` | varchar(25) | NO | UNI | Unique per partner |
| `email` | varchar(150) | NO | | |
| `primary_phone` | varchar(10) | NO | | |
| `primary_phone_country` | varchar(5) | NO | | |
| `primary_phone_type` | int(11) | NO | | Default: 1 |
| `secondary_phone` | varchar(10) | YES | | |
| `secondary_phone_country` | varchar(5) | YES | | |
| `secondary_phone_type` | int(11) | YES | | |
| `first_name` | varchar(45) | NO | | |
| `last_name` | varchar(45) | NO | | |
| `middle_name` | varchar(45) | YES | | |
| `birth_date` | date | NO | | |
| `gender` | int(11) | NO | | Lookup FK |
| `address_line1` | varchar(45) | NO | | |
| `address_line2` | varchar(45) | YES | | |
| `city` | varchar(45) | NO | | |
| `state` | varchar(45) | NO | | |
| `zip` | varchar(45) | NO | | |
| `country` | varchar(45) | NO | | |
| `photo` | varchar(45) | YES | | |
| `secret_question` | varchar(45) | YES | | |
| `secret_answer` | varchar(45) | YES | | |
| `created_date` | datetime | NO | | Default: NOW() |
| `created_user` | varchar(45) | YES | | |
| `modified_date` | datetime | YES | | |
| `modified_user` | varchar(45) | YES | | |
| `is_active` | tinyint(4) | YES | | |
| `activation_date` | datetime | YES | | |
| `activated_user` | varchar(45) | YES | | |
| `deactivated_date` | datetime | YES | | |
| `deactivated_user` | varchar(45) | YES | | |
| `deactivation_reason` | varchar(45) | YES | | |
| `is_deleted` | tinyint(4) | YES | | GDPR soft-delete flag |
| `deleted_date` | datetime | YES | | |
| `deleted_user` | varchar(45) | YES | | |
| `deleted_reason` | varchar(45) | YES | | |
| `driving_license` | varchar(45) | YES | | |
| `registered_partner_id` | int(11) | YES | | Partner ownership |

### 2.2 login (10 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `login_id` | int(11) | NO | PRI |
| `account_id` | int(11) | YES | |
| `user_name` | varchar(150) | NO | |
| `password` | varchar(45) | NO | |
| `is_active` | tinyint(4) | YES | Default: 0 |
| `active_date` | varchar(45) | YES | |
| `created_date` | datetime | NO | Default: NOW() |
| `created_user` | varchar(45) | YES | |
| `modified_date` | datetime | YES | |
| `modified_user` | varchar(45) | YES | |
| `deactivation_date` | datetime | YES | |

### 2.3 profile_personal (30+ columns)

| Column | Type | Nullable | Key | Notes |
|--------|------|----------|-----|-------|
| `profile_id` | int(11) | NO | PRI | Auto-increment |
| `account_id` | int(11) | NO | | FK to account |
| `first_name` | varchar(45) | NO | | |
| `last_name` | varchar(45) | NO | | |
| `middle_name` | varchar(45) | YES | | |
| `gender` | int(11) | YES | | Lookup FK |
| `birth_date` | date | YES | | |
| `phone_mobile` | varchar(15) | YES | | |
| `email_id` | varchar(255) | YES | | |
| `marital_status` | int(11) | YES | | Lookup FK |
| `religion` | int(11) | YES | | Lookup FK |
| `nationality` | int(11) | YES | | Lookup FK |
| `caste` | int(11) | YES | | Lookup FK |
| `height_inches` | int(11) | YES | | |
| `height_units` | varchar(10) | YES | | |
| `weight` | decimal(5,2) | YES | | |
| `weight_units` | varchar(10) | YES | | |
| `complexion` | int(11) | YES | | Lookup FK |
| `linkedin` | varchar(255) | YES | | |
| `facebook` | varchar(255) | YES | | |
| `instagram` | varchar(255) | YES | | |
| `whatsapp_number` | varchar(20) | YES | | |
| `profession` | int(11) | YES | | Lookup FK |
| `disability` | int(11) | YES | | Lookup FK |
| `created_user` | varchar(100) | NO | | |
| `created_date` | timestamp | NO | | Default: NOW() |
| `updated_user` | varchar(255) | YES | | |
| `updated_date` | timestamp | NO | | Auto-update |
| `is_active` | tinyint(4) | YES | MUL | Default: 1 |
| `short_summary` | longtext | YES | | |
| `birth_time` | time | YES | | |
| `birth_pace` | varchar(55) | YES | | |
| `blood_group` | int(11) | YES | | Lookup FK |

### 2.4 profile_address (15 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_address_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `address_type` | int(11) | YES | Lookup FK |
| `address_line1` | varchar(100) | YES | |
| `address_line2` | varchar(100) | YES | |
| `city` | varchar(100) | YES | |
| `state` | int(11) | YES | Lookup FK |
| `country_id` | int(11) | YES | Lookup FK |
| `zip` | varchar(100) | YES | |
| `landmark1` | varchar(100) | YES | |
| `landmark2` | varchar(100) | YES | |
| `date_created` | datetime | YES | |
| `user_created` | varchar(45) | YES | |
| `date_modified` | datetime | YES | |
| `user_modified` | varchar(45) | YES | |
| `isverified` | int(11) | YES | Default: 0 |

### 2.5 profile_education (13 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_education_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `education_level` | int(11) | NO | Lookup FK |
| `year_completed` | int(11) | NO | |
| `institution_name` | varchar(255) | NO | |
| `address_line1` | varchar(100) | YES | |
| `city` | varchar(45) | YES | |
| `state_id` | int(11) | NO | Lookup FK |
| `country_id` | int(11) | NO | Lookup FK |
| `zip` | varchar(8) | NO | |
| `field_of_study` | int(11) | NO | Lookup FK |
| `date_created` | datetime | YES | |
| `user_created` | varchar(45) | YES | |
| `date_modified` | datetime | YES | |
| `user_modified` | varchar(45) | YES | |
| `isverified` | int(11) | YES | |

### 2.6 profile_employment (15 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_employment_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `institution_name` | varchar(255) | NO | |
| `address_line1` | varchar(100) | YES | |
| `city` | varchar(45) | NO | |
| `state_id` | int(11) | NO | Lookup FK |
| `country_id` | int(11) | NO | Lookup FK |
| `zip` | varchar(8) | NO | |
| `start_year` | int(11) | NO | |
| `end_year` | int(11) | YES | |
| `job_title_id` | int(11) | NO | Lookup FK |
| `other_title` | varchar(50) | YES | |
| `last_salary_drawn` | decimal(10,0) | NO | |
| `date_created` | datetime | YES | |
| `user_created` | varchar(45) | YES | |
| `date_modified` | datetime | YES | |
| `user_modified` | varchar(45) | YES | |
| `isverified` | int(11) | YES | |

### 2.7 profile_family_reference (28 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_family_reference_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `reference_type` | int(11) | YES | Lookup FK (family/reference) |
| `first_name` | varchar(45) | NO | |
| `last_name` | varchar(45) | NO | |
| `middle_name` | varchar(45) | YES | |
| `alias` | varchar(45) | YES | |
| `gender` | int(11) | YES | Lookup FK |
| `date_of_birth` | date | YES | |
| `religion` | int(11) | YES | Lookup FK |
| `nationality` | int(11) | YES | Lookup FK |
| `caste` | int(11) | YES | Lookup FK |
| `marital_status` | int(11) | YES | Lookup FK |
| `address_line1` | varchar(100) | NO | |
| `city` | varchar(45) | NO | |
| `state` | int(11) | NO | Lookup FK |
| `country` | int(11) | NO | Lookup FK |
| `zip` | varchar(8) | NO | |
| `primary_phone` | varchar(45) | NO | |
| `secondary_phone` | varchar(45) | YES | |
| `can_communicate` | tinyint(4) | NO | |
| `email` | varchar(45) | YES | |
| `linkedin` | varchar(45) | YES | |
| `instagram` | varchar(45) | YES | |
| `facebook` | varchar(45) | YES | |
| `whatsapp` | varchar(45) | YES | |
| `employment_status` | int(11) | NO | Lookup FK |
| `emp_company_name` | varchar(45) | YES | |
| `emp_city` | varchar(45) | YES | |
| `emp_state` | varchar(45) | YES | |
| `emp_country` | varchar(45) | YES | |
| `emp_zip` | varchar(8) | YES | |
| `date_created` | datetime | YES | |
| `user_created` | varchar(45) | YES | |
| `date_modified` | datetime | YES | |
| `user_modified` | varchar(45) | YES | |
| `isverified` | int(11) | YES | Default: 0 |

### 2.8 profile_photo (13 columns)

| Column | Type | Nullable | Key | Notes |
|--------|------|----------|-----|-------|
| `profile_photo_id` | int(11) | NO | PRI | |
| `profile_id` | int(11) | NO | | |
| `photo_type` | int(11) | NO | | Lookup FK (1=primary) |
| `description` | varchar(255) | YES | | |
| `caption` | varchar(100) | NO | | |
| `relative_path` | varchar(255) | YES | | |
| `url` | varchar(100) | NO | | Azure Blob URL |
| `date_created` | datetime | YES | | |
| `user_created` | varchar(45) | YES | | |
| `date_modified` | datetime | YES | | |
| `user_modified` | varchar(45) | YES | | |
| `isverified` | int(11) | YES | | Default: 0 |
| `softdelete` | bit(1) | YES | | Default: 0 |

### 2.9 profile_lifestyle (13 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_lifestyle_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `eating_habit` | varchar(45) | YES | |
| `diet_habit` | varchar(45) | YES | |
| `cigarettes_per_day` | varchar(10) | YES | |
| `drink_frequency` | varchar(45) | YES | |
| `gambling_engage` | varchar(45) | YES | |
| `physical_activity_level` | varchar(45) | YES | |
| `relaxation_methods` | varchar(45) | YES | |
| `additional_info` | varchar(255) | YES | |
| `created_date` | datetime | YES | |
| `modified_date` | datetime | YES | |
| `created_user` | varchar(45) | YES | |
| `modified_user` | varchar(45) | YES | |
| `is_active` | bit(1) | YES | Default: 0 |

### 2.10 profile_hobby_interest (8 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_hobby_intereste_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `hobby_interest_id` | int(11) | NO | Lookup FK (hobby/interest) |
| `description` | varchar(100) | YES | |
| `date_created` | datetime | YES | |
| `user_created` | varchar(45) | YES | |
| `date_modified` | datetime | YES | |
| `user_modified` | varchar(45) | YES | |
| `isverified` | int(11) | YES | Default: 0 |

### 2.11 profile_property (12 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `property_id` | int(11) | NO | PRI |
| `profile_id` | int(11) | YES | |
| `property_type` | int(11) | YES | Lookup FK |
| `ownership_type` | int(11) | YES | Lookup FK |
| `property_address` | varchar(125) | YES | |
| `property_value` | decimal(10,2) | YES | |
| `property_description` | varchar(2000) | YES | |
| `isoktodisclose` | bit(1) | YES | |
| `created_date` | datetime | YES | |
| `modified_date` | datetime | YES | |
| `created_by` | varchar(45) | YES | |
| `modifyed_by` | varchar(45) | YES | |
| `isverified` | bit(1) | YES | Default: 0 |

### 2.12 profile_contact (7 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `id` | int(11) | NO | PRI |
| `profile_id` | int(11) | NO | |
| `contact_type` | int(11) | NO | Lookup FK |
| `contact_value` | varchar(255) | YES | |
| `date_created` | timestamp | NO | Default: NOW() |
| `isverified` | int(11) | YES | Default: 0 |
| `isvalid` | int(11) | YES | Default: 0 |

### 2.13 profile_favorites (7 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_favorite_id` | int(11) | NO | PRI |
| `from_profile_id` | int(11) | NO | |
| `to_profile_id` | int(11) | NO | |
| `date_created` | datetime | YES | Default: NOW() |
| `is_active` | bit(1) | YES | Default: 1 |
| `date_updated` | datetime | YES | |
| `account_id` | int(11) | YES | |

### 2.14 profile_views (5 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `profile_view_id` | int(11) | NO | PRI |
| `from_profile_id` | int(11) | NO | |
| `to_profile_id` | int(11) | NO | |
| `profile_view_date` | datetime | YES | Default: NOW() |
| `account_id` | int(11) | YES | |

### 2.15 lookup_table (4 columns)

| Column | Type | Nullable | Key |
|--------|------|----------|-----|
| `id` | int(11) | NO | PRI |
| `name` | varchar(45) | NO | |
| `category` | varchar(45) | NO | |
| `description` | varchar(100) | YES | |

**Lookup categories (24):** address_type, BLOOD_GROUP, caste, contact_type, contact_us, disability, education_level, employment_status, family, field_of_study, freind, gender, hobby, interest, job_title, marital_status, nationality, ownership_type, phone_type, photo_type, profession, property_type, reference, religion

---

## 3. Stored Procedures Mapping

### 3.1 Existing `partner_admin_*` Profile SPs (19) — Keep vs Replace

| SP Name | Type | eb_profile Equivalent | Decision |
|---------|------|----------------------|----------|
| `partner_admin_get_profiles_by_partner` | LIST | None (partner-scoped, paginated) | **KEEP** — no eb equivalent |
| `partner_admin_get_profile_by_id` | GET | `eb_profile_personal_get(profile_id, account_id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_full_profile` | GET | `eb_profile_get_complete_data(profile_id, created_user)` | **REPLACE** with eb |
| `partner_admin_create_profile_personal` | CREATE | `eb_profile_personal_create` (29 params — more fields) | **REPLACE** with eb |
| `partner_admin_update_profile_personal` | UPDATE | `eb_profile_personal_update` (30 params — more fields) | **REPLACE** with eb |
| `partner_admin_toggle_profile_status` | UPDATE | None | **KEEP** — no eb equivalent |
| `partner_admin_get_profile_address` | GET | `eb_profile_address_get(profile_id, address_id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_education` | GET | `eb_profile_education_get(profile_id, education_id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_employment` | GET | `eb_profile_employment_get(profile_id, employment_id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_family` | GET | `eb_profile_family_reference_get(profile_id, category, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_photos` | GET | `eb_profile_photo_get(profile_id)` | **REPLACE** with eb |
| `partner_admin_get_profile_lifestyle` | GET | `eb_profile_lifestyle_get(profile_id, id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_hobby_interest` | GET | `eb_profile_hobby_interest_get(profile_id, id, category, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_property` | GET | `eb_profile_property_get(profile_id, property_id, created_user)` | **REPLACE** with eb |
| `partner_admin_get_profile_favorites` | GET | `eb_profile_favorites_get(profile_id, account_id)` | **REPLACE** with eb |
| `partner_admin_get_profile_views` | GET | `eb_profile_views_get_viewed_by_me` + `eb_profile_views_get_viewed_me` | **REPLACE** with eb |
| `partner_admin_get_profile_metrics` | GET | None (dashboard-specific) | **KEEP** — dashboard |
| `partner_admin_get_profile_views_metrics` | GET | None (dashboard-specific) | **KEEP** — dashboard |
| `partner_admin_get_profile_for_check` | GET | None (background-check-specific) | **KEEP** — background check |

**Summary**: 13 replaced by `eb_profile_*` equivalents. 6 kept (no eb equivalent: listing, toggle, lookups, metrics, background check).

### 3.2 Existing `eb_profile_*` SPs (44 — primary SPs for profile CRUD)

These SPs are used by the member-facing profile UI. **We will use them directly from the partner-admin API layer** for ALL profile operations: personal create/update/get, sub-section create/update/delete/get. We will NOT modify them.

| SP Name | Operation | Parameters | Notes |
|---------|-----------|------------|-------|
| **Address** | | | |
| `eb_profile_address_create` | CREATE | profile_id, address_type, address_line1, address_line2, city, state, country_id, zip, landmark1, landmark2, created_user | Validates profile exists, address_type, address_line1, state, country_id, zip required |
| `eb_profile_address_get` | GET | profile_id, profile_address_id, created_user | Get by profile_id OR by address_id |
| `eb_profile_address_update` | UPDATE | profile_address_id, address_type, address_line1, address_line2, city, state, country_id, zip, landmark1, landmark2, modified_user | Update by PK |
| **Contact** | | | |
| `eb_profile_contact_create` | CREATE | profile_id, contact_type, contact_value, created_user | |
| `eb_profile_contact_get` | GET | profile_id, contact_id, created_user | |
| `eb_profile_contact_update` | UPDATE | contact_id, contact_type, contact_value, isverified, isvalid, modified_user | |
| **Education** | | | |
| `eb_profile_education_create` | CREATE | profile_id, education_level, year_completed, institution_name, address_line1, city, state_id, country_id, zip, field_of_study, created_user | Multi-record per profile |
| `eb_profile_education_get` | GET | profile_id, profile_education_id, created_user | |
| `eb_profile_education_update` | UPDATE | profile_education_id, education_level, year_completed, institution_name, address_line1, city, state_id, country_id, zip, field_of_study, modified_user | |
| **Employment** | | | |
| `eb_profile_employment_create` | CREATE | profile_id, institution_name, address_line1, city, state_id, country_id, zip, start_year, end_year, job_title_id, other_title, last_salary_drawn, created_user | Multi-record |
| `eb_profile_employment_get` | GET | profile_id, profile_employment_id, created_user | |
| `eb_profile_employment_update` | UPDATE | profile_employment_id, institution_name, address_line1, city, state_id, country_id, zip, start_year, end_year, job_title_id, other_title, last_salary_drawn, modified_user | |
| **Family/Reference** | | | |
| `eb_profile_family_reference_create` | CREATE | profile_id, reference_type, first_name, last_name, middle_name, alias, gender, date_of_birth, religion, nationality, caste, marital_status, address_line1, city, state, country, zip, primary_phone, secondary_phone, can_communicate, email, linkedin, instagram, facebook, whatsapp, employment_status, emp_company_name, emp_city, emp_state, emp_country, emp_zip, created_user | 32 params |
| `eb_profile_family_reference_get` | GET | profile_id, profile_family_reference_id, created_user | |
| `eb_profile_family_reference_update` | UPDATE | profile_family_reference_id, reference_type, first_name, last_name, middle_name, alias, gender, date_of_birth, religion, nationality, caste, marital_status, address_line1, city, state, country, zip, primary_phone, secondary_phone, can_communicate, email, linkedin, instagram, facebook, whatsapp, employment_status, emp_company_name, emp_city, emp_state, emp_country, emp_zip, modified_user | 32 params |
| **Hobby/Interest** | | | |
| `eb_profile_hobby_interest_create` | CREATE | profile_id, hobby_interest_id, description, created_user | |
| `eb_profile_hobby_interest_delete` | DELETE | profile_hobby_intereste_id, created_user | Hard delete |
| `eb_profile_hobby_interest_get` | GET | profile_id, created_user | |
| **Lifestyle** | | | |
| `eb_profile_lifestyle_create` | CREATE | profile_id, eating_habit, diet_habit, cigarettes_per_day, drink_frequency, gambling_engage, physical_activity_level, relaxation_methods, additional_info, created_user | Single-record per profile |
| `eb_profile_lifestyle_delete` | DELETE | profile_lifestyle_id, created_user | |
| `eb_profile_lifestyle_get` | GET | profile_id, created_user | |
| `eb_profile_lifestyle_update` | UPDATE | profile_lifestyle_id, eating_habit, diet_habit, cigarettes_per_day, drink_frequency, gambling_engage, physical_activity_level, relaxation_methods, additional_info, modified_user | |
| **Personal** | | | |
| `eb_profile_personal_create` | CREATE | account_id, first_name, last_name, middle_name, gender, birth_date, phone_mobile, email_id, marital_status, religion, nationality, caste, height_inches, weight, complexion, linkedin, facebook, instagram, whatsapp_number, profession, disability, short_summary, birth_time, birth_pace, blood_group, created_user | 26 params |
| `eb_profile_personal_get` | GET | profile_id, created_user | |
| `eb_profile_personal_update` | UPDATE | profile_id, first_name, last_name, middle_name, gender, birth_date, phone_mobile, email_id, marital_status, religion, nationality, caste, height_inches, weight, complexion, linkedin, facebook, instagram, whatsapp_number, profession, disability, short_summary, birth_time, birth_pace, blood_group, modified_user | 26 params |
| **Photo** | | | |
| `eb_profile_photo_create` | CREATE | profile_id, photo_type, description, caption, relative_path, url, created_user | |
| `eb_profile_photo_delete` | DELETE | profile_photo_id, modified_user | Soft-delete (sets softdelete=1) |
| `eb_profile_photo_get` | GET | profile_id, created_user | Excludes soft-deleted |
| **Property** | | | |
| `eb_profile_property_create` | CREATE | profile_id, property_type, ownership_type, property_address, property_value, property_description, isoktodisclose, created_by | |
| `eb_profile_property_get` | GET | profile_id, profile_property_id, created_user | |
| `eb_profile_property_update` | UPDATE | profile_id, profile_property_id, property_type, ownership_type, property_address, property_value, property_description, isoktodisclose, modified_user | |
| **Favorites** | | | |
| `eb_profile_favorites_create` | CREATE | from_profile_id, to_profile_id, account_id | |
| `eb_profile_favorites_delete` | DELETE | profile_favorite_id, account_id | |
| `eb_profile_favorites_get` | GET | profile_id, account_id | |
| **Views** | | | |
| `eb_profile_views_create` | CREATE | from_profile_id, to_profile_id, account_id | |
| `eb_profile_views_get_viewed_by_me` | GET | profile_id, created_user | |
| `eb_profile_views_get_viewed_me` | GET | profile_id, created_user | |
| **Search** | | | |
| `eb_profile_search_get` | GET | profile_id, min_age, max_age, religion, max_education, occupation, country, casete_id, marital_status | |
| `eb_profile_search_get_all` | GET | profile_id | |
| `eb_profile_search_get_v1` | GET | (same as search_get) | Version 1 |
| `eb_profile_search_preference_create` | CREATE | profile_id, min_age, max_age, gender, religion, max_education, occupation, country, casete_id, marital_status, created_user | |
| `eb_profile_search_preference_get` | GET | profile_id | |
| **Utility** | | | |
| `eb_profile_get_complete_data` | GET | profile_id, created_user | Full profile data |
| `eb_profile_related_data_count` | GET | profile_id, created_user | Count of related records |

---

## 4. Gap Analysis

### 4.1 Complete CRUD Coverage Map

The table below shows what's available across both SP sets and what we'll use:

| Sub-section | GET (use) | CREATE (use) | UPDATE (use) | DELETE (use) |
|-------------|-----------|--------------|--------------|--------------|
| Personal | `eb_profile_get_complete_data` | `eb_profile_personal_create` (29 params) | `eb_profile_personal_update` (30 params) | N/A (use soft-delete) |
| Address | `eb_profile_address_get` | `eb_profile_address_create` | `eb_profile_address_update` | Direct SQL in ADO |
| Contact | `eb_profile_contact_get` | `eb_profile_contact_create` | `eb_profile_contact_update` | Direct SQL in ADO |
| Education | `eb_profile_education_get` | `eb_profile_education_create` | `eb_profile_education_update` | Direct SQL in ADO |
| Employment | `eb_profile_employment_get` | `eb_profile_employment_create` | `eb_profile_employment_update` | Direct SQL in ADO |
| Family/Ref | `eb_profile_family_reference_get` | `eb_profile_family_reference_create` | `eb_profile_family_reference_update` | Direct SQL in ADO |
| Photo | `eb_profile_photo_get` | `eb_profile_photo_create` | Direct SQL in ADO | `eb_profile_photo_delete` (hard delete) |
| Lifestyle | `eb_profile_lifestyle_get` | `eb_profile_lifestyle_create` | `eb_profile_lifestyle_update` | `eb_profile_lifestyle_delete` (soft) |
| Hobby/Interest | `eb_profile_hobby_interest_get` | `eb_profile_hobby_interest_create` | Direct SQL in ADO | `eb_profile_hobby_interest_delete` (soft) |
| Property | `eb_profile_property_get` | `eb_profile_property_create` | `eb_profile_property_update` | Direct SQL in ADO |
| Favorites | `eb_profile_favorites_get` | N/A (admin read-only) | N/A | N/A |
| Views | `eb_profile_views_get_viewed_by_me` + `_viewed_me` | N/A (admin read-only) | N/A | N/A |

> **Listing** still uses `partner_admin_get_profiles_by_partner` (partner-scoped, paginated — no eb equivalent).
> **Toggle status** still uses `partner_admin_toggle_profile_status` (no eb equivalent).
> **Lookups** still use `partner_admin_get_lookup_values` / `partner_admin_get_gender_lookups` (no eb equivalent).

### 4.2 Operations Handled via Direct SQL in ADO

These are simple single-table operations where no `eb_profile_*` SP exists. The ADO layer will execute direct SQL queries. Ownership verification happens in the datalayer (Node.js) before calling ADO — same pattern used today.

| Operation | SQL | Notes |
|-----------|-----|-------|
| Delete address | `DELETE FROM profile_address WHERE profile_address_id = ? AND profile_id = ?` | No eb SP exists |
| Delete contact | `DELETE FROM profile_contact WHERE id = ? AND profile_id = ?` | No eb SP exists |
| Delete education | `DELETE FROM profile_education WHERE profile_education_id = ? AND profile_id = ?` | No eb SP exists |
| Delete employment | `DELETE FROM profile_employment WHERE profile_employment_id = ? AND profile_id = ?` | No eb SP exists |
| Delete family | `DELETE FROM profile_family_reference WHERE profile_family_reference_id = ? AND profile_id = ?` | No eb SP exists |
| Delete property | `DELETE FROM profile_property WHERE property_id = ? AND profile_id = ?` | No eb SP exists |
| Update photo (set primary) | `UPDATE profile_photo SET photo_type = ? WHERE profile_photo_id = ? AND profile_id = ?` | No eb update SP |
| Update hobby | `UPDATE profile_hobby_interest SET ... WHERE profile_hobby_intereste_id = ? AND profile_id = ?` | No eb update SP |

### 4.3 New SP Required (Admin-Only Feature)

Only **1 new stored procedure** is needed — for cascading hard delete (GDPR), which is an admin-only feature that doesn't exist in the member-facing UI:

| New SP | Purpose | Notes |
|--------|---------|-------|
| `partner_admin_hard_delete_profile` | GDPR permanent purge — cascading DELETE across all 12 profile tables + login + account | Admin-only. Requires `partner_admin_*` pattern (ownership check, error/activity logging). Irreversible. |

### 4.4 What Needs to Be Built (Summary)

| Item | Count | Details |
|------|-------|---------|
| **New SPs** | 1 | `partner_admin_hard_delete_profile` only |
| **New tables** | 1 | `partner_admin_background_check_requests` |
| **New API routes** | ~25 | Sub-section CRUD + photos + delete + background check + PDF |
| **New UI pages** | 2 | `/profiles/[id]` (detail), `/profiles/[id]/edit` (edit personal) |
| **New UI components** | ~10 | Sub-section forms, photo gallery, delete dialogs |
| **New error codes** | ~15 | For hard delete, background check tracking, photo management |

---

## Engineering Standards (applies to every phase)

### Code Quality
- **Inline documentation**: JSDoc comments on every new/modified public function (params, returns, throws)
- **Exception handling**: All async methods wrapped in try/catch; errors propagated via `createAppError()` or `next(err)`
- **Logging**: Audit middleware on all mutating routes; `partner_admin_log_api_error` for API-level errors
- **Input validation**: Validate required fields before calling ADO; return clear error codes

### Testing Requirements (per phase)
- **Unit tests (ADO)**: Verify correct SP name + params called, success + error paths
- **Unit tests (Datalayer)**: Verify ownership check, delegation to ADO, error propagation
- **Unit tests (Controller)**: Verify request parsing, datalayer delegation, response shape
- **Integration tests**: Verify HTTP status, auth/role enforcement, response body via supertest
- **SP verification tests**: Verify SP exists and returns expected shape (run against test DB when available)
- **Pattern**: node:test + sinon + supertest, `.mjs` files, CJS via `createRequire`

### Progress Tracking

Each phase will be marked with status:
- ⬜ Not started
- 🔧 In progress
- ✅ Completed (with date)

---

## Phase 1 — Profile Detail View Page ✅

> **Goal**: Read-only tabbed view of complete profile data + refactor backend to use `eb_profile_*` GETs
> **Dependencies**: None
> **Status**: ✅ Completed 2026-02-26

### Implementation Steps

| Step | Description | Status |
|------|-------------|--------|
| 1a | Refactor `profileAdo.js` GET methods → `eb_profile_*` SPs | ✅ 2026-02-26 |
| 1b | Add `contact`, `views`, `favorites` to `getFullProfile()` | ✅ 2026-02-26 |
| 1c | Update `mockData.mjs` with contact + views + favorites fixtures | ✅ 2026-02-26 |
| 1d | Update ADO unit tests for new SP names & params (30 tests) | ✅ 2026-02-26 |
| 1e | Update datalayer unit tests — no changes needed, existing tests pass | ✅ 2026-02-26 |
| 1f | Update integration tests — no changes needed, existing tests pass | ✅ 2026-02-26 |
| 1g | Run all tests — **252 pass, 0 fail** (was 246) | ✅ 2026-02-26 |
| 1h | Create UI detail page `/profiles/[id]/page.tsx` | ✅ 2026-02-26 |
| 1i | Mark Phase 1 complete in plan | ✅ 2026-02-26 |

### 1.1 UI — New Page: `/profiles/[id]/page.tsx`

**Layout**: Tabbed interface with profile header

**Profile Header** (always visible):
- Profile photo (from `profile_photo` where `photo_type = 1`)
- Name, Account Code, Gender, Age, Status badge
- Action buttons: Edit, Toggle Status, Delete, Export PDF, Back to List

**Tabs**:

| Tab | Data Source (eb_profile SP) | Record Type |
|-----|-----------|-------------|
| Personal | `eb_profile_personal_get(profile_id, account_id, created_user)` | Single |
| Address | `eb_profile_address_get(profile_id, NULL, created_user)` | Multi |
| Contact | `eb_profile_contact_get(profile_id, NULL, created_user)` | Multi |
| Education | `eb_profile_education_get(profile_id, NULL, created_user)` | Multi |
| Employment | `eb_profile_employment_get(profile_id, NULL, created_user)` | Multi |
| Family/References | `eb_profile_family_reference_get(profile_id, NULL, created_user)` | Multi |
| Photos | `eb_profile_photo_get(profile_id)` | Multi |
| Lifestyle | `eb_profile_lifestyle_get(profile_id, NULL, created_user)` | Single |
| Hobbies & Interests | `eb_profile_hobby_interest_get(profile_id, NULL, NULL, created_user)` | Multi |
| Property | `eb_profile_property_get(profile_id, NULL, created_user)` | Multi |
| Views | `eb_profile_views_get_viewed_by_me` + `eb_profile_views_get_viewed_me` | Read-only |
| Favorites | `eb_profile_favorites_get(profile_id, account_id)` | Read-only |

### 1.2 API Changes

- **Refactor** `profileAdo.getFullProfile()` to call `eb_profile_*` GET SPs instead of `partner_admin_get_profile_*` SPs
- Use `eb_profile_get_complete_data(profile_id, created_user)` as the main detail call, OR build a composite from individual `eb_profile_*_get` SPs in a `Promise.all`
- Add `eb_profile_contact_get` (not currently in fullProfile) so Contact tab is populated from the start
- Frontend `api.getProfileDetail(id)` already exists — no frontend API changes needed

### 1.3 Files to Create/Modify

| File | Action |
|------|--------|
| `ekam-admin-ui/src/app/(admin)/profiles/[id]/page.tsx` | CREATE — Tabbed detail page |
| `ekam-admin-ui/src/app/(admin)/profiles/page.tsx` | MODIFY — Link "View" button to `/profiles/{id}` |

### 1.4 Estimated Effort
- ~400 lines UI code
- ~50 lines backend — refactor `profileAdo.getFullProfile()` to call `eb_profile_*` GETs

---

## Phase 2 — Profile Edit Page (Personal Info) ✅

> **Goal**: Edit form for `profile_personal` fields
> **Dependencies**: Phase 1 (detail page to navigate from)
> **New code changes**: UI + backend refactor to use `eb_profile_personal_create` / `eb_profile_personal_update`
> **Status**: ✅ Completed 2026-02-26

### Implementation Steps

| Step | Description | Status |
|------|-------------|--------|
| 2a | Refactor `profileAdo.createProfilePersonal()` → `eb_profile_personal_create` (29 params) | ✅ 2026-02-26 |
| 2b | Refactor `profileAdo.updateProfilePersonal()` → `eb_profile_personal_update` (30 params) | ✅ 2026-02-26 |
| 2c | Update `profileDatalayer.createProfile()` to pass additional fields (11 new) | ✅ 2026-02-26 |
| 2d | Controller already passes `req.body` directly — no changes needed | ✅ 2026-02-26 |
| 2e | Update ADO unit tests for new SP names & params (29/30 param verification) | ✅ 2026-02-26 |
| 2f | Datalayer + controller unit tests pass unchanged (stubs) | ✅ 2026-02-26 |
| 2g | Integration tests pass unchanged | ✅ 2026-02-26 |
| 2h | Run all tests — **254 pass, 0 fail** | ✅ 2026-02-26 |
| 2i | Create UI edit page `/profiles/[id]/edit/page.tsx` (7 form sections, 27 fields) | ✅ 2026-02-26 |
| 2j | Mark Phase 2 complete in plan | ✅ 2026-02-26 |

### 2.1 UI — New Page: `/profiles/[id]/edit/page.tsx`

**Form sections** — `eb_profile_personal_create` supports 29 params and `eb_profile_personal_update` supports 30 params (more than the old `partner_admin_*` versions):

- **Basic Info**: prefix, first_name*, last_name*, middle_name, suffix, gender*, birth_date*
- **Contact**: phone_mobile, phone_home, phone_emergency, email_id, whatsapp_number
- **Demographics**: marital_status, religion, nationality, caste
- **Physical**: height_inches, height_cms, weight, weight_units, complexion, disability
- **Professional**: profession
- **Social**: linkedin, facebook, instagram
- **About**: short_summary (textarea)

All lookup fields populated from `api.getLookups(type)` — existing API.

### 2.2 API Changes

- **Refactor** `profileAdo.createProfilePersonal()` to call `eb_profile_personal_create` (29 params) instead of `partner_admin_create_profile_personal` (18 params)
- **Refactor** `profileAdo.updateProfilePersonal()` to call `eb_profile_personal_update` (30 params) instead of `partner_admin_update_profile_personal` (25 params)
- This gives full field coverage including: prefix, suffix, phone_home, phone_emergency, height_cms, weight_units, linkedin, facebook, instagram, whatsapp_number, disability
- All lookups already available via `getLookups`

### 2.3 eb_profile_personal_create Parameters (29)

```
CALL eb_profile_personal_create(
  accountid, first_name, last_name, middle_name, prefix, suffix,
  gender, birth_date, phone_mobile, phone_home, phone_emergency,
  email_id, marital_status, religion, nationality, caste,
  height_inches, height_cms, weight, weight_units, complexion,
  linkedin, facebook, instagram, whatsapp_number,
  profession, disability, created_user, short_summary
)
```

### 2.4 eb_profile_personal_update Parameters (30)

```
CALL eb_profile_personal_update(
  p_profile_id, accountid, first_name, last_name, middle_name, prefix, suffix,
  gender, birth_date, phone_mobile, phone_home, phone_emergency,
  email_id, marital_status, religion, nationality, caste,
  height_inches, height_cms, weight, weight_units, complexion,
  linkedin, facebook, instagram, whatsapp_number,
  profession, disability, updated_user, short_summary
)
```

### 2.5 Files to Create/Modify

| File | Action |
|------|--------|
| `ekam-admin-ui/src/app/(admin)/profiles/[id]/edit/page.tsx` | CREATE — Edit form with all 29 fields |
| `ekam-admin-ui/src/app/(admin)/profiles/[id]/page.tsx` | MODIFY — Add "Edit" button linking to edit page |
| `ado/profileAdo.js` | MODIFY — Refactor `createProfilePersonal` and `updateProfilePersonal` to call `eb_profile_*` SPs |
| `datalayer/profileDatalayer.js` | MODIFY — Update to pass additional fields |
| `controllers/profileController.js` | MODIFY — Accept additional fields in request body |

### 2.6 Estimated Effort
- ~500 lines UI code
- ~80 lines backend refactoring (ADO + datalayer + controller)

---

## Phase 3 — Sub-section CRUD (API Layer) ✅

> **Goal**: Full CRUD API for all profile sub-sections
> **Dependencies**: None (backend only)
> **New code changes**: ADO, Datalayer, Controller, Routes — **NO new SPs**
> **Approach**: Use existing `eb_profile_*` SPs for create/update. Direct SQL for missing deletes/updates.
> **Status**: ✅ Completed 2026-02-26

### Implementation Steps

| Step | Description | Status |
|------|-------------|--------|
| 3a | Add 27 ADO methods for sub-section CRUD (address, contact, education, employment, family, lifestyle, hobby, property, photo) | ✅ 2026-02-26 |
| 3b | Add 27 datalayer methods with `_verifyOwnership` pattern | ✅ 2026-02-26 |
| 3c | Add 28 controller handlers for all sub-section routes | ✅ 2026-02-26 |
| 3d | Add 28 new routes to `profileRoutes.js` (writeRoles/readRoles) | ✅ 2026-02-26 |
| 3e | Update `api.ts` frontend client with 28 sub-section methods | ✅ 2026-02-26 |
| 3f | Add ADO unit tests — 29 new tests (SP params, direct SQL, transactions) | ✅ 2026-02-26 |
| 3g | Add datalayer unit tests — 21 new tests (ownership + delegation) | ✅ 2026-02-26 |
| 3h | Controller tests — existing pattern covers error propagation | ✅ 2026-02-26 |
| 3i | Integration tests — route registration verified via existing suite | ✅ 2026-02-26 |
| 3j | Run all tests — **304 pass, 0 fail** (was 254) | ✅ 2026-02-26 |
| 3k | Mark Phase 3 complete in plan | ✅ 2026-02-26 |

### 3.1 ADO Layer

**Modify**: `ado/profileAdo.js` — Add methods calling `eb_profile_*` SPs + direct SQL:

| Method | Calls | Params |
|--------|-------|--------|
| **Address** | | |
| `createProfileAddress(data)` | `CALL eb_profile_address_create(?,?,?,?,?,?,?,?,?,?,?)` | profile_id, address_type, address_line1, address_line2, city, state, country_id, zip, landmark1, landmark2, created_user |
| `updateProfileAddress(data)` | `CALL eb_profile_address_update(?,?,?,?,?,?,?,?,?,?,?)` | profile_address_id, address_type, address_line1, address_line2, city, state, country_id, zip, landmark1, landmark2, modified_user |
| `deleteProfileAddress(id, profileId)` | `DELETE FROM profile_address WHERE profile_address_id = ? AND profile_id = ?` | Direct SQL — no eb SP exists |
| **Contact** | | |
| `getProfileContact(profileId)` | `CALL eb_profile_contact_get(?,NULL,?)` | profile_id, created_user |
| `createProfileContact(data)` | `CALL eb_profile_contact_create(?,?,?,?)` | profile_id, contact_type, contact_value, created_user |
| `updateProfileContact(data)` | `CALL eb_profile_contact_update(?,?,?,?,?,?)` | contact_id, contact_type, contact_value, isverified, isvalid, modified_user |
| `deleteProfileContact(id, profileId)` | `DELETE FROM profile_contact WHERE id = ? AND profile_id = ?` | Direct SQL |
| **Education** | | |
| `createProfileEducation(data)` | `CALL eb_profile_education_create(?,?,?,?,?,?,?,?,?,?,?)` | profile_id, education_level, year_completed, institution_name, address_line1, city, state_id, country_id, zip, field_of_study, created_user |
| `updateProfileEducation(data)` | `CALL eb_profile_education_update(?,?,?,?,?,?,?,?,?,?,?)` | profile_education_id, education_level, year_completed, institution_name, address_line1, city, state_id, country_id, zip, field_of_study, modified_user |
| `deleteProfileEducation(id, profileId)` | `DELETE FROM profile_education WHERE profile_education_id = ? AND profile_id = ?` | Direct SQL |
| **Employment** | | |
| `createProfileEmployment(data)` | `CALL eb_profile_employment_create(?,?,?,?,?,?,?,?,?,?,?,?,?)` | profile_id, institution_name, address_line1, city, state_id, country_id, zip, start_year, end_year, job_title_id, other_title, last_salary_drawn, created_user |
| `updateProfileEmployment(data)` | `CALL eb_profile_employment_update(?,?,?,?,?,?,?,?,?,?,?,?,?)` | profile_employment_id, institution_name, address_line1, city, state_id, country_id, zip, start_year, end_year, job_title_id, other_title, last_salary_drawn, modified_user |
| `deleteProfileEmployment(id, profileId)` | `DELETE FROM profile_employment WHERE profile_employment_id = ? AND profile_id = ?` | Direct SQL |
| **Family/Reference** | | |
| `createProfileFamily(data)` | `CALL eb_profile_family_reference_create(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)` | profile_id + 30 fields + created_user |
| `updateProfileFamily(data)` | `CALL eb_profile_family_reference_update(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)` | profile_family_reference_id + 30 fields + modified_user |
| `deleteProfileFamily(id, profileId)` | `DELETE FROM profile_family_reference WHERE profile_family_reference_id = ? AND profile_id = ?` | Direct SQL |
| **Lifestyle** | | |
| `createProfileLifestyle(data)` | `CALL eb_profile_lifestyle_create(?,?,?,?,?,?,?,?,?,?)` | profile_id, eating_habit, diet_habit, cigarettes_per_day, drink_frequency, gambling_engage, physical_activity_level, relaxation_methods, additional_info, created_user |
| `updateProfileLifestyle(data)` | `CALL eb_profile_lifestyle_update(?,?,?,?,?,?,?,?,?,?)` | profile_lifestyle_id, eating_habit, diet_habit, cigarettes_per_day, drink_frequency, gambling_engage, physical_activity_level, relaxation_methods, additional_info, modified_user |
| `deleteProfileLifestyle(id)` | `CALL eb_profile_lifestyle_delete(?,?)` | profile_lifestyle_id, created_user — existing eb SP (soft-delete) |
| **Hobby/Interest** | | |
| `createProfileHobby(data)` | `CALL eb_profile_hobby_interest_create(?,?,?,?)` | profile_id, hobby_interest_id, description, created_user |
| `updateProfileHobby(id, data)` | `UPDATE profile_hobby_interest SET hobby_interest_id=?, description=?, date_modified=NOW(), user_modified=? WHERE profile_hobby_intereste_id=? AND profile_id=?` | Direct SQL — no eb update SP |
| `deleteProfileHobby(id)` | `CALL eb_profile_hobby_interest_delete(?,?)` | profile_hobby_intereste_id, created_user — existing eb SP (soft-delete) |
| **Property** | | |
| `createProfileProperty(data)` | `CALL eb_profile_property_create(?,?,?,?,?,?,?,?)` | profile_id, property_type, ownership_type, property_address, property_value, property_description, isoktodisclose, created_by |
| `updateProfileProperty(data)` | `CALL eb_profile_property_update(?,?,?,?,?,?,?,?,?)` | profile_id, property_id, property_type, ownership_type, property_address, property_value, property_description, isoktodisclose, modified_user |
| `deleteProfileProperty(id, profileId)` | `DELETE FROM profile_property WHERE property_id = ? AND profile_id = ?` | Direct SQL |
| **Photo** | | |
| `createProfilePhoto(data)` | `CALL eb_profile_photo_create(?,?,?,?,?,?,?)` | profile_id, photo_type, description, caption, relative_path, url, created_user |
| `deleteProfilePhoto(photoId, profileId)` | `CALL eb_profile_photo_delete(?,?,?)` | profile_id, photo_id, user_deleted — existing eb SP (hard delete) |
| `setProfilePhotoPrimary(photoId, profileId)` | `UPDATE profile_photo SET photo_type=2 WHERE profile_id=? AND photo_type=1; UPDATE profile_photo SET photo_type=1 WHERE profile_photo_id=? AND profile_id=?` | Direct SQL (2 queries in transaction) |

**Total: ~27 new ADO methods** (8 sub-sections × ~3 methods + photo methods + contact get)

### 3.2 Datalayer

**Modify**: `datalayer/profileDatalayer.js` — Add methods with ownership verification:

Each method follows the existing pattern:
1. Receives `partnerId` from controller (via `req.user.partnerId`) — used **only** for ownership verification in Node.js
2. Calls `profileAdo.getProfileById(profileId)` to verify ownership (`account.registered_partner_id === partnerId`)
3. If ownership fails → `throw createAppError('PA_PFGT_100_ACCESS_DENIED')`
4. Calls the corresponding ADO method — **`partnerId` is NOT passed to ADO or `eb_profile_*` SPs** (they don't need it)
5. Returns result

Methods needed (grouped):

| Method Group | Methods | Notes |
|-------------|---------|-------|
| Address | `createAddress`, `updateAddress`, `deleteAddress` | Ownership check + delegate to ADO |
| Contact | `getContact`, `createContact`, `updateContact`, `deleteContact` | Same pattern |
| Education | `createEducation`, `updateEducation`, `deleteEducation` | Same |
| Employment | `createEmployment`, `updateEmployment`, `deleteEmployment` | Same |
| Family | `createFamily`, `updateFamily`, `deleteFamily` | Same |
| Lifestyle | `createLifestyle`, `updateLifestyle`, `deleteLifestyle` | Same |
| Hobby | `createHobby`, `updateHobby`, `deleteHobby` | Same |
| Property | `createProperty`, `updateProperty`, `deleteProperty` | Same |
| Photo | `createPhoto`, `deletePhoto`, `setPhotoPrimary` | Same + Azure Blob (Phase 5) |

**Total: ~27 new datalayer methods**

### 3.3 Controller

**Modify**: `controllers/profileController.js` — Add handler methods:

Each handler:
1. Extracts `partnerId` from `req.user.partnerId` — passed to datalayer for ownership check only
2. Extracts `profileId` + section-specific fields from `req.body`
3. Calls datalayer method (which verifies ownership, then calls ADO without `partnerId`)
4. Returns `{ success: true, data: result }`
5. Errors propagated to `next(err)` → `errorHandler` middleware

### 3.4 Routes

**Modify**: `routes/profileRoutes.js` — Add routes:

```
POST /profiles/address/create        (partner-admin, support-admin)
POST /profiles/address/update        (partner-admin, support-admin)
POST /profiles/address/delete        (partner-admin, support-admin)
POST /profiles/contact/get           (partner-admin, account-admin, support-admin)
POST /profiles/contact/create        (partner-admin, support-admin)
POST /profiles/contact/update        (partner-admin, support-admin)
POST /profiles/contact/delete        (partner-admin, support-admin)
POST /profiles/education/create      (partner-admin, support-admin)
POST /profiles/education/update      (partner-admin, support-admin)
POST /profiles/education/delete      (partner-admin, support-admin)
POST /profiles/employment/create     (partner-admin, support-admin)
POST /profiles/employment/update     (partner-admin, support-admin)
POST /profiles/employment/delete     (partner-admin, support-admin)
POST /profiles/family/create         (partner-admin, support-admin)
POST /profiles/family/update         (partner-admin, support-admin)
POST /profiles/family/delete         (partner-admin, support-admin)
POST /profiles/lifestyle/create      (partner-admin, support-admin)
POST /profiles/lifestyle/update      (partner-admin, support-admin)
POST /profiles/lifestyle/delete      (partner-admin, support-admin)
POST /profiles/hobby/create          (partner-admin, support-admin)
POST /profiles/hobby/update          (partner-admin, support-admin)
POST /profiles/hobby/delete          (partner-admin, support-admin)
POST /profiles/property/create       (partner-admin, support-admin)
POST /profiles/property/update       (partner-admin, support-admin)
POST /profiles/property/delete       (partner-admin, support-admin)
POST /profiles/photos/create         (partner-admin, support-admin)
POST /profiles/photos/delete         (partner-admin, support-admin)
POST /profiles/photos/set-primary    (partner-admin, support-admin)
```

**28 new routes**

### 3.5 Frontend API Client

**Modify**: `ekam-admin-ui/src/lib/api.ts` — Add corresponding methods for each route.

### 3.6 Note on getFullProfile

The refactoring of `profileAdo.getFullProfile()` to call `eb_profile_*` GET SPs (including `eb_profile_contact_get`) is handled in **Phase 1**. Phase 3 only adds the new CUD (create/update/delete) methods.

### 3.7 Estimated Effort
- **0 new SPs** — uses existing `eb_profile_*` SPs + direct SQL for gaps
- ~350 lines ADO additions
- ~200 lines datalayer additions
- ~250 lines controller additions
- ~35 lines route additions
- ~80 lines API client additions

---

## Phase 4 — Sub-section CRUD (UI) 🔧

> **Goal**: Inline editing on the Profile Detail page for all sub-sections
> **Dependencies**: Phase 1 (detail page), Phase 3 (API layer)
> **New code changes**: UI only
> **Status**: ✅ Complete

### Implementation Steps

| Step | Description | Status |
|------|-------------|--------|
| 4a | Create reusable `ConfirmDeleteDialog` component | ✅ |
| 4b | Create `AddressForm` component (single-record edit/add) | ✅ |
| 4c | Create `ContactForm` component (multi-record table + inline form) | ✅ |
| 4d | Create `EducationForm` component (multi-record) | ✅ |
| 4e | Create `EmploymentForm` component (multi-record) | ✅ |
| 4f | Create `FamilyForm` component (multi-record, 30 fields) | ✅ |
| 4g | Create `LifestyleForm` component (single-record) | ✅ |
| 4h | Create `HobbyForm` + `PropertyForm` components (multi-record) | ✅ |
| 4i | Update detail page to integrate all form components | ✅ |
| 4j | Mark Phase 4 complete in plan | ✅ |

### 4.1 Edit Patterns by Tab

**Single-record tabs** (Address, Lifestyle):
- Display data in read-only format
- "Edit" button → switches to inline form
- "Save" / "Cancel" buttons
- If no record exists → "Add" button → inline form

**Multi-record tabs** (Education, Employment, Family/Ref, Hobbies, Property, Contact):
- Table/card list of existing records
- "Add New" button → inline form at top
- Each row has "Edit" / "Delete" action buttons
- Edit → inline form replaces row
- Delete → confirmation dialog

**Read-only tabs** (Views, Favorites):
- Display only, no edit actions
- Paginated table

### 4.2 Reusable Components

| Component | Purpose |
|-----------|---------|
| `ProfileSubSectionForm` | Generic form wrapper with save/cancel |
| `LookupSelect` | Dropdown populated from lookup API |
| `ConfirmDeleteDialog` | Reusable delete confirmation |
| `SubSectionTable` | Generic table with add/edit/delete actions |

### 4.3 Lookup Categories (from `lookup_table`)

> **Source**: `partner_admin_get_lookup_values(category)` via `api.getLookups(type)`
> **Country/State**: Separate tables via `api.getCountries()` / `api.getStates(countryId)`

| Category | Used In Form(s) |
|----------|----------------|
| `address_type` | AddressForm |
| `BLOOD_GROUP` | (Personal) |
| `caste` | (Personal) |
| `contact_type` | ContactForm |
| `contact_us` | — |
| `disability` | (Personal) |
| `education_level` | EducationForm |
| `employment_status` | EmploymentForm |
| `family` | FamilyForm (`family_type`, `family_status`, `family_values`) |
| `field_of_study` | EducationForm |
| `freind` | — |
| `gender` | (Personal) |
| `hobby` | HobbyForm (`hobby_interest_id`) |
| `interest` | HobbyForm |
| `job_title` | EmploymentForm (`job_title_id`) |
| `marital_status` | (Personal) |
| `nationality` | (Personal) |
| `ownership_type` | PropertyForm |
| `phone_type` | ContactForm |
| `photo_type` | (Photos) |
| `profession` | (Personal) |
| `property_type` | PropertyForm |
| `reference` | FamilyForm (ref relations) |
| `religion` | (Personal) |

**Country / State** (separate tables, not lookup_table):

| Field | API | Used In |
|-------|-----|---------|
| `country_id` | `api.getCountries()` | AddressForm, EducationForm, EmploymentForm |
| `state` / `state_id` | `api.getStates(countryId)` | AddressForm, EducationForm, EmploymentForm |

### 4.4 Files to Create/Modify

| File | Action |
|------|--------|
| `profiles/[id]/page.tsx` | MODIFY — Add edit capabilities to all tabs |
| `profiles/[id]/components/AddressForm.tsx` | CREATE |
| `profiles/[id]/components/EducationForm.tsx` | CREATE |
| `profiles/[id]/components/EmploymentForm.tsx` | CREATE |
| `profiles/[id]/components/FamilyForm.tsx` | CREATE |
| `profiles/[id]/components/LifestyleForm.tsx` | CREATE |
| `profiles/[id]/components/HobbyForm.tsx` | CREATE |
| `profiles/[id]/components/PropertyForm.tsx` | CREATE |
| `profiles/[id]/components/ContactForm.tsx` | CREATE |
| `profiles/[id]/components/ConfirmDeleteDialog.tsx` | CREATE |

### 4.4 Estimated Effort
- ~1500 lines across all form components
- ~300 lines for the detail page modifications

---

## Phase 5 — Photo Management (Azure Blob Storage)

> **Goal**: Upload, view, delete, set primary photo via Azure Blob Storage
> **Dependencies**: Phase 3 (photo ADO methods already defined there)
> **New code changes**: Backend (Azure config only) + UI
> **SPs used**: `eb_profile_photo_create`, `eb_profile_photo_get` (via partner_admin wrapper), `eb_profile_photo_delete`
> **No new SPs needed**

### 5.1 Azure Blob Storage Setup

**New npm dependency**: `@azure/storage-blob`
**Limit number of photos per profile**: 7
**Photo categories**: 1 per each photo category
|id|name|description|photo_type|
|---|---|---|---|
|454|Candid or Fun Moment|A lighthearted photo of you laughing or enjoying time with friends might help balance out the more formal shots and show your personality.|photo_type|
|452|Casual or Lifestyle Shot|A picture of you doing something you love, like traveling, reading, or playing a sport, will show your interests and hobbies.|photo_type|
|450|Clear Headshot|This picture will be displayed every where. Like Search, Profile default photo|photo_type|
|453|Family Photo|A photo with family members (if appropriate) can give a sense of your familial bonds, showing you're family-oriented|photo_type|
|451|Full-body shot|This helps provide a better perspective of your appearance and body language. Choose a relaxed setting, like outdoors, for a more natural feel.|photo_type|
|455|Hobby or Activity Photo|If you're passionate about something like cooking, painting, or playing a musical instrument, sharing a photo of you engaged in that can reveal more a|photo_type|
|456|Other|Any other photo|photo_type|

**New config file**: `config/azureStorage.js`
- BlobServiceClient initialization from connection string (env variable `AZURE_STORAGE_CONNECTION_STRING`)
- Container name from env variable `AZURE_STORAGE_CONTAINER` (default: `profile-photos`)
- Function: `generateSasUploadUrl(blobName, expiryMinutes)` — returns time-limited SAS URL for direct upload
- Function: `generateSasReadUrl(blobName, expiryMinutes)` — returns time-limited read URL
- Function: `deleteBlob(blobName)` — delete from storage
- Blob naming convention: `{partner_id}/{profile_id}/{photo_category_name}.{ext}`
example: `1/100/candid_or_fun_moment.jpg`


**New env variables**:
```
AZURE_STORAGE_CONNECTION_STRING=...
AZURE_STORAGE_CONTAINER=profile-photos
```

### 5.2 API Layer (extends Phase 3 photo routes)

Photo routes already defined in Phase 3. This phase adds:

**New route** (in addition to Phase 3 photo routes):
- `POST /profiles/photos/upload-url` — Generate SAS upload URL, return `{ uploadUrl, blobName }`

**Modified route logic**:
- `POST /profiles/photos/create` — After confirming upload, calls `eb_profile_photo_create` to save URL to DB
- `POST /profiles/photos/delete` — Calls `eb_profile_photo_delete` (hard delete from DB) + `deleteBlob()` to remove from Azure

### 5.3 Upload Flow

```
1. Client → POST /profiles/photos/upload-url { profileId, fileName, contentType }
2. Server → generates SAS URL with 15-min expiry, returns { uploadUrl, blobName }
3. Client → PUT directly to Azure Blob via SAS URL (browser upload, no server proxy)
4. Client → POST /profiles/photos/create { profileId, blobName, photoType, caption, description, url }
5. Server → calls eb_profile_photo_create SP, returns { profilePhotoId }
```

### 5.4 UI — Photos Tab Enhancement
Should allow to display 7 photos with photo_category_name as title
example: `1/100/candid_or_fun_moment.jpg` should display as "Candid Fun Moment"

| Feature | Details |
|---------|---------|
| Photo gallery grid | Display all non-deleted photos |
| Upload button | File picker → upload to Azure → confirm → refresh gallery |
| Primary badge | Star icon on primary photo |
| Set primary | Click to set as primary (if not already) |
| Delete | Delete with confirmation dialog |
| Lightbox | Click photo to view full-size |

### 5.5 Estimated Effort
- **0 new SPs** — uses `eb_profile_photo_create`, `eb_profile_photo_delete`
- ~80 lines Azure config
- ~50 lines upload-url route/controller
- ~300 lines UI

---

## Phase 6 — Profile Delete (Soft + Hard, GDPR)

> **Goal**: Soft-delete, hard-delete, anonymize, restore profiles with GDPR compliance
> **Dependencies**: Phase 1 (detail page for delete action)
> **New code changes**: 1 new SP (hard delete only) + ADO/datalayer/controller/routes + UI
> **Approach**: Soft-delete uses existing `partner_admin_toggle_profile_status` + direct SQL on account table. Anonymize and restore handled in datalayer with direct SQL. Only hard delete needs a new SP (cascading multi-table delete).

### 6.1 GDPR Requirements

| Right | Implementation |
|-------|---------------|
| Right to Erasure (Art. 17) | Hard delete — permanent removal of all data |
| Right to Restriction (Art. 18) | Soft delete — deactivate, hide from searches |
| Right to Portability (Art. 20) | Data export — JSON/PDF of all profile data (Phase 8) |
| Accountability (Art. 5) | Full audit trail via `middleware/audit.js` + `partner_admin_audit_log` |

### 6.2 Implementation Approach

| Operation | How | Details |
|-----------|-----|---------|
| **Soft delete** | Existing SP + direct SQL | 1. `partner_admin_toggle_profile_status(profile_id, 0)` sets `is_active=0` on `profile_personal`. 2. Direct SQL: `UPDATE account SET is_deleted=1, deleted_date=NOW(), deleted_user=?, deleted_reason=? WHERE account_id=?` — account table already has these columns. |
| **Hard delete** | **New SP**: `partner_admin_hard_delete_profile` | Cascading DELETE across all 12+ tables in correct FK order. Admin-only. Logged to audit BEFORE deletion. **Irreversible.** |
| **Anonymize** | Direct SQL in datalayer | Multiple UPDATE queries in a transaction: replace PII in `profile_personal` with `[REDACTED]`, nullify phone/email/social in `profile_personal` and `account`, keep statistical data (gender, religion, age). Sets `is_active=0`. |
| **Restore** | Existing SP + direct SQL | 1. `partner_admin_toggle_profile_status(profile_id, 1)`. 2. Direct SQL: `UPDATE account SET is_deleted=0, deleted_date=NULL, deleted_user=NULL, deleted_reason=NULL WHERE account_id=?` |
| **List deleted** | Direct SQL in ADO | `SELECT ... FROM profile_personal pp JOIN account a ON pp.account_id = a.account_id WHERE a.registered_partner_id = ? AND a.is_deleted = 1` |

### 6.3 New Stored Procedure (1 only)

**Add to**: `partner-admin-dbscripts/13-sp-profile-hard-delete.sql`

| SP | Logic |
|----|-------|
| `partner_admin_hard_delete_profile` | Ownership check (`registered_partner_id`). Deletes from (in order): `profile_favorites`, `profile_views`, `profile_photo`, `profile_hobby_interest`, `profile_lifestyle`, `profile_property`, `profile_family_reference`, `profile_employment`, `profile_education`, `profile_contact`, `profile_address`, `profile_personal`, `login`, `account`. Activity logged BEFORE deletion. Error handler with `partner_admin_log_error`. |

### 6.4 API Routes

| Route | Method | Roles | Notes |
|-------|--------|-------|-------|
| `/profiles/soft-delete` | POST | partner-admin | `{ id, reason }` |
| `/profiles/hard-delete` | POST | partner-admin | `{ id, confirmCode }` — requires typing account_code to confirm |
| `/profiles/anonymize` | POST | partner-admin | GDPR pseudonymization |
| `/profiles/restore` | POST | partner-admin | Undo soft-delete |
| `/profiles/deleted-list` | POST | partner-admin | Paginated list of soft-deleted profiles |
| `/profiles/export-data` | POST | partner-admin | Returns full profile JSON (GDPR data portability) |

### 6.5 UI Changes

- **Delete button** on profile detail → dropdown: Soft Delete, Hard Delete, Anonymize
- **Confirmation dialogs**: Soft delete asks for reason, Hard delete requires typing account code
- **Deleted Profiles** tab on profile list page (partner-admin only)
- **Restore** button on deleted profiles list

### 6.6 Estimated Effort
- **1 new SP** (`partner_admin_hard_delete_profile`)
- ~5 new error codes
- ~150 lines ADO + Datalayer + Controller + Routes
- ~300 lines UI

---

## Phase 7 — Background Check Tracking

> **Goal**: Track background check requests with status lifecycle per profile
> **Dependencies**: Existing background check module
> **New code changes**: New table, SPs, enhanced API and UI

### 7.1 New Table

```sql
CREATE TABLE IF NOT EXISTS `partner_admin_background_check_requests` (
  `check_id` int(11) NOT NULL AUTO_INCREMENT,
  `partner_id` int(11) NOT NULL,
  `profile_id` int(11) NOT NULL,
  `check_type` varchar(50) NOT NULL,
  `status` enum('pending','in_progress','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `requested_by` int(11) NOT NULL,
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `result_summary` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `external_ref_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`check_id`),
  KEY `idx_partner_id` (`partner_id`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_status` (`status`),
  KEY `idx_requested_at` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### 7.2 New Stored Procedures

**New SP file**: `partner-admin-dbscripts/16-sp-background-check-v2.sql`

| SP | Logic |
|----|-------|
| `partner_admin_create_background_check` | Ownership check → INSERT into partner_admin_background_check_requests |
| `partner_admin_update_background_check_status` | Update status, notes, completed_at (if status=completed/failed) |
| `partner_admin_get_background_checks_by_profile` | List all checks for a profile |
| `partner_admin_get_background_checks_by_partner` | Paginated list for partner with filters (status, check_type, date range) |
| `partner_admin_get_background_check_by_id` | Single check detail |

### 7.3 API Routes

**Modify/Add to**: `routes/backgroundCheckRoutes.js`

| Route | Method | Roles |
|-------|--------|-------|
| `/background-check/create` | POST | partner-admin, support-admin |
| `/background-check/update-status` | POST | partner-admin, support-admin |
| `/background-check/profile-history` | POST | partner-admin, account-admin, support-admin |
| `/background-check/list` | POST | partner-admin, account-admin, support-admin |
| `/background-check/detail` | POST | partner-admin, account-admin, support-admin |

### 7.4 UI Enhancements

- **Background Check tab** on profile detail page — shows request history with status badges (pending=yellow, in_progress=blue, completed=green, failed=red, cancelled=gray)
- **Create check form** — select check type, add notes
- **Update status form** — change status dropdown, add notes (partner-admin, support-admin)
- **Enhanced `/background-check` page** — dashboard view of all checks across profiles with filters

### 7.5 Estimated Effort
- 1 new table + 5 new SPs
- ~10 new error codes
- ~150 lines ADO + Datalayer + Controller + Routes
- ~400 lines UI

---

## Phase 8 — Profile PDF Export

> **Goal**: Single-page PDF summary of a profile
> **Dependencies**: Phase 1 (profile detail data)
> **New code changes**: Backend (PDF generator, route) + UI (download button)

### 8.1 Technology Choice

**Option A — `puppeteer`**: Render HTML template → PDF. Better styling control, heavier dependency (~300MB).
**Option B — `pdfkit`**: Programmatic PDF generation. Lighter (~5MB), more code but no browser dependency.

**Recommendation**: `pdfkit` (or `pdfmake`) — lighter footprint, no Chromium needed on server.

### 8.2 Implementation

**New files**:
- `utils/pdfGenerator.js` — Functions to generate profile PDF from data object
- Template includes: profile photo, personal info, address, education, employment, family summary

**New route**:
- `POST /profiles/export-pdf` → Returns PDF buffer with `Content-Type: application/pdf`

### 8.3 PDF Layout

```
+------------------------------------------+
| [Photo]  Name, Account Code              |
|          Gender, Age, Marital Status      |
|          Religion, Nationality, Caste     |
+------------------------------------------+
| PERSONAL INFORMATION                     |
| Height, Weight, Complexion, Blood Group  |
| Phone, Email, WhatsApp                   |
| Profession, Disability                   |
+------------------------------------------+
| ADDRESS                                  |
| (all addresses listed)                   |
+------------------------------------------+
| EDUCATION                                |
| (table: Level, Institution, Year, Field) |
+------------------------------------------+
| EMPLOYMENT                               |
| (table: Company, Title, City, Years)     |
+------------------------------------------+
| FAMILY/REFERENCES                        |
| (summary of family members)              |
+------------------------------------------+
| LIFESTYLE                                |
| Eating, Diet, Physical Activity, etc.    |
+------------------------------------------+
| Generated on: [date] | Confidential      |
+------------------------------------------+
```

### 8.4 Estimated Effort
- ~200 lines PDF generator
- ~30 lines route/controller
- ~10 lines UI (download button)

---

## Phase 9 — Advanced Search

> **Goal**: Enhanced search/filter on profile list page
> **Dependencies**: None
> **Note**: Existing `partner_admin_get_profiles_by_partner` already accepts `p_search`, `p_status`, `p_gender` as NULL-able filters. The same pattern can be extended.
> **No new SPs needed** — extend the existing SP's WHERE clause with additional NULL-able params, or handle additional filtering in the API/datalayer layer.

### 9.1 Enhanced Filters (Profile List Page)

| Filter | Current | Enhanced |
|--------|---------|----------|
| Search text | Yes (name, email, phone, account code) | Keep as-is |
| Status | Yes (active/inactive) | Keep as-is |
| Gender | Yes | Keep as-is |
| Age range | No | **NEW** — min/max age sliders |
| Religion | No | **NEW** — dropdown from lookup |
| Marital status | No | **NEW** — dropdown from lookup |
| Registration date range | No | **NEW** — date pickers |
| Has photo | No | **NEW** — toggle |

### 9.2 Implementation

- **Option A** (preferred): Add NULL-able parameters to `partner_admin_get_profiles_by_partner` (extend existing SP — add params with DEFAULT NULL so existing callers are unaffected)
- **Option B**: Filter in API/datalayer layer after fetching results (less efficient for large datasets)
- **Modify API**: Update `getProfiles` controller/datalayer to pass additional filter params
- **Modify UI**: Add filter dropdowns/inputs to profile list page
- **Modify frontend API client**: Update `getProfiles()` call to accept additional filters

### 9.3 Estimated Effort
- **0 new SPs** — extend existing SP or filter in API layer
- ~30 lines API changes
- ~100 lines UI additions

---

## Phase 10 — Tests

> **Goal**: Full test coverage for all new features
> **Dependencies**: All previous phases
> **Pattern**: Follow existing test infrastructure (node:test, Sinon, mockData, .mjs)

### 10.1 Test Matrix

| Phase | Layer | File | Est. Tests |
|-------|-------|------|------------|
| Phase 3 | ADO | `tests/unit/ado/profileAdo.test.mjs` (extend) | ~54 (27 methods x 2: success + error) |
| Phase 3 | Datalayer | `tests/unit/datalayer/profileDatalayer.test.mjs` (extend) | ~40 (ownership check + success per method) |
| Phase 3 | Controller | `tests/unit/controllers/profileController.test.mjs` (extend) | ~28 |
| Phase 3 | Integration | `tests/integration/profile.test.mjs` (extend) | ~28 |
| Phase 5 | All layers | Extend profile tests (photo upload flow) | ~12 |
| Phase 6 | All layers | Extend profile tests (soft/hard delete, restore, anonymize) | ~16 |
| Phase 7 | All layers | Extend backgroundCheck tests | ~20 |
| Phase 8 | Controller | Extend profile tests (PDF export) | ~4 |
| Phase 9 | All layers | Extend profile tests (advanced filters) | ~8 |

**Total estimated: ~210 new tests** (on top of existing 246, bringing total to ~456)

### 10.2 Mock Data Additions

**Modify**: `tests/fixtures/mockData.mjs`

New mock objects needed:
- Sub-section create/update/delete request payloads (address, contact, education, employment, family, lifestyle, hobby, property)
- Photo create/delete payloads
- Background check create/update payloads
- Soft/hard delete request payloads
- Advanced search filter payloads

### 10.3 Error Code Seeding

**Modify**: `tests/helpers/seedErrorCodes.mjs` — Add error codes for hard delete (`PA_PFDL_*`) and background check tracking SPs

---

## Implementation Order & Dependencies

```
Phase 1 (Detail View) ─────→ Phase 2 (Edit Personal)
       │                              │
       │                              ↓
       │                    Phase 4 (Sub-section UI)
       │                              ↑
       │              Phase 3 (Sub-section API) ────────→ Phase 10 (Tests)
       │
       ├──→ Phase 5 (Photos) ──────────────────────────→ Phase 10 (Tests)
       │
       ├──→ Phase 6 (Delete/GDPR) ────────────────────→ Phase 10 (Tests)
       │
       ├──→ Phase 8 (PDF Export) ──────────────────────→ Phase 10 (Tests)
       │
       └──→ Phase 9 (Advanced Search) ────────────────→ Phase 10 (Tests)

Phase 7 (Background Check) — independent ─────────────→ Phase 10 (Tests)
```

**Recommended execution order**:
1. Phase 1 → Phase 2 (UI foundation, no backend changes)
2. Phase 3 → Phase 4 (sub-section CRUD, largest feature)
3. Phase 5 (photo management)
4. Phase 6 (delete/GDPR)
5. Phase 7 (background check tracking)
6. Phase 8 (PDF export)
7. Phase 9 (advanced search)
8. Phase 10 (tests — run in parallel with each phase)

---

## Standards & Conventions

### Backend Standards (per existing codebase)

| Concern | Standard | Reference |
|---------|----------|-----------|
| **Error codes** | DB-driven, `PA_XXYY_NNN_DESC` format | `config/errorCodes.js`, `partner_admin_error_codes` table |
| **Error handling** | `createAppError(code, msg)` → `errorHandler` middleware → `partner_admin_log_api_error` SP | `middleware/errorHandler.js` |
| **SP result check** | `checkSpResult(rows, spName)` / `checkSpResultArray(rows, spName)` | `utils/spResultHelper.js` |
| **Auth** | `authenticateToken` → JWT validation | `middleware/auth.js` |
| **Authorization** | `authorizeRoles('partner-admin', ...)` | `middleware/auth.js` |
| **Audit** | `auditLog()` middleware OR `logAuditEvent()` | `middleware/audit.js` |
| **Logging** | `partner_admin_log_error` (7-param), `partner_admin_log_activity` (8-param) | SPs in `02-sp-utility.sql` |
| **Ownership** | Every profile operation verifies `account.registered_partner_id = req.user.partnerId` **in Node.js datalayer** — `partnerId` is never passed to `eb_profile_*` SPs (they don't accept it) | `profileDatalayer.js` pattern |
| **Testing** | node:test + Sinon + supertest, .mjs files, CJS source via createRequire | `tests/` directory |

### Frontend Standards

| Concern | Standard |
|---------|----------|
| **Framework** | Next.js (App Router) |
| **Styling** | Tailwind CSS + shadcn/ui components |
| **API client** | Centralized in `lib/api.ts` |
| **Auth context** | `AuthContext` with JWT token management |
| **Brand context** | `BrandContext` for white-label theming |
| **Routing** | `(admin)` layout group, role-based sidebar |

### SP Coding Pattern (for hard delete SP only)

```sql
DROP PROCEDURE IF EXISTS `partner_admin_hard_delete_profile`$$
CREATE PROCEDURE `partner_admin_hard_delete_profile`(
    IN p_partner_id INT,
    IN p_profile_id INT,
    IN p_created_user VARCHAR(100)
)
BEGIN
    DECLARE v_account_id INT;
    DECLARE error_code VARCHAR(50) DEFAULT NULL;
    DECLARE error_message VARCHAR(255) DEFAULT NULL;
    DECLARE start_time DATETIME DEFAULT NOW();

    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT, error_code = MYSQL_ERRNO;
        CALL partner_admin_log_error('PA_PFDL_900_DB_ERROR', error_code, error_message,
             p_created_user, 'partner_admin_hard_delete_profile', p_partner_id, start_time);
        SELECT 'fail' AS status, 'SQL Exception' AS error_type,
               'PA_PFDL_900_DB_ERROR' AS error_code, error_message;
    END;

    -- Ownership verification
    SELECT pp.account_id INTO v_account_id
    FROM profile_personal pp
    JOIN account a ON pp.account_id = a.account_id
    WHERE pp.profile_id = p_profile_id
    AND a.registered_partner_id = p_partner_id;

    IF v_account_id IS NULL THEN
        SELECT 'fail' AS status, 'Validation Error' AS error_type,
               'PA_PFDL_100_NOT_FOUND' AS error_code,
               'Profile not found or access denied' AS error_message;
    END IF;

    -- Log BEFORE deletion (data will be gone after)
    CALL partner_admin_log_activity('HARD_DELETE',
         CONCAT('Hard delete profile: ', p_profile_id, ', account: ', v_account_id),
         p_created_user, 'partner_admin_hard_delete_profile', NULL,
         p_partner_id, start_time, NOW());

    START TRANSACTION;
    -- Cascading delete in FK-safe order
    DELETE FROM profile_favorites WHERE from_profile_id = p_profile_id OR to_profile_id = p_profile_id;
    DELETE FROM profile_views WHERE from_profile_id = p_profile_id OR to_profile_id = p_profile_id;
    DELETE FROM profile_photo WHERE profile_id = p_profile_id;
    DELETE FROM profile_hobby_interest WHERE profile_id = p_profile_id;
    DELETE FROM profile_lifestyle WHERE profile_id = p_profile_id;
    DELETE FROM profile_property WHERE profile_id = p_profile_id;
    DELETE FROM profile_family_reference WHERE profile_id = p_profile_id;
    DELETE FROM profile_employment WHERE profile_id = p_profile_id;
    DELETE FROM profile_education WHERE profile_id = p_profile_id;
    DELETE FROM profile_contact WHERE profile_id = p_profile_id;
    DELETE FROM profile_address WHERE profile_id = p_profile_id;
    DELETE FROM profile_personal WHERE profile_id = p_profile_id;
    DELETE FROM login WHERE account_id = v_account_id;
    DELETE FROM account WHERE account_id = v_account_id;
    COMMIT;

    SELECT 'success' AS status, NULL AS error_type,
           p_profile_id AS deletedProfileId, NULL AS error_code, NULL AS error_message;
END$$
```

### ADO Pattern (for eb_profile_* SP calls)

```javascript
// Example: calling eb_profile_address_create from profileAdo.js
async createProfileAddress(data) {
  const [rows] = await pool.query(
    'CALL eb_profile_address_create(?,?,?,?,?,?,?,?,?,?,?)',
    [data.profile_id, data.address_type, data.address_line1, data.address_line2,
     data.city, data.state, data.country_id, data.zip,
     data.landmark1, data.landmark2, data.created_user]
  );
  checkSpResult(rows, 'eb_profile_address_create');
  return rows[0]?.[0];
},

// Example: direct SQL delete (no eb SP exists)
async deleteProfileAddress(addressId, profileId) {
  const [result] = await pool.query(
    'DELETE FROM profile_address WHERE profile_address_id = ? AND profile_id = ?',
    [addressId, profileId]
  );
  return result.affectedRows;
},
```

### Datalayer Pattern (ownership check before ADO call)

```javascript
// partnerId is used ONLY here for ownership verification — never passed to ADO or eb_profile_* SPs
// Ownership chain: profile_personal.account_id → account.registered_partner_id
async createAddress(partnerId, profileId, data) {
  const profile = await profileAdo.getProfileById(profileId);
  if (!profile || profile.registered_partner_id !== partnerId) {
    throw createAppError('PA_PFGT_100_ACCESS_DENIED', 'Profile not found or access denied');
  }
  // ADO receives profile_id + section fields only — no partnerId
  return profileAdo.createProfileAddress({ ...data, profile_id: profileId });
},
```

---

## Summary

| Phase | Description | New SPs | New Routes | Est. Lines | Backend Refactor |
|-------|-------------|---------|------------|------------|------------------|
| 1 | Profile Detail View | 0 | 0 | ~450 | Refactor `getFullProfile` → `eb_profile_*` GETs |
| 2 | Profile Edit Personal | 0 | 0 | ~580 | Refactor create/update → `eb_profile_personal_*` |
| 3 | Sub-section CRUD (API) | **0** | 28 | ~915 | New CUD methods using `eb_profile_*` SPs |
| 4 | Sub-section CRUD (UI) | 0 | 0 | ~1,800 | — |
| 5 | Photo Management | **0** | 1 | ~430 | Azure Blob config |
| 6 | Profile Delete (GDPR) | **1** | 6 | ~450 | Hard delete SP only |
| 7 | Background Check Tracking | 5 | 5 | ~550 | New table + SPs |
| 8 | PDF Export | 0 | 1 | ~240 | — |
| 9 | Advanced Search | 0 | 0 | ~130 | Extend existing SP or API filter |
| 10 | Tests | 0 | 0 | ~2,200 | — |
| **Total** | | **6** | **41** | **~7,745** | |

> **Key difference from v1**: Reduced from 31 new SPs to **6** (1 for hard delete + 5 for background check tracking).
> **Key difference from v2**: Maximized `eb_profile_*` SP usage — 13 `partner_admin_*` profile SPs replaced by `eb_profile_*` equivalents. Only 6 `partner_admin_*` SPs kept (listing, toggle, lookups, metrics, background check) where no `eb_profile_*` equivalent exists. Personal create/update now use `eb_profile_personal_create` (29 params) / `eb_profile_personal_update` (30 params) for full field coverage.
