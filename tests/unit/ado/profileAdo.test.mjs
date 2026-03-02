import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import {
  profilePersonal, profileAddress, profileContact, profileEducation,
  profileEmployment, profileFamily, profilePhoto, profilePhotos, profileLifestyle,
  profileHobbies, profileProperty, profileViewedByMe, profileViewedMe,
  profileFavorites, lookupValues
} from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const profileAdo = require('../../../ado/profileAdo');

afterEach(() => pool.query.reset());

describe('profileAdo', () => {
  // ── Listing (partner_admin SP — no eb equivalent) ──

  describe('getProfilesByPartner', () => {
    it('should return profiles list with total', async () => {
      pool.query.resolves([[[{ total: 1 }], [profilePersonal]]]);
      const result = await profileAdo.getProfilesByPartner(1, 1, 20);
      assert.strictEqual(result.total, 1);
      assert.deepStrictEqual(result.profiles, [profilePersonal]);
    });

    it('should return empty when no profiles', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      const result = await profileAdo.getProfilesByPartner(1);
      assert.strictEqual(result.total, 0);
      assert.deepStrictEqual(result.profiles, []);
    });

    it('should call partner_admin_get_profiles_by_partner with correct params', async () => {
      pool.query.resolves([[[{ total: 0 }], []]]);
      await profileAdo.getProfilesByPartner(1, 2, 10, 'john', 1, 2);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_get_profiles_by_partner(?, ?, ?, ?, ?, ?)',
        [1, 2, 10, 'john', 1, 2]
      ));
    });
  });

  // ── Profile by ID (eb_profile_personal_get) ──

  describe('getProfileById', () => {
    it('should return profile by id via eb_profile_personal_get', async () => {
      pool.query.resolves([[[profilePersonal]]]);
      const result = await profileAdo.getProfileById(101);
      assert.deepStrictEqual(result, profilePersonal);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_personal_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });

    it('should return null for missing profile', async () => {
      pool.query.resolves([[[]]]);
      const result = await profileAdo.getProfileById(999);
      assert.strictEqual(result, null);
    });
  });

  // ── Sub-section GETs (eb_profile_* SPs) ──

  describe('getProfileAddress', () => {
    it('should call eb_profile_address_get and return address array', async () => {
      pool.query.resolves([[profileAddress]]);
      const result = await profileAdo.getProfileAddress(101);
      assert.deepStrictEqual(result, profileAddress);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_address_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileContact', () => {
    it('should call eb_profile_contact_get and return contact array', async () => {
      pool.query.resolves([[profileContact]]);
      const result = await profileAdo.getProfileContact(101);
      assert.deepStrictEqual(result, profileContact);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_contact_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileEducation', () => {
    it('should call eb_profile_education_get and return education array', async () => {
      pool.query.resolves([[profileEducation]]);
      const result = await profileAdo.getProfileEducation(101);
      assert.deepStrictEqual(result, profileEducation);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_education_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileEmployment', () => {
    it('should call eb_profile_employment_get and return employment array', async () => {
      pool.query.resolves([[profileEmployment]]);
      const result = await profileAdo.getProfileEmployment(101);
      assert.deepStrictEqual(result, profileEmployment);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_employment_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileFamily', () => {
    it('should call eb_profile_family_reference_get twice (family + reference) and merge results', async () => {
      const famData = [{ id: 1, type: 'family' }];
      const refData = [{ id: 2, type: 'reference' }];
      pool.query.onFirstCall().resolves([[famData]]);
      pool.query.onSecondCall().resolves([[refData]]);
      const result = await profileAdo.getProfileFamily(101);
      assert.deepStrictEqual(result, [...famData, ...refData]);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_family_reference_get(?, ?, ?)',
        [101, 'family', 'partner-admin']
      ));
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_family_reference_get(?, ?, ?)',
        [101, 'reference', 'partner-admin']
      ));
    });

    it('should return empty array when both categories are empty', async () => {
      pool.query.onFirstCall().resolves([[[]]]);
      pool.query.onSecondCall().resolves([[[]]]);
      const result = await profileAdo.getProfileFamily(101);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('getProfilePhotos', () => {
    it('should call eb_profile_photo_get and return photos array', async () => {
      pool.query.resolves([[profilePhotos]]);
      const result = await profileAdo.getProfilePhotos(101);
      assert.deepStrictEqual(result, profilePhotos);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_photo_get(?)',
        [101]
      ));
    });
  });

  describe('getProfileLifestyle', () => {
    it('should call eb_profile_lifestyle_get and return lifestyle array', async () => {
      pool.query.resolves([[profileLifestyle]]);
      const result = await profileAdo.getProfileLifestyle(101);
      assert.deepStrictEqual(result, profileLifestyle);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_lifestyle_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileHobbyInterest', () => {
    it('should call eb_profile_hobby_interest_get and return hobbies array', async () => {
      pool.query.resolves([[profileHobbies]]);
      const result = await profileAdo.getProfileHobbyInterest(101);
      assert.deepStrictEqual(result, profileHobbies);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_hobby_interest_get(?, NULL, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileProperty', () => {
    it('should call eb_profile_property_get and return property array', async () => {
      pool.query.resolves([[profileProperty]]);
      const result = await profileAdo.getProfileProperty(101);
      assert.deepStrictEqual(result, profileProperty);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_property_get(?, NULL, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  // ── Views (eb_profile_views_get_viewed_by_me / _viewed_me) ──

  describe('getProfileViewedByMe', () => {
    it('should call eb_profile_views_get_viewed_by_me and return view records', async () => {
      pool.query.resolves([[profileViewedByMe]]);
      const result = await profileAdo.getProfileViewedByMe(101);
      assert.deepStrictEqual(result, profileViewedByMe);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_views_get_viewed_by_me(?, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  describe('getProfileViewedMe', () => {
    it('should call eb_profile_views_get_viewed_me and return view records', async () => {
      pool.query.resolves([[profileViewedMe]]);
      const result = await profileAdo.getProfileViewedMe(101);
      assert.deepStrictEqual(result, profileViewedMe);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_views_get_viewed_me(?, ?)',
        [101, 'partner-admin']
      ));
    });
  });

  // ── Favorites (eb_profile_favorites_get) ──

  describe('getProfileFavorites', () => {
    it('should call eb_profile_favorites_get with profileId and accountId', async () => {
      pool.query.resolves([[profileFavorites]]);
      const result = await profileAdo.getProfileFavorites(101, 201);
      assert.deepStrictEqual(result, profileFavorites);
      assert.ok(pool.query.calledWith(
        'CALL eb_profile_favorites_get(?, ?)',
        [101, 201]
      ));
    });
  });

  // ── Full Profile (aggregated) ──

  describe('getFullProfile', () => {
    it('should return null when profile not found', async () => {
      pool.query.resolves([[[]]]);
      const result = await profileAdo.getFullProfile(999);
      assert.strictEqual(result, null);
    });
  });

  // ── Create Account (partner_admin SP — account creation) ──

  describe('createAccount', () => {
    it('should return insert id', async () => {
      pool.query.resolves([[[{ insertId: 201 }]]]);
      const result = await profileAdo.createAccount({
        account_code: 'EKM001', email: 'jane@example.com', primary_phone: '9876543211',
        first_name: 'Jane', last_name: 'Smith', birth_date: '1997-03-20',
        gender: 2, address_line1: '456 Oak', city: 'Delhi', state: 'DL',
        zip: '110001', country: 'IN', registered_partner_id: 1
      });
      assert.strictEqual(result, 201);
    });
  });

  // ── Create Profile Personal (eb_profile_personal_create — 29 params) ──

  describe('createProfilePersonal', () => {
    it('should call eb_profile_personal_create and return insert id', async () => {
      pool.query.resolves([[[{ insertId: 102 }]]]);
      const result = await profileAdo.createProfilePersonal({
        account_id: 201, first_name: 'Jane', last_name: 'Smith',
        gender: 2, birth_date: '1997-03-20', phone_mobile: '9876543211',
        email_id: 'jane@example.com', marital_status: 'Single'
      });
      assert.strictEqual(result, 102);
      // Verify correct SP called with 29 placeholders
      const callArgs = pool.query.firstCall.args;
      assert.ok(callArgs[0].startsWith('CALL eb_profile_personal_create('));
      assert.strictEqual(callArgs[1].length, 29);
    });

    it('should pass additional fields (prefix, suffix, phone_home, etc.)', async () => {
      pool.query.resolves([[[{ insertId: 103 }]]]);
      const result = await profileAdo.createProfilePersonal({
        account_id: 201, first_name: 'Jane', last_name: 'Smith',
        prefix: 'Dr', suffix: 'Jr', gender: 2, birth_date: '1997-03-20',
        phone_mobile: '9876543211', phone_home: '1234567890',
        phone_emergency: '0987654321', email_id: 'jane@example.com',
        marital_status: 'Single', height_cms: 165, weight_units: 'kg',
        linkedin: 'https://linkedin.com/in/jane', disability: 'None',
        created_user: 'partneradmin', short_summary: 'Test'
      });
      assert.strictEqual(result, 103);
      const params = pool.query.firstCall.args[1];
      assert.strictEqual(params[4], 'Dr');       // prefix
      assert.strictEqual(params[5], 'Jr');       // suffix
      assert.strictEqual(params[9], '1234567890'); // phone_home
      assert.strictEqual(params[10], '0987654321'); // phone_emergency
      assert.strictEqual(params[17], 165);        // height_cms
      assert.strictEqual(params[19], 'kg');       // weight_units
      assert.strictEqual(params[21], 'https://linkedin.com/in/jane'); // linkedin
      assert.strictEqual(params[26], 'None');     // disability
    });
  });

  describe('createLogin', () => {
    it('should return insert id', async () => {
      pool.query.resolves([[[{ insertId: 301 }]]]);
      const result = await profileAdo.createLogin(201, 'janesmith', 'hash');
      assert.strictEqual(result, 301);
    });
  });

  // ── Update Profile Personal (eb_profile_personal_update — 30 params) ──

  describe('updateProfilePersonal', () => {
    it('should call eb_profile_personal_update and return true on success', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await profileAdo.updateProfilePersonal(101, { first_name: 'Updated' });
      assert.strictEqual(result, true);
      const callArgs = pool.query.firstCall.args;
      assert.ok(callArgs[0].startsWith('CALL eb_profile_personal_update('));
      assert.strictEqual(callArgs[1].length, 30);
      assert.strictEqual(callArgs[1][0], 101);       // profileId
      assert.strictEqual(callArgs[1][2], 'Updated');  // first_name
    });

    it('should return false when no rows affected', async () => {
      pool.query.resolves([[[{ affected: 0 }]]]);
      const result = await profileAdo.updateProfilePersonal(999, { first_name: 'X' });
      assert.strictEqual(result, false);
    });

    it('should pass undefined fields as null', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfilePersonal(101, { first_name: 'Updated', updated_user: 'admin' });
      const params = pool.query.firstCall.args[1];
      // Fields not provided should be null
      assert.strictEqual(params[1], null);  // account_id not provided
      assert.strictEqual(params[5], null);  // prefix not provided
      assert.strictEqual(params[6], null);  // suffix not provided
      assert.strictEqual(params[2], 'Updated'); // first_name provided
    });
  });

  // ── Toggle (partner_admin SP — no eb equivalent) ──

  describe('toggleProfileStatus', () => {
    it('should call partner_admin_toggle_profile_status', async () => {
      pool.query.resolves([[]]);
      await profileAdo.toggleProfileStatus(101, 0);
      assert.ok(pool.query.calledWith('CALL partner_admin_toggle_profile_status(?, ?)', [101, 0]));
    });
  });

  // ── Lookups (partner_admin SPs — no eb equivalent) ──

  describe('getLookupValues', () => {
    it('should return lookups by type', async () => {
      pool.query.resolves([[lookupValues]]);
      const result = await profileAdo.getLookupValues('religion');
      assert.deepStrictEqual(result, lookupValues);
    });
  });

  describe('getAllLookups', () => {
    it('should return all lookups', async () => {
      pool.query.resolves([[lookupValues]]);
      const result = await profileAdo.getAllLookups();
      assert.deepStrictEqual(result, lookupValues);
    });
  });

  describe('generateAccountCode', () => {
    it('should return account code', async () => {
      pool.query.resolves([[[{ account_code: 'EKM001' }]]]);
      const result = await profileAdo.generateAccountCode('EKM');
      assert.strictEqual(result, 'EKM001');
    });
  });

  // ══════════════════════════════════════════════════
  // ── Sub-section CRUD (Phase 3)
  // ══════════════════════════════════════════════════

  // ── Address ──
  describe('createProfileAddress', () => {
    it('should call eb_profile_address_create and return result', async () => {
      pool.query.resolves([[[{ insertId: 10 }]]]);
      const result = await profileAdo.createProfileAddress({
        profile_id: 101, address_type: 1, address_line1: '123 Main St'
      });
      assert.deepStrictEqual(result, { insertId: 10 });
      assert.ok(pool.query.firstCall.args[0].includes('eb_profile_address_create'));
      assert.strictEqual(pool.query.firstCall.args[1].length, 11);
    });
  });

  describe('updateProfileAddress', () => {
    it('should call eb_profile_address_update and return result', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await profileAdo.updateProfileAddress({
        profile_address_id: 10, address_type: 1, address_line1: '456 Oak Ave'
      });
      assert.deepStrictEqual(result, { affected: 1 });
    });
  });

  describe('deleteProfileAddress', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      const result = await profileAdo.deleteProfileAddress(10, 101);
      assert.strictEqual(result, true);
    });
    it('should return false when no row found', async () => {
      pool.query.resolves([{ affectedRows: 0 }]);
      const result = await profileAdo.deleteProfileAddress(999, 101);
      assert.strictEqual(result, false);
    });
  });

  // ── Contact ──
  describe('createProfileContact', () => {
    it('should call eb_profile_contact_create with 4 params', async () => {
      pool.query.resolves([[[{ insertId: 20 }]]]);
      const result = await profileAdo.createProfileContact({
        profile_id: 101, contact_type: 'phone', contact_value: '9876543210'
      });
      assert.deepStrictEqual(result, { insertId: 20 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 4);
    });
  });

  describe('updateProfileContact', () => {
    it('should call eb_profile_contact_update with 6 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      const result = await profileAdo.updateProfileContact({
        contact_id: 20, contact_type: 'phone', contact_value: '1111111111'
      });
      assert.deepStrictEqual(result, { affected: 1 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 6);
    });
  });

  describe('deleteProfileContact', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      assert.strictEqual(await profileAdo.deleteProfileContact(20, 101), true);
    });
  });

  // ── Education ──
  describe('createProfileEducation', () => {
    it('should call eb_profile_education_create with 11 params', async () => {
      pool.query.resolves([[[{ insertId: 30 }]]]);
      const result = await profileAdo.createProfileEducation({
        profile_id: 101, education_level: 3, institution_name: 'MIT'
      });
      assert.deepStrictEqual(result, { insertId: 30 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 11);
    });
  });

  describe('updateProfileEducation', () => {
    it('should call eb_profile_education_update with 11 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfileEducation({ profile_education_id: 30, education_level: 4 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 11);
    });
  });

  describe('deleteProfileEducation', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      assert.strictEqual(await profileAdo.deleteProfileEducation(30, 101), true);
    });
  });

  // ── Employment ──
  describe('createProfileEmployment', () => {
    it('should call eb_profile_employment_create with 13 params', async () => {
      pool.query.resolves([[[{ insertId: 40 }]]]);
      const result = await profileAdo.createProfileEmployment({
        profile_id: 101, institution_name: 'Google', job_title_id: 5
      });
      assert.deepStrictEqual(result, { insertId: 40 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 13);
    });
  });

  describe('updateProfileEmployment', () => {
    it('should call eb_profile_employment_update with 13 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfileEmployment({ profile_employment_id: 40, institution_name: 'Apple' });
      assert.strictEqual(pool.query.firstCall.args[1].length, 13);
    });
  });

  describe('deleteProfileEmployment', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      assert.strictEqual(await profileAdo.deleteProfileEmployment(40, 101), true);
    });
  });

  // ── Family ──
  describe('createProfileFamily', () => {
    it('should call eb_profile_family_reference_create with 31 params', async () => {
      pool.query.resolves([[[{ insertId: 50 }]]]);
      const result = await profileAdo.createProfileFamily({
        profile_id: 101, father_name: 'John', mother_name: 'Jane'
      });
      assert.deepStrictEqual(result, { insertId: 50 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 31);
    });
  });

  describe('updateProfileFamily', () => {
    it('should call eb_profile_family_reference_update with 31 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfileFamily({ profile_family_reference_id: 50, father_name: 'Updated' });
      assert.strictEqual(pool.query.firstCall.args[1].length, 31);
    });
  });

  describe('deleteProfileFamily', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      assert.strictEqual(await profileAdo.deleteProfileFamily(50, 101), true);
    });
  });

  // ── Lifestyle ──
  describe('createProfileLifestyle', () => {
    it('should call eb_profile_lifestyle_create with 10 params', async () => {
      pool.query.resolves([[[{ insertId: 60 }]]]);
      const result = await profileAdo.createProfileLifestyle({
        profile_id: 101, eating_habit: 'Vegetarian'
      });
      assert.deepStrictEqual(result, { insertId: 60 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 10);
    });
  });

  describe('updateProfileLifestyle', () => {
    it('should call eb_profile_lifestyle_update with 10 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfileLifestyle({ profile_lifestyle_id: 60, eating_habit: 'Non-Veg' });
      assert.strictEqual(pool.query.firstCall.args[1].length, 10);
    });
  });

  describe('deleteProfileLifestyle', () => {
    it('should call eb_profile_lifestyle_delete SP', async () => {
      pool.query.resolves([[[]]]);
      const result = await profileAdo.deleteProfileLifestyle(60, 'admin');
      assert.strictEqual(result, true);
      assert.ok(pool.query.firstCall.args[0].includes('eb_profile_lifestyle_delete'));
    });
  });

  // ── Hobby ──
  describe('createProfileHobby', () => {
    it('should call eb_profile_hobby_interest_create with 4 params', async () => {
      pool.query.resolves([[[{ insertId: 70 }]]]);
      const result = await profileAdo.createProfileHobby({
        profile_id: 101, hobby_interest_id: 5, description: 'Reading'
      });
      assert.deepStrictEqual(result, { insertId: 70 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 4);
    });
  });

  describe('updateProfileHobby', () => {
    it('should use direct SQL UPDATE and return true', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      const result = await profileAdo.updateProfileHobby(70, {
        profile_id: 101, hobby_interest_id: 6, description: 'Writing'
      });
      assert.strictEqual(result, true);
      assert.ok(pool.query.firstCall.args[0].includes('UPDATE profile_hobby_interest'));
    });
  });

  describe('deleteProfileHobby', () => {
    it('should call eb_profile_hobby_interest_delete SP', async () => {
      pool.query.resolves([[[]]]);
      const result = await profileAdo.deleteProfileHobby(70, 'admin');
      assert.strictEqual(result, true);
      assert.ok(pool.query.firstCall.args[0].includes('eb_profile_hobby_interest_delete'));
    });
  });

  // ── Property ──
  describe('createProfileProperty', () => {
    it('should call eb_profile_property_create with 8 params', async () => {
      pool.query.resolves([[[{ insertId: 80 }]]]);
      const result = await profileAdo.createProfileProperty({
        profile_id: 101, property_type: 'House', ownership_type: 'Owned'
      });
      assert.deepStrictEqual(result, { insertId: 80 });
      assert.strictEqual(pool.query.firstCall.args[1].length, 8);
    });
  });

  describe('updateProfileProperty', () => {
    it('should call eb_profile_property_update with 9 params', async () => {
      pool.query.resolves([[[{ affected: 1 }]]]);
      await profileAdo.updateProfileProperty({
        profile_id: 101, property_id: 80, property_type: 'Apartment'
      });
      assert.strictEqual(pool.query.firstCall.args[1].length, 9);
    });
  });

  describe('deleteProfileProperty', () => {
    it('should return true when row deleted', async () => {
      pool.query.resolves([{ affectedRows: 1 }]);
      assert.strictEqual(await profileAdo.deleteProfileProperty(80, 101), true);
    });
  });

  // ── Photo ──
  describe('getProfilePhotoByType', () => {
    it('should return photo for matching profile + type', async () => {
      pool.query.resolves([[profilePhoto]]);
      const result = await profileAdo.getProfilePhotoByType(101, 450);
      assert.deepStrictEqual(result, profilePhoto);
      assert.ok(pool.query.firstCall.args[0].includes('profile_photo'));
      assert.deepStrictEqual(pool.query.firstCall.args[1], [101, 450]);
    });

    it('should return null when no match', async () => {
      pool.query.resolves([[]]);
      const result = await profileAdo.getProfilePhotoByType(101, 999);
      assert.strictEqual(result, null);
    });
  });

  describe('createProfilePhoto', () => {
    it('should call eb_profile_photo_create with 6 params in correct order', async () => {
      pool.query.resolves([[[{ profile_photo_id: 90, status: 'success' }]]]);
      const result = await profileAdo.createProfilePhoto({
        profile_id: 101, url: 'https://example.com/photo.jpg', photo_type: 450,
        caption: 'Clear Headshot', description: 'Photo upload', created_user: 'partneradmin'
      });
      assert.deepStrictEqual(result, { profile_photo_id: 90, status: 'success' });
      const callArgs = pool.query.firstCall.args;
      assert.ok(callArgs[0].includes('eb_profile_photo_create'));
      assert.strictEqual(callArgs[1].length, 6);
      // Verify param order: profile_id, url, photo_type, caption, description, created_user
      assert.strictEqual(callArgs[1][0], 101);
      assert.strictEqual(callArgs[1][1], 'https://example.com/photo.jpg');
      assert.strictEqual(callArgs[1][2], 450);
      assert.strictEqual(callArgs[1][3], 'Clear Headshot');
      assert.strictEqual(callArgs[1][4], 'Photo upload');
      assert.strictEqual(callArgs[1][5], 'partneradmin');
    });

    it('should update relative_path after create when provided', async () => {
      pool.query.onFirstCall().resolves([[[{ profile_photo_id: 90, status: 'success' }]]]);
      pool.query.onSecondCall().resolves([{ affectedRows: 1 }]);
      await profileAdo.createProfilePhoto({
        profile_id: 101, url: 'https://example.com/photo.jpg', photo_type: 450,
        caption: 'Test', relative_path: '1/101/clear_headshot.jpg'
      });
      assert.strictEqual(pool.query.callCount, 2);
      assert.ok(pool.query.secondCall.args[0].includes('UPDATE profile_photo SET relative_path'));
      assert.strictEqual(pool.query.secondCall.args[1][0], '1/101/clear_headshot.jpg');
      assert.strictEqual(pool.query.secondCall.args[1][1], 90);
    });

    it('should not update relative_path when not provided', async () => {
      pool.query.resolves([[[{ profile_photo_id: 90, status: 'success' }]]]);
      await profileAdo.createProfilePhoto({ profile_id: 101, url: 'test.jpg', photo_type: 450 });
      assert.strictEqual(pool.query.callCount, 1);
    });
  });

  describe('getPartnerLogoUrl', () => {
    it('should return logo_url when available', async () => {
      pool.query.resolves([[{ logo_url: 'https://example.com/logo.png', logo_small_url: 'https://example.com/logo-sm.png' }]]);
      const result = await profileAdo.getPartnerLogoUrl(1);
      assert.strictEqual(result, 'https://example.com/logo.png');
    });

    it('should fall back to logo_small_url', async () => {
      pool.query.resolves([[{ logo_url: null, logo_small_url: 'https://example.com/logo-sm.png' }]]);
      const result = await profileAdo.getPartnerLogoUrl(1);
      assert.strictEqual(result, 'https://example.com/logo-sm.png');
    });

    it('should return null when no brand config', async () => {
      pool.query.resolves([[]]);
      const result = await profileAdo.getPartnerLogoUrl(1);
      assert.strictEqual(result, null);
    });
  });

  describe('deleteProfilePhoto', () => {
    it('should call eb_profile_photo_delete SP', async () => {
      pool.query.resolves([[[]]]);
      const result = await profileAdo.deleteProfilePhoto(90, 101, 'admin');
      assert.strictEqual(result, true);
      assert.ok(pool.query.firstCall.args[0].includes('eb_profile_photo_delete'));
    });
  });

  describe('setProfilePhotoPrimary', () => {
    it('should use transaction to swap photo_type', async () => {
      const mockConn = {
        beginTransaction: sinon.stub().resolves(),
        query: sinon.stub().resolves([{ affectedRows: 1 }]),
        commit: sinon.stub().resolves(),
        rollback: sinon.stub().resolves(),
        release: sinon.stub()
      };
      pool.getConnection = sinon.stub().resolves(mockConn);
      const result = await profileAdo.setProfilePhotoPrimary(90, 101);
      assert.strictEqual(result, true);
      assert.ok(mockConn.beginTransaction.calledOnce);
      assert.ok(mockConn.commit.calledOnce);
      assert.strictEqual(mockConn.query.callCount, 2);
      assert.ok(mockConn.release.calledOnce);
    });

    it('should rollback on error', async () => {
      const mockConn = {
        beginTransaction: sinon.stub().resolves(),
        query: sinon.stub().rejects(new Error('DB error')),
        commit: sinon.stub().resolves(),
        rollback: sinon.stub().resolves(),
        release: sinon.stub()
      };
      pool.getConnection = sinon.stub().resolves(mockConn);
      await assert.rejects(() => profileAdo.setProfilePhotoPrimary(90, 101), { message: 'DB error' });
      assert.ok(mockConn.rollback.calledOnce);
      assert.ok(mockConn.release.calledOnce);
    });
  });
});
