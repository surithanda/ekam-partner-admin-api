const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const profileAdo = {
  // ── Account / Profile List (partner_admin — no eb equivalent) ──

  /**
   * List profiles scoped to a partner with pagination and filters.
   * Uses partner_admin SP — no eb_profile equivalent for partner-scoped listing.
   * @param {number} partnerId - Partner ID for ownership scoping
   * @param {number} [page=1] - Page number
   * @param {number} [limit=20] - Results per page
   * @param {string} [search=''] - Search term (name, email, phone, account code)
   * @param {number|null} [status=null] - Filter by is_active (0/1)
   * @param {number|null} [gender=null] - Filter by gender ID
   * @returns {Promise<{profiles: Array, total: number, page: number, limit: number}>}
   */
  async getProfilesByPartner(partnerId, page = 1, limit = 20, search = '', status = null, gender = null) {
    const [results] = await pool.query(
      'CALL partner_admin_get_profiles_by_partner(?, ?, ?, ?, ?, ?)',
      [partnerId, page, limit, search || null, status, gender]
    );
    checkSpResult(results, 'partner_admin_get_profiles_by_partner');
    const total = results[0]?.[0]?.total || 0;
    const profiles = results[1] || [];
    return { profiles, total, page, limit };
  },

  /**
   * Get basic profile record by ID.
   * Uses eb_profile_personal_get — returns personal info fields.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object|null>} Profile record or null
   */
  async getProfileById(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_personal_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_personal_get');
    return rows[0]?.[0] || null;
  },

  // ── Profile Sub-section GETs (eb_profile_* SPs) ──

  /**
   * Get address records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Address records
   */
  async getProfileAddress(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_address_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_address_get');
    return rows[0];
  },

  /**
   * Get contact records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Contact records
   */
  async getProfileContact(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_contact_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_contact_get');
    return rows[0];
  },

  /**
   * Get education records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Education records
   */
  async getProfileEducation(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_education_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_education_get');
    return rows[0];
  },

  /**
   * Get employment records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Employment records
   */
  async getProfileEmployment(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_employment_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_employment_get');
    return rows[0];
  },

  /**
   * Get family/reference records for a profile.
   * The SP requires category to be 'family' or 'reference', so we call it twice and merge.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Family/reference records combined
   */
  async getProfileFamily(profileId) {
    const [[famRows], [refRows]] = await Promise.all([
      pool.query('CALL eb_profile_family_reference_get(?, ?, ?)', [profileId, 'family', 'partner-admin']),
      pool.query('CALL eb_profile_family_reference_get(?, ?, ?)', [profileId, 'reference', 'partner-admin']),
    ]);
    checkSpResult(famRows, 'eb_profile_family_reference_get(family)');
    checkSpResult(refRows, 'eb_profile_family_reference_get(reference)');
    return [...(famRows[0] || []), ...(refRows[0] || [])];
  },

  /**
   * Get photo records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Photo records
   */
  async getProfilePhotos(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_photo_get(?)',
      [profileId]
    );
    checkSpResult(rows, 'eb_profile_photo_get');
    return rows[0];
  },

  /**
   * Get lifestyle record for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Lifestyle records (typically single)
   */
  async getProfileLifestyle(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_lifestyle_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_lifestyle_get');
    return rows[0];
  },

  /**
   * Get hobby/interest records for a profile.
   * SP requires category = 'hobby' or 'interest'; fetch both and merge.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Hobby/interest records
   */
  async getProfileHobbyInterest(profileId) {
    const [hRows] = await pool.query(
      'CALL eb_profile_hobby_interest_get(?, NULL, ?, ?)',
      [profileId, 'hobby', 'partner-admin']
    );
    checkSpResult(hRows, 'eb_profile_hobby_interest_get');
    const [iRows] = await pool.query(
      'CALL eb_profile_hobby_interest_get(?, NULL, ?, ?)',
      [profileId, 'interest', 'partner-admin']
    );
    checkSpResult(iRows, 'eb_profile_hobby_interest_get');
    return [...(hRows[0] || []), ...(iRows[0] || [])];
  },

  /**
   * Get property records for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Property records
   */
  async getProfileProperty(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_property_get(?, NULL, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_property_get');
    return rows[0];
  },

  /**
   * Get profiles viewed by this profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} View records (profiles this user viewed)
   */
  async getProfileViewedByMe(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_views_get_viewed_by_me(?, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_views_get_viewed_by_me');
    return rows[0];
  },

  /**
   * Get profiles that viewed this profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} View records (profiles that viewed this user)
   */
  async getProfileViewedMe(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_views_get_viewed_me(?, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(rows, 'eb_profile_views_get_viewed_me');
    return rows[0];
  },

  /**
   * Get favorites for a profile.
   * @param {number} profileId - Profile ID
   * @param {number} accountId - Account ID (required by eb SP)
   * @returns {Promise<Array>} Favorite records
   */
  async getProfileFavorites(profileId, accountId) {
    const [rows] = await pool.query(
      'CALL eb_profile_favorites_get(?, ?)',
      [profileId, accountId]
    );
    checkSpResult(rows, 'eb_profile_favorites_get');
    return rows[0];
  },

  // ── Full Profile (aggregated from eb_profile_* GETs) ──

  /**
   * Build a complete profile object from individual eb_profile_*_get SPs.
   * Includes all sub-sections: personal, address, contact, education, employment,
   * family, photos, lifestyle, hobbies, property, views, favorites.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Object|null>} Full profile object or null if not found
   */
  async getFullProfile(profileId) {
    // Get personal first to check existence and get account_id
    const [personal] = await pool.query(
      'CALL eb_profile_get_complete_data(?, ?)',
      [profileId, 'partner-admin']
    );
    checkSpResult(personal, 'eb_profile_get_complete_data');
    if (!personal[0]?.[0]) return null;

    const accountId = personal[0][0].account_id;

    // Fetch all sub-sections in parallel for performance
    const [address, contact, education, employment, family, photos, lifestyle, hobbies, property, searchPreference, viewedByMe, viewedMe, favorites] =
      await Promise.all([
        this.getProfileAddress(profileId),
        this.getProfileContact(profileId),
        this.getProfileEducation(profileId),
        this.getProfileEmployment(profileId),
        this.getProfileFamily(profileId),
        this.getProfilePhotos(profileId),
        this.getProfileLifestyle(profileId),
        this.getProfileHobbyInterest(profileId),
        this.getProfileProperty(profileId),
        this.getProfileSearchPreference(profileId),
        this.getProfileViewedByMe(profileId),
        this.getProfileViewedMe(profileId),
        this.getProfileFavorites(profileId, accountId),
      ]);

    return {
      personal: personal[0][0],
      address, contact, education, employment, family,
      photos, lifestyle, hobbies, property, searchPreference,
      views: { viewedByMe, viewedMe },
      favorites
    };
  },

  // ── Create Account + Login (uses eb_account_login_create — generates account_code internally) ──
  async createAccountWithLogin(data) {
    const [rows] = await pool.query(
      'CALL eb_account_login_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.email,
        data.password || null,
        data.first_name,
        data.middle_name || null,
        data.last_name,
        data.birth_date,
        data.gender,
        data.primary_phone,
        data.primary_phone_country || '1',
        data.primary_phone_type || 1,
        data.secondary_phone || null,
        data.secondary_phone_country || null,
        data.secondary_phone_type || null,
        data.address_line1 || null,
        data.address_line2 || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.country || null,
        data.photo || null,
        data.secret_question || null,
        data.secret_answer || null,
        data.partner_id
      ]
    );
    checkSpResult(rows, 'eb_account_login_create');
    const result = rows[0]?.[0];
    return { accountId: result?.account_id, accountCode: result?.account_code };
  },

  /**
   * Create a new profile_personal record.
   * Uses eb_profile_personal_create (29 params) for full field coverage.
   * @param {Object} data - Profile personal fields
   * @returns {Promise<number>} New profile_personal_id
   */
  async createProfilePersonal(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_personal_create(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.account_id,
        data.first_name,
        data.last_name,
        data.middle_name || null,
        data.prefix || null,
        data.suffix || null,
        data.gender,
        data.birth_date,
        data.phone_mobile,
        data.phone_home || null,
        data.phone_emergency || null,
        data.email_id,
        data.marital_status,
        data.religion || null,
        data.nationality || null,
        data.caste || null,
        data.height_inches || null,
        data.height_cms || null,
        data.weight || null,
        data.weight_units || null,
        data.complexion || null,
        data.linkedin || null,
        data.facebook || null,
        data.instagram || null,
        data.whatsapp_number || null,
        data.profession || null,
        data.disability || null,
        data.created_user || 'admin',
        data.short_summary || null
      ]
    );
    checkSpResult(rows, 'eb_profile_personal_create');
    return rows[0]?.[0]?.profile_id;
  },

  // createLogin removed — login creation is now integrated in eb_account_login_create

  // ── Update Profile ──

  /**
   * Update an existing profile_personal record.
   * Uses eb_profile_personal_update (30 params) for full field coverage.
   * Fields passed as undefined are sent as null (SP treats null as "no change").
   * @param {number} profileId - Profile ID to update
   * @param {Object} data - Fields to update
   * @returns {Promise<boolean>} True if rows were affected
   */
  async updateProfilePersonal(profileId, data) {
    const v = (key) => data[key] !== undefined ? data[key] : null;
    const [rows] = await pool.query(
      'CALL eb_profile_personal_update(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        profileId,
        v('account_id'),
        v('first_name'),
        v('last_name'),
        v('middle_name'),
        v('prefix'),
        v('suffix'),
        v('gender'),
        v('birth_date'),
        v('phone_mobile'),
        v('phone_home'),
        v('phone_emergency'),
        v('email_id'),
        v('marital_status'),
        v('religion'),
        v('nationality'),
        v('caste'),
        v('height_inches'),
        v('height_cms'),
        v('weight'),
        v('weight_units'),
        v('complexion'),
        v('linkedin'),
        v('facebook'),
        v('instagram'),
        v('whatsapp_number'),
        v('profession'),
        v('disability'),
        data.updated_user || 'admin',
        v('short_summary')
      ]
    );
    checkSpResult(rows, 'eb_profile_personal_update');
    return (rows[0]?.[0]?.affected || 0) > 0;
  },

  async toggleAccountStatus(accountId, isActive, reason, modifiedUser) {
    const [rows] = await pool.query(
      'CALL eb_enable_disable_account(?, ?, ?, ?)',
      [accountId, isActive ? 1 : 0, reason || null, modifiedUser || 'admin']
    );
    checkSpResult(rows, 'eb_enable_disable_account');
  },

  // ══════════════════════════════════════════════════
  // ── Sub-section CRUD Methods (Phase 3)
  // ══════════════════════════════════════════════════

  // ── Address ──

  /** @param {Object} data - profile_id, address_type, address_line1, address_line2, city, state, country_id, zip, landmark1, landmark2, created_user */
  async createProfileAddress(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_address_create(?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.address_type || null, data.address_line1, data.address_line2 || null,
       data.city || null, data.state || null, data.country_id || null, data.zip || null,
       data.landmark1 || null, data.landmark2 || null, data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_address_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_address_id + address fields + modified_user */
  async updateProfileAddress(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_address_update(?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_address_id, data.address_type || null, data.address_line1, data.address_line2 || null,
       data.city || null, data.state || null, data.country_id || null, data.zip || null,
       data.landmark1 || null, data.landmark2 || null, data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_address_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP exists for address delete */
  async deleteProfileAddress(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_address WHERE profile_address_id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Contact ──

  /** @param {Object} data - profile_id, contact_type, contact_value, created_user */
  async createProfileContact(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_contact_create(?,?,?,?)',
      [data.profile_id, data.contact_type, data.contact_value, data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_contact_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - contact_id, contact_type, contact_value, isverified, isvalid, modified_user */
  async updateProfileContact(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_contact_update(?,?,?,?,?,?)',
      [data.contact_id, data.contact_type, data.contact_value,
       data.isverified !== undefined ? data.isverified : null,
       data.isvalid !== undefined ? data.isvalid : null,
       data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_contact_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP exists for contact delete */
  async deleteProfileContact(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_contact WHERE id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Education ──

  /** @param {Object} data - profile_id, education_level, year_completed, institution_name, address_line1, city, state_id, country_id, zip, field_of_study, created_user */
  async createProfileEducation(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_education_create(?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.education_level || null, data.year_completed || null,
       data.institution_name || null, data.address_line1 || null, data.city || null,
       data.state_id || null, data.country_id || null, data.zip || null,
       data.field_of_study || null, data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_education_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_education_id + education fields + modified_user */
  async updateProfileEducation(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_education_update(?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_education_id, data.education_level || null, data.year_completed || null,
       data.institution_name || null, data.address_line1 || null, data.city || null,
       data.state_id || null, data.country_id || null, data.zip || null,
       data.field_of_study || null, data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_education_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP exists for education delete */
  async deleteProfileEducation(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_education WHERE profile_education_id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Employment ──

  /** @param {Object} data - profile_id, institution_name, address_line1, city, state_id, country_id, zip, start_year, end_year, job_title_id, other_title, last_salary_drawn, created_user */
  async createProfileEmployment(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_employment_create(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.institution_name || null, data.address_line1 || null,
       data.city || null, data.state_id || null, data.country_id || null, data.zip || null,
       data.start_year || null, data.end_year || null, data.job_title_id || null,
       data.other_title || null, data.last_salary_drawn || null, data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_employment_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_employment_id + employment fields + modified_user */
  async updateProfileEmployment(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_employment_update(?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_employment_id, data.institution_name || null, data.address_line1 || null,
       data.city || null, data.state_id || null, data.country_id || null, data.zip || null,
       data.start_year || null, data.end_year || null, data.job_title_id || null,
       data.other_title || null, data.last_salary_drawn || null, data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_employment_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP exists for employment delete */
  async deleteProfileEmployment(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_employment WHERE profile_employment_id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Family/Reference ──

  /** @param {Object} data - profile_id + 30 family fields + created_user */
  async createProfileFamily(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_family_reference_create(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id,
       data.father_name || null, data.father_occupation || null, data.father_income || null,
       data.mother_name || null, data.mother_occupation || null, data.mother_income || null,
       data.brother_count || null, data.sister_count || null,
       data.brother_married || null, data.sister_married || null,
       data.family_type || null, data.family_status || null, data.family_values || null,
       data.ref1_name || null, data.ref1_relation || null, data.ref1_phone || null,
       data.ref1_email || null, data.ref1_address || null,
       data.ref2_name || null, data.ref2_relation || null, data.ref2_phone || null,
       data.ref2_email || null, data.ref2_address || null,
       data.ref3_name || null, data.ref3_relation || null, data.ref3_phone || null,
       data.ref3_email || null, data.ref3_address || null,
       data.family_description || null,
       data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_family_reference_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_family_reference_id + 30 fields + modified_user */
  async updateProfileFamily(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_family_reference_update(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_family_reference_id,
       data.father_name || null, data.father_occupation || null, data.father_income || null,
       data.mother_name || null, data.mother_occupation || null, data.mother_income || null,
       data.brother_count || null, data.sister_count || null,
       data.brother_married || null, data.sister_married || null,
       data.family_type || null, data.family_status || null, data.family_values || null,
       data.ref1_name || null, data.ref1_relation || null, data.ref1_phone || null,
       data.ref1_email || null, data.ref1_address || null,
       data.ref2_name || null, data.ref2_relation || null, data.ref2_phone || null,
       data.ref2_email || null, data.ref2_address || null,
       data.ref3_name || null, data.ref3_relation || null, data.ref3_phone || null,
       data.ref3_email || null, data.ref3_address || null,
       data.family_description || null,
       data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_family_reference_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP for family delete */
  async deleteProfileFamily(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_family_reference WHERE profile_family_reference_id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Lifestyle ──

  /** @param {Object} data - profile_id, eating_habit, diet_habit, cigarettes_per_day, drink_frequency, gambling_engage, physical_activity_level, relaxation_methods, additional_info, created_user */
  async createProfileLifestyle(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_lifestyle_create(?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.eating_habit || null, data.diet_habit || null,
       data.cigarettes_per_day || null, data.drink_frequency || null,
       data.gambling_engage || null, data.physical_activity_level || null,
       data.relaxation_methods || null, data.additional_info || null,
       data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_lifestyle_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_lifestyle_id + lifestyle fields + modified_user */
  async updateProfileLifestyle(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_lifestyle_update(?,?,?,?,?,?,?,?,?,?)',
      [data.profile_lifestyle_id, data.eating_habit || null, data.diet_habit || null,
       data.cigarettes_per_day || null, data.drink_frequency || null,
       data.gambling_engage || null, data.physical_activity_level || null,
       data.relaxation_methods || null, data.additional_info || null,
       data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_lifestyle_update');
    return rows[0]?.[0] || null;
  },

  /** Uses existing eb SP — soft-delete (sets isverified=-1) */
  async deleteProfileLifestyle(id, user) {
    const [rows] = await pool.query(
      'CALL eb_profile_lifestyle_delete(?,?)',
      [id, user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_lifestyle_delete');
    return true;
  },

  // ── Hobby/Interest ──

  /** @param {Object} data - profile_id, hobby_interest_id, description, created_user */
  async createProfileHobby(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_hobby_interest_create(?,?,?,?)',
      [data.profile_id, data.hobby_interest_id || null, data.description || null,
       data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_hobby_interest_create');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb update SP for hobby */
  async updateProfileHobby(id, data) {
    const [result] = await pool.query(
      'UPDATE profile_hobby_interest SET hobby_interest_id=?, description=?, date_modified=NOW(), user_modified=? WHERE profile_hobby_intereste_id=? AND profile_id=?',
      [data.hobby_interest_id || null, data.description || null,
       data.modified_user || 'admin', id, data.profile_id]
    );
    return result.affectedRows > 0;
  },

  /** Uses existing eb SP — soft-delete (sets isverified=-1) */
  async deleteProfileHobby(id, user) {
    const [rows] = await pool.query(
      'CALL eb_profile_hobby_interest_delete(?,?)',
      [id, user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_hobby_interest_delete');
    return true;
  },

  // ── Property ──

  /** @param {Object} data - profile_id, property_type, ownership_type, property_address, property_value, property_description, isoktodisclose, created_by */
  async createProfileProperty(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_property_create(?,?,?,?,?,?,?,?)',
      [data.profile_id, data.property_type || null, data.ownership_type || null,
       data.property_address || null, data.property_value || null,
       data.property_description || null, data.isoktodisclose !== undefined ? data.isoktodisclose : null,
       data.created_by || 'admin']
    );
    checkSpResult(rows, 'eb_profile_property_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - profile_id, property_id + property fields + modified_user */
  async updateProfileProperty(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_property_update(?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.property_id, data.property_type || null,
       data.ownership_type || null, data.property_address || null,
       data.property_value || null, data.property_description || null,
       data.isoktodisclose !== undefined ? data.isoktodisclose : null,
       data.modified_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_property_update');
    return rows[0]?.[0] || null;
  },

  /** Direct SQL — no eb SP for property delete */
  async deleteProfileProperty(id, profileId) {
    const [result] = await pool.query(
      'DELETE FROM profile_property WHERE property_id = ? AND profile_id = ?',
      [id, profileId]
    );
    return result.affectedRows > 0;
  },

  // ── Photo ──

  /** Get a single photo by profile + photo_type (category). Returns null if none. */
  async getProfilePhotoByType(profileId, photoType) {
    const [rows] = await pool.query(
      'SELECT * FROM profile_photo WHERE profile_id = ? AND photo_type = ? AND (softdelete = 0 OR softdelete IS NULL) LIMIT 1',
      [profileId, photoType]
    );
    return rows?.[0] || null;
  },

  /**
   * Create a profile photo record via eb_profile_photo_create SP.
   * SP params: p_profile_id, p_url, p_photo_type, p_caption, p_description, p_created_user
   * @param {Object} data - profile_id, url, photo_type, caption, description, created_user
   */
  async createProfilePhoto(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_photo_create(?,?,?,?,?,?)',
      [data.profile_id, data.url || null, data.photo_type || 2,
       data.caption || null, data.description || null,
       data.created_user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_photo_create');
    const result = rows[0]?.[0] || null;

    // SP doesn't handle relative_path — update it directly if provided
    if (result && result.profile_photo_id && data.relative_path) {
      await pool.query(
        'UPDATE profile_photo SET relative_path = ? WHERE profile_photo_id = ?',
        [data.relative_path, result.profile_photo_id]
      );
    }

    return result;
  },

  /**
   * Get partner logo URL from brand config for watermarking.
   * @param {number} partnerId
   * @returns {Promise<string|null>} Logo URL or null
   */
  async getPartnerLogoUrl(partnerId) {
    const [rows] = await pool.query(
      'SELECT logo_url, logo_small_url FROM partner_brand_config WHERE partner_id = ? LIMIT 1',
      [partnerId]
    );
    const config = rows?.[0];
    return config?.logo_url || config?.logo_small_url || null;
  },

  /** Get partner brand name for text watermarking */
  async getPartnerBrandName(partnerId) {
    const [rows] = await pool.query(
      'SELECT brand_name FROM partner_brand_config WHERE partner_id = ? LIMIT 1',
      [partnerId]
    );
    return rows?.[0]?.brand_name || null;
  },

  /** Uses existing eb SP — hard delete */
  async deleteProfilePhoto(photoId, profileId, user) {
    const [rows] = await pool.query(
      'CALL eb_profile_photo_delete(?,?,?)',
      [photoId, profileId, user || 'admin']
    );
    checkSpResult(rows, 'eb_profile_photo_delete');
    return true;
  },

  /** Direct SQL — set photo as primary (swap photo_type 1↔2) */
  async setProfilePhotoPrimary(photoId, profileId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE profile_photo SET photo_type = 2 WHERE profile_id = ? AND photo_type = 1',
        [profileId]
      );
      await conn.query(
        'UPDATE profile_photo SET photo_type = 1 WHERE profile_photo_id = ? AND profile_id = ?',
        [photoId, profileId]
      );
      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // ── Search Preference ──

  /**
   * Get search preference for a profile.
   * @param {number} profileId - Profile ID
   * @returns {Promise<Array>} Search preference records (typically single)
   */
  async getProfileSearchPreference(profileId) {
    const [rows] = await pool.query(
      'CALL eb_profile_search_preference_get(?)',
      [profileId]
    );
    checkSpResult(rows, 'eb_profile_search_preference_get');
    return rows[0];
  },

  /** @param {Object} data - profile_id, min_age, max_age, gender, religion, max_education, occupation, country, casete_id, marital_status, created_user */
  async createProfileSearchPreference(data) {
    const [rows] = await pool.query(
      'CALL eb_profile_search_preference_create(?,?,?,?,?,?,?,?,?,?,?)',
      [data.profile_id, data.min_age || null, data.max_age || null,
       data.gender || null, data.religion || null, data.max_education || null,
       data.occupation || null, data.country || null, data.casete_id || null,
       data.marital_status || null, data.created_user || 'system']
    );
    checkSpResult(rows, 'eb_profile_search_preference_create');
    return rows[0]?.[0] || null;
  },

  /** @param {Object} data - search_preference_id + preference fields */
  async updateProfileSearchPreference(data) {
    const [rows] = await pool.query(
      'CALL partner_admin_search_preference_update(?,?,?,?,?,?,?,?,?,?)',
      [data.search_preference_id, data.min_age || null, data.max_age || null,
       data.gender || null, data.religion || null, data.max_education || null,
       data.occupation || null, data.country || null, data.casete_id || null,
       data.marital_status || null]
    );
    checkSpResult(rows, 'partner_admin_search_preference_update');
    return rows[0]?.[0] || null;
  },

  async deleteProfileSearchPreference(id, profileId) {
    const [rows] = await pool.query(
      'CALL partner_admin_search_preference_delete(?,?)',
      [id, profileId]
    );
    checkSpResult(rows, 'partner_admin_search_preference_delete');
    return true;
  },

  // ── GDPR Delete Operations ──

  /** Soft delete — marks account as deleted + deactivates account/login */
  async softDeleteAccount(accountId, deletedUser, reason) {
    const [rows] = await pool.query(
      'CALL partner_admin_soft_delete_account(?,?,?)',
      [accountId, deletedUser, reason]
    );
    checkSpResult(rows, 'partner_admin_soft_delete_account');
    return rows[0]?.[0] || null;
  },

  /** Restore — reverses a soft delete */
  async restoreAccount(accountId, partnerId, restoredUser) {
    const [rows] = await pool.query(
      'CALL partner_admin_restore_account(?,?,?)',
      [accountId, partnerId, restoredUser]
    );
    checkSpResult(rows, 'partner_admin_restore_account');
    return rows[0]?.[0] || null;
  },

  /** Hard delete — permanent cascading delete + certificate */
  async hardDeleteProfile(accountId, partnerId, deletedUser, reasonType, reasonNotes) {
    const [rows] = await pool.query(
      'CALL partner_admin_hard_delete_profile(?,?,?,?,?)',
      [accountId, partnerId, deletedUser, reasonType, reasonNotes]
    );
    checkSpResult(rows, 'partner_admin_hard_delete_profile');
    return rows[0]?.[0] || null;
  },

  /** Anonymize — mask PII, keep statistical data + certificate */
  async anonymizeProfile(accountId, partnerId, deletedUser, reasonType, reasonNotes) {
    const [rows] = await pool.query(
      'CALL partner_admin_anonymize_profile(?,?,?,?,?)',
      [accountId, partnerId, deletedUser, reasonType, reasonNotes]
    );
    checkSpResult(rows, 'partner_admin_anonymize_profile');
    return rows[0]?.[0] || null;
  },

  /** List soft-deleted profiles for a partner */
  async listDeletedProfiles(partnerId, page, pageSize) {
    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT pp.profile_id, pp.account_id, pp.first_name, pp.last_name,
              a.account_code, a.email, a.deleted_date, a.deleted_user, a.deleted_reason
       FROM profile_personal pp
       JOIN account a ON pp.account_id = a.account_id
       WHERE a.registered_partner_id = ? AND a.is_deleted = 1
       ORDER BY a.deleted_date DESC
       LIMIT ? OFFSET ?`,
      [partnerId, pageSize, offset]
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM profile_personal pp
       JOIN account a ON pp.account_id = a.account_id
       WHERE a.registered_partner_id = ? AND a.is_deleted = 1`,
      [partnerId]
    );
    return { data: rows, total: countRows[0]?.total || 0 };
  },

  /** Get all deletion certificates for a partner */
  async getDeletionCertificates(partnerId) {
    const [rows] = await pool.query(
      `SELECT * FROM partner_admin_deletion_certificate
       WHERE partner_id = ?
       ORDER BY deleted_at DESC`,
      [partnerId]
    );
    return rows;
  },

  /** Get a single deletion certificate by ID or code */
  async getDeletionCertificate(certificateId, partnerId) {
    const [rows] = await pool.query(
      `SELECT * FROM partner_admin_deletion_certificate
       WHERE certificate_id = ? AND partner_id = ?`,
      [certificateId, partnerId]
    );
    return rows[0] || null;
  },

  /** Get account_id from profile_id (needed for delete operations) */
  async getAccountIdByProfileId(profileId) {
    const [rows] = await pool.query(
      'SELECT account_id FROM profile_personal WHERE profile_id = ?',
      [profileId]
    );
    return rows[0]?.account_id || null;
  },

  // ── Lookup values ──
  async getLookupValues(lookupType) {
    const [rows] = await pool.query('CALL partner_admin_get_lookup_values(?)', [lookupType]);
    return rows[0];
  },

  async getAllLookups() {
    const [rows] = await pool.query('CALL partner_admin_get_all_lookups()');
    return rows[0];
  },

  // generateAccountCode removed — account code generation is now integrated in eb_account_login_create
};

module.exports = profileAdo;
