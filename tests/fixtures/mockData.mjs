/**
 * Centralized mock data for all test layers.
 * Every fixture mirrors the shape returned by stored procedures / DB rows.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export const apiClient = {
  id: 1,
  api_key: 'test-api-key-123',
  partner_id: 1,
  partner_name: 'Ekam Matrimony',
  partner_root_domain: 'ekam.local',
  is_active: 1
};

export const apiClientInactive = { ...apiClient, id: 2, is_active: 0 };

export const partnerUser = {
  partner_admin_id: 1,
  partner_id: 1,
  username: 'partneradmin',
  password_hash: '$2a$10$placeholder',
  email: 'admin@ekam.local',
  first_name: 'Partner',
  last_name: 'Admin',
  role: 'partner-admin',
  is_active: 1,
  last_login: '2026-01-01T00:00:00.000Z',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z'
};

export const accountAdminUser = {
  ...partnerUser,
  partner_admin_id: 2,
  username: 'accountadmin',
  email: 'account@ekam.local',
  first_name: 'Account',
  last_name: 'Admin',
  role: 'account-admin'
};

export const supportAdminUser = {
  ...partnerUser,
  partner_admin_id: 3,
  username: 'supportadmin',
  email: 'support@ekam.local',
  first_name: 'Support',
  last_name: 'Admin',
  role: 'support-admin'
};

export const partnerDomains = [
  { partner_id: 1, partner_name: 'Ekam Matrimony', domain: 'ekam.local', api_key: 'test-api-key-123' },
  { partner_id: 2, partner_name: 'Partner Two', domain: 'p2.local', api_key: 'test-api-key-456' }
];

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const profileMetrics = {
  total_profiles: 150,
  active_profiles: 120,
  inactive_profiles: 30,
  genderBreakdown: [
    { gender_id: 1, gender_name: 'Male', count: 80 },
    { gender_id: 2, gender_name: 'Female', count: 70 }
  ]
};

export const paymentMetrics = {
  total_payments: 50, total_amount: 25000, paid_amount: 20000,
  pending_amount: 5000, paid_count: 40, pending_count: 10
};

export const activityMetrics = {
  total_activities: 500, last_24h: 20, last_7d: 100, last_30d: 300
};

export const viewsMetrics = { total_views: 1000, views_7d: 150, views_30d: 400 };

export const accountMetrics = {
  total_accounts: 200, active_accounts: 180, inactive_accounts: 20, new_last_30d: 15
};

export const recentActivities = [
  { activity_id: 1, action: 'profile.view', username: 'john', created_at: '2026-01-15T10:00:00Z' },
  { activity_id: 2, action: 'profile.update', username: 'jane', created_at: '2026-01-15T09:00:00Z' }
];

// ─── Profiles ────────────────────────────────────────────────────────────────

export const profilePersonal = {
  profile_personal_id: 101, account_id: 201,
  first_name: 'John', last_name: 'Doe', middle_name: null,
  gender: 1, birth_date: '1995-06-15',
  phone_mobile: '9876543210', phone_home: null,
  email_id: 'john@example.com', marital_status: 'Single',
  religion: 'Hindu', nationality: 'Indian', caste: null,
  height_inches: 70, weight: 75, complexion: 'Fair',
  profession: 'Engineer', disability: null,
  linkedin: null, facebook: null, instagram: null, whatsapp_number: null,
  is_active: 1, short_summary: 'Test profile',
  registered_partner_id: 1,
  created_user: 'admin', updated_user: null,
  created_at: '2025-06-01T00:00:00Z', updated_at: null
};

export const profileAddress = [{ address_id: 1, profile_id: 101, address_line1: '123 Main St', city: 'Mumbai', state: 'MH', zip: '400001', country: 'IN' }];
export const profileContact = [{ id: 1, profile_id: 101, contact_type: 'phone', contact_value: '9876543210', isverified: 1 }];
export const profileEducation = [{ education_id: 1, profile_id: 101, degree: 'B.Tech', college: 'IIT Mumbai', year: 2017 }];
export const profileEmployment = [{ employment_id: 1, profile_id: 101, company: 'TechCorp', designation: 'Senior Engineer', salary: 100000 }];
export const profileFamily = [{ family_id: 1, profile_id: 101, father_name: 'Robert Doe', mother_name: 'Mary Doe' }];
export const profilePhoto = {
  profile_photo_id: 90, profile_id: 101, photo_type: 450,
  description: 'Photo upload', caption: 'Clear Headshot',
  relative_path: '1/101/clear_headshot.jpg',
  url: 'https://teststorage.blob.core.windows.net/profile-photos/1/101/clear_headshot.jpg',
  date_created: '2026-01-15T10:00:00Z', user_created: 'partneradmin',
  date_modified: null, user_modified: null, isverified: 0, softdelete: 0
};

export const profilePhotos = [
  profilePhoto,
  {
    profile_photo_id: 91, profile_id: 101, photo_type: 451,
    description: 'Photo upload', caption: 'Full-body Shot',
    relative_path: '1/101/full_body_shot.jpg',
    url: 'https://teststorage.blob.core.windows.net/profile-photos/1/101/full_body_shot.jpg',
    date_created: '2026-01-15T11:00:00Z', user_created: 'partneradmin',
    date_modified: null, user_modified: null, isverified: 0, softdelete: 0
  }
];
export const profileLifestyle = [{ lifestyle_id: 1, profile_id: 101, diet: 'Vegetarian', smoking: 'No', drinking: 'No' }];
export const profileHobbies = [{ hobby_id: 1, profile_id: 101, hobby: 'Reading' }];
export const profileProperty = [{ property_id: 1, profile_id: 101, property_type: 'Apartment', value: 5000000 }];
export const profileViewedByMe = [{ view_id: 1, from_profile_id: 101, to_profile_id: 201, viewed_at: '2026-01-15T10:00:00Z' }];
export const profileViewedMe = [{ view_id: 2, from_profile_id: 301, to_profile_id: 101, viewed_at: '2026-01-14T09:00:00Z' }];
export const profileFavorites = [{ profile_favorite_id: 1, from_profile_id: 101, to_profile_id: 201, is_active: 1 }];

export const fullProfile = {
  personal: profilePersonal,
  address: profileAddress, contact: profileContact,
  education: profileEducation, employment: profileEmployment,
  family: profileFamily, photos: profilePhotos,
  lifestyle: profileLifestyle, hobbies: profileHobbies,
  property: profileProperty,
  views: { viewedByMe: profileViewedByMe, viewedMe: profileViewedMe },
  favorites: profileFavorites
};

export const createProfileInput = {
  first_name: 'Jane', last_name: 'Smith', middle_name: null,
  gender: 2, birth_date: '1997-03-20', phone_mobile: '9876543211',
  email_id: 'jane@example.com', marital_status: 'Single',
  religion: 'Hindu', nationality: 'Indian', caste: null,
  height_inches: 64, weight: 55, complexion: 'Fair', profession: 'Doctor',
  address_line1: '456 Oak Ave', city: 'Delhi', state: 'DL', zip: '110001', country: 'IN',
  short_summary: 'New profile', username: 'janesmith', password: 'Test@123'
};

export const lookupValues = [
  { lookup_id: 1, lookup_type: 'religion', lookup_value: 'Hindu' },
  { lookup_id: 2, lookup_type: 'religion', lookup_value: 'Muslim' },
  { lookup_id: 3, lookup_type: 'religion', lookup_value: 'Christian' }
];

// ─── Partner ─────────────────────────────────────────────────────────────────

export const partnerInfo = {
  partner_id: 1, partner_name: 'Ekam Matrimony', partner_alias: 'EKM',
  email: 'info@ekam.local', phone: '1234567890', is_active: 1, created_at: '2025-01-01T00:00:00Z'
};

export const partnerDomainLinks = {
  partner_id: 1, admin_portal_url: 'https://admin.ekam.local',
  member_portal_url: 'https://members.ekam.local', api_base_url: 'https://api.ekam.local'
};

export const countries = [
  { country_id: 1, country_name: 'India', country_code: 'IN' },
  { country_id: 2, country_name: 'USA', country_code: 'US' }
];

export const states = [
  { state_id: 1, state_name: 'Maharashtra', state_code: 'MH', country_id: 1 },
  { state_id: 2, state_name: 'Delhi', state_code: 'DL', country_id: 1 }
];

// ─── Admin Users ─────────────────────────────────────────────────────────────

export const createAdminUserInput = {
  username: 'newadmin', password: 'NewAdmin@123',
  email: 'newadmin@ekam.local', firstName: 'New', lastName: 'Admin', role: 'account-admin'
};

// ─── Audit ───────────────────────────────────────────────────────────────────

export const auditLogEntry = {
  audit_id: 1, partner_id: 1, user_id: 1, username: 'partneradmin',
  user_role: 'partner-admin', action: 'auth.login', entity_type: 'auth',
  entity_id: 1, endpoint: '/api/auth/login',
  request_body: '{"username":"partneradmin"}', previous_data: null,
  new_data: '{"partnerId":1}', ip_address: '127.0.0.1',
  user_agent: 'node-test', created_at: '2026-01-15T10:00:00Z'
};

export const auditLogsList = { logs: [auditLogEntry], total: 1, page: 1, limit: 20 };

// ─── Brand Config ────────────────────────────────────────────────────────────

export const brandConfigRow = {
  brand_config_id: 1, partner_id: 1, template_id: 'modern',
  brand_name: 'Ekam Matrimony', brand_tagline: 'Find your match',
  logo_url: 'https://example.com/logo.png', logo_small_url: 'https://example.com/logo-sm.png',
  favicon_url: 'https://example.com/favicon.ico',
  primary_color: '262 83% 58%', secondary_color: '220 14% 96%', accent_color: '262 83% 58%',
  font_family: 'Inter', border_radius: '0.5rem',
  sidebar_style: 'standard', login_layout: 'centered', header_style: 'minimal',
  custom_css: null, updated_by: 1,
  created_at: '2025-01-01T00:00:00Z', updated_at: '2025-06-01T00:00:00Z'
};

export const brandConfigFormatted = {
  id: 1, partnerId: 1, templateId: 'modern',
  brandName: 'Ekam Matrimony', brandTagline: 'Find your match',
  logoUrl: 'https://example.com/logo.png', logoSmallUrl: 'https://example.com/logo-sm.png',
  faviconUrl: 'https://example.com/favicon.ico',
  primaryColor: '262 83% 58%', secondaryColor: '220 14% 96%', accentColor: '262 83% 58%',
  fontFamily: 'Inter', borderRadius: '0.5rem',
  sidebarStyle: 'standard', loginLayout: 'centered', headerStyle: 'minimal',
  customCss: null, updatedBy: 1,
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z'
};

export const updateBrandConfigInput = {
  templateId: 'classic', brandName: 'Ekam Updated', brandTagline: 'New tagline', primaryColor: '200 80% 50%'
};

// ─── Background Check ────────────────────────────────────────────────────────

export const profileForCheck = {
  profile_personal_id: 101, first_name: 'John', last_name: 'Doe',
  phone_mobile: '9876543210', email_id: 'john@example.com',
  address_line1: '123 Main St', city: 'Mumbai', state: 'MH', country: 'IN'
};
