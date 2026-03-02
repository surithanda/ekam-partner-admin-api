import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { profilePersonal, fullProfile, createProfileInput, lookupValues } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const profileAdo = require('../../../ado/profileAdo');
const profileDatalayer = require('../../../datalayer/profileDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('profileDatalayer', () => {
  describe('getProfiles', () => {
    it('should pass through to ADO', async () => {
      const expected = { profiles: [], total: 0, page: 1, limit: 20 };
      sandbox.stub(profileAdo, 'getProfilesByPartner').resolves(expected);
      const result = await profileDatalayer.getProfiles(1, 1, 20, '', null, null);
      assert.deepStrictEqual(result, expected);
    });
  });

  describe('getProfileDetail', () => {
    it('should return full profile', async () => {
      sandbox.stub(profileAdo, 'getFullProfile').resolves(fullProfile);
      const result = await profileDatalayer.getProfileDetail(101);
      assert.deepStrictEqual(result, fullProfile);
    });

    it('should throw when profile not found', async () => {
      sandbox.stub(profileAdo, 'getFullProfile').resolves(null);
      await assert.rejects(() => profileDatalayer.getProfileDetail(999),
        err => err.errorCode === 'PA_PFGT_100_NOT_FOUND');
    });
  });

  describe('createProfile', () => {
    it('should create account, profile, and login', async () => {
      sandbox.stub(profileAdo, 'generateAccountCode').resolves('EKM001');
      sandbox.stub(profileAdo, 'createAccount').resolves(201);
      sandbox.stub(profileAdo, 'createProfilePersonal').resolves(102);
      sandbox.stub(profileAdo, 'createLogin').resolves(301);

      const result = await profileDatalayer.createProfile(createProfileInput, 1);
      assert.strictEqual(result.accountId, 201);
      assert.strictEqual(result.accountCode, 'EKM001');
      assert.strictEqual(result.profileId, 102);
      assert.ok(profileAdo.createLogin.calledWith(201, 'janesmith', 'Test@123'));
    });

    it('should skip login creation when no username/password', async () => {
      sandbox.stub(profileAdo, 'generateAccountCode').resolves('EKM002');
      sandbox.stub(profileAdo, 'createAccount').resolves(202);
      sandbox.stub(profileAdo, 'createProfilePersonal').resolves(103);
      sandbox.stub(profileAdo, 'createLogin').resolves();

      const noLoginInput = { ...createProfileInput, username: null, password: null };
      await profileDatalayer.createProfile(noLoginInput, 1);
      assert.ok(profileAdo.createLogin.notCalled);
    });
  });

  describe('updateProfile', () => {
    it('should update and return full profile', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(profilePersonal);
      sandbox.stub(profileAdo, 'updateProfilePersonal').resolves(true);
      sandbox.stub(profileAdo, 'getFullProfile').resolves(fullProfile);

      const result = await profileDatalayer.updateProfile(101, { first_name: 'Updated' });
      assert.deepStrictEqual(result, fullProfile);
    });

    it('should throw for missing profile', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(null);
      await assert.rejects(() => profileDatalayer.updateProfile(999, {}),
        err => err.errorCode === 'PA_PFUP_100_NOT_FOUND');
    });
  });

  describe('toggleProfileStatus', () => {
    it('should toggle and return true', async () => {
      sandbox.stub(profileAdo, 'getProfileById').resolves(profilePersonal);
      sandbox.stub(profileAdo, 'toggleProfileStatus').resolves();
      const result = await profileDatalayer.toggleProfileStatus(101, 0);
      assert.strictEqual(result, true);
    });
  });

  describe('getLookups', () => {
    it('should get lookups by type', async () => {
      sandbox.stub(profileAdo, 'getLookupValues').resolves(lookupValues);
      const result = await profileDatalayer.getLookups('religion');
      assert.deepStrictEqual(result, lookupValues);
    });

    it('should get all lookups when no type', async () => {
      sandbox.stub(profileAdo, 'getAllLookups').resolves(lookupValues);
      const result = await profileDatalayer.getLookups(null);
      assert.deepStrictEqual(result, lookupValues);
    });
  });

  // ══════════════════════════════════════════════════
  // ── Sub-section CRUD (Phase 3) — direct delegation (no ownership check)
  // ══════════════════════════════════════════════════

  // ── Sub-section GET methods ──
  describe('getAddress', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileAddress').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getAddress(101), [{ id: 1 }]);
    });
  });

  describe('getContact', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileContact').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getContact(101), [{ id: 1 }]);
    });
  });

  describe('getEducation', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileEducation').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getEducation(101), [{ id: 1 }]);
    });
  });

  describe('getEmployment', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileEmployment').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getEmployment(101), [{ id: 1 }]);
    });
  });

  describe('getFamily', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileFamily').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getFamily(101), [{ id: 1 }]);
    });
  });

  describe('getLifestyle', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileLifestyle').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getLifestyle(101), [{ id: 1 }]);
    });
  });

  describe('getHobby', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileHobbyInterest').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getHobby(101), [{ id: 1 }]);
    });
  });

  describe('getProperty', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileProperty').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getProperty(101), [{ id: 1 }]);
    });
  });

  describe('getPhotos', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfilePhotos').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getPhotos(101), [{ id: 1 }]);
    });
  });

  describe('getSearchPreference', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'getProfileSearchPreference').resolves([{ id: 1 }]);
      assert.deepStrictEqual(await profileDatalayer.getSearchPreference(101), [{ id: 1 }]);
    });
  });

  // ── Sub-section CRUD methods ──
  describe('createAddress', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileAddress').resolves({ insertId: 10 });
      assert.deepStrictEqual(await profileDatalayer.createAddress(101, { address_line1: '123 Main' }), { insertId: 10 });
    });
  });

  describe('updateAddress', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'updateProfileAddress').resolves({ affected: 1 });
      assert.deepStrictEqual(await profileDatalayer.updateAddress(101, { profile_address_id: 10 }), { affected: 1 });
    });
  });

  describe('deleteAddress', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'deleteProfileAddress').resolves(true);
      assert.strictEqual(await profileDatalayer.deleteAddress(101, 10), true);
    });
  });

  describe('createContact', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileContact').resolves({ insertId: 20 });
      assert.deepStrictEqual(await profileDatalayer.createContact(101, { contact_type: 'phone' }), { insertId: 20 });
    });
  });

  describe('createEducation', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileEducation').resolves({ insertId: 30 });
      assert.deepStrictEqual(await profileDatalayer.createEducation(101, { education_level: 3 }), { insertId: 30 });
    });
  });

  describe('deleteEducation', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'deleteProfileEducation').resolves(true);
      assert.strictEqual(await profileDatalayer.deleteEducation(101, 30), true);
    });
  });

  describe('createEmployment', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileEmployment').resolves({ insertId: 40 });
      assert.deepStrictEqual(await profileDatalayer.createEmployment(101, { institution_name: 'Google' }), { insertId: 40 });
    });
  });

  describe('createFamily', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileFamily').resolves({ insertId: 50 });
      assert.deepStrictEqual(await profileDatalayer.createFamily(101, { father_name: 'John' }), { insertId: 50 });
    });
  });

  describe('createLifestyle', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileLifestyle').resolves({ insertId: 60 });
      assert.deepStrictEqual(await profileDatalayer.createLifestyle(101, { eating_habit: 'Veg' }), { insertId: 60 });
    });
  });

  describe('deleteLifestyle', () => {
    it('should delegate to ADO with user', async () => {
      sandbox.stub(profileAdo, 'deleteProfileLifestyle').resolves(true);
      assert.strictEqual(await profileDatalayer.deleteLifestyle(101, 60, 'admin'), true);
    });
  });

  describe('createHobby', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileHobby').resolves({ insertId: 70 });
      assert.deepStrictEqual(await profileDatalayer.createHobby(101, { hobby_interest_id: 5 }), { insertId: 70 });
    });
  });

  describe('updateHobby', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'updateProfileHobby').resolves(true);
      assert.strictEqual(await profileDatalayer.updateHobby(101, 70, { hobby_interest_id: 6 }), true);
    });
  });

  describe('createProperty', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'createProfileProperty').resolves({ insertId: 80 });
      assert.deepStrictEqual(await profileDatalayer.createProperty(101, { property_type: 'House' }), { insertId: 80 });
    });
  });

  describe('uploadPhoto', () => {
    let azureStub, imageStub;

    it('should process and upload image when no existing photo', async () => {
      sandbox.stub(profileAdo, 'getProfilePhotoByType').resolves(null);
      sandbox.stub(profileAdo, 'getPartnerLogoUrl').resolves('https://example.com/logo.png');
      sandbox.stub(profileAdo, 'createProfilePhoto').resolves({ profile_photo_id: 90 });

      // Stub azureStorage and imageProcessor (lazy-required inside datalayer)
      const azureStorage = require('../../../config/azureStorage');
      const imageProcessor = require('../../../config/imageProcessor');
      azureStub = sandbox.stub(azureStorage, 'uploadBuffer').resolves('https://blob.test/1/101/clear_headshot.jpg');
      sandbox.stub(azureStorage, 'buildBlobName').returns('1/101/clear_headshot.jpg');
      imageStub = sandbox.stub(imageProcessor, 'processImage').resolves({
        main: Buffer.from('main'), thumbnail: Buffer.from('thumb')
      });

      const result = await profileDatalayer.uploadPhoto(101, 1, Buffer.from('raw'), 450, 'Clear Headshot', 'partneradmin');

      assert.ok(imageStub.calledOnce);
      assert.strictEqual(azureStub.callCount, 2); // main + thumbnail
      assert.ok(profileAdo.createProfilePhoto.calledOnce);
      assert.strictEqual(result.profile_photo_id, 90);
    });

    it('should delete existing photo before uploading replacement', async () => {
      const existing = {
        profile_photo_id: 89, relative_path: '1/101/clear_headshot.jpg',
        url: 'https://blob.test/old.jpg'
      };
      sandbox.stub(profileAdo, 'getProfilePhotoByType').resolves(existing);
      sandbox.stub(profileAdo, 'deleteProfilePhoto').resolves(true);
      sandbox.stub(profileAdo, 'getPartnerLogoUrl').resolves(null);
      sandbox.stub(profileAdo, 'createProfilePhoto').resolves({ profile_photo_id: 90 });

      const azureStorage = require('../../../config/azureStorage');
      const imageProcessor = require('../../../config/imageProcessor');
      const deleteStub = sandbox.stub(azureStorage, 'deleteBlob').resolves(true);
      sandbox.stub(azureStorage, 'uploadBuffer').resolves('https://blob.test/new.jpg');
      sandbox.stub(azureStorage, 'buildBlobName').returns('1/101/clear_headshot.jpg');
      sandbox.stub(imageProcessor, 'processImage').resolves({
        main: Buffer.from('main'), thumbnail: Buffer.from('thumb')
      });

      await profileDatalayer.uploadPhoto(101, 1, Buffer.from('raw'), 450, 'Clear Headshot', 'admin');

      // Should delete old main + thumbnail blobs
      assert.ok(deleteStub.calledWith('1/101/clear_headshot.jpg'));
      assert.ok(deleteStub.calledWith('1/101/clear_headshot_thumb.jpg'));
      assert.ok(profileAdo.deleteProfilePhoto.calledWith(89, 101, 'admin'));
    });
  });

  describe('deletePhoto', () => {
    it('should delete blob and thumbnail from Azure when relative_path exists', async () => {
      const photo = {
        profile_photo_id: 90, relative_path: '1/101/clear_headshot.jpg',
        url: 'https://blob.test/photo.jpg'
      };
      sandbox.stub(profileAdo, 'getProfilePhotos').resolves([photo]);
      sandbox.stub(profileAdo, 'deleteProfilePhoto').resolves(true);

      const azureStorage = require('../../../config/azureStorage');
      const deleteStub = sandbox.stub(azureStorage, 'deleteBlob').resolves(true);

      const result = await profileDatalayer.deletePhoto(101, 90, 'admin');

      assert.strictEqual(result, true);
      assert.ok(deleteStub.calledWith('1/101/clear_headshot.jpg'));
      assert.ok(deleteStub.calledWith('1/101/clear_headshot_thumb.jpg'));
    });

    it('should still delete DB record when no matching photo found in list', async () => {
      sandbox.stub(profileAdo, 'getProfilePhotos').resolves([]);
      sandbox.stub(profileAdo, 'deleteProfilePhoto').resolves(true);
      const result = await profileDatalayer.deletePhoto(101, 999, 'admin');
      assert.strictEqual(result, true);
    });
  });

  describe('setPhotoPrimary', () => {
    it('should delegate to ADO', async () => {
      sandbox.stub(profileAdo, 'setProfilePhotoPrimary').resolves(true);
      assert.strictEqual(await profileDatalayer.setPhotoPrimary(101, 90), true);
    });
  });
});
