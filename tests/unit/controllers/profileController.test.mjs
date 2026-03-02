import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { fullProfile, lookupValues } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const profileDatalayer = require('../../../datalayer/profileDatalayer');
const profileController = require('../../../controllers/profileController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('profileController', () => {
  describe('getProfiles', () => {
    it('should return profiles list', async () => {
      const data = { profiles: [], total: 0, page: 1, limit: 20 };
      sandbox.stub(profileDatalayer, 'getProfiles').resolves(data);
      const res = mockRes();
      const next = mockNext();
      await profileController.getProfiles(mockReq({ body: { page: '1', limit: '20' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getProfiles').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getProfiles(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getProfileDetail', () => {
    it('should return full profile', async () => {
      sandbox.stub(profileDatalayer, 'getProfileDetail').resolves(fullProfile);
      const res = mockRes();
      const next = mockNext();
      await profileController.getProfileDetail(mockReq({ body: { id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: fullProfile });
    });

    it('should call next with error when not found', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(profileDatalayer, 'getProfileDetail').rejects(new AppError('PA_PFGT_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await profileController.getProfileDetail(mockReq({ body: { id: '999' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_PFGT_100_NOT_FOUND');
    });
  });

  describe('createProfile', () => {
    it('should return 201 on success', async () => {
      const result = { accountId: 201, accountCode: 'EKM001', profileId: 102 };
      sandbox.stub(profileDatalayer, 'createProfile').resolves(result);
      const res = mockRes();
      const next = mockNext();
      await profileController.createProfile(mockReq({ body: { first_name: 'Jane' } }), res, next);
      assert.ok(res.status.calledWith(201));
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: result });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'createProfile').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.createProfile(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('updateProfile', () => {
    it('should return updated profile', async () => {
      sandbox.stub(profileDatalayer, 'updateProfile').resolves(fullProfile);
      const res = mockRes();
      const next = mockNext();
      await profileController.updateProfile(mockReq({ body: { id: '101', first_name: 'Updated' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: fullProfile });
    });

    it('should call next with error when not found', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(profileDatalayer, 'updateProfile').rejects(new AppError('PA_PFUP_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await profileController.updateProfile(mockReq({ body: { id: '999' } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_PFUP_100_NOT_FOUND');
    });
  });

  describe('toggleStatus', () => {
    it('should toggle and return success', async () => {
      sandbox.stub(profileDatalayer, 'toggleProfileStatus').resolves(true);
      const res = mockRes();
      const next = mockNext();
      await profileController.toggleStatus(mockReq({ body: { id: '101', isActive: 0 } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, message: 'Profile status updated' });
    });

    it('should call next with error when profile not found', async () => {
      const AppError = require('../../../utils/AppError');
      sandbox.stub(profileDatalayer, 'toggleProfileStatus').rejects(new AppError('PA_PFTG_100_NOT_FOUND', 'Not found', 404));
      const res = mockRes();
      const next = mockNext();
      await profileController.toggleStatus(mockReq({ body: { id: '999', isActive: 0 } }), res, next);
      assert.ok(next.calledOnce);
      assert.strictEqual(next.firstCall.args[0].errorCode, 'PA_PFTG_100_NOT_FOUND');
    });
  });

  // ══════════════════════════════════════════════════
  // ── Sub-section GET controllers (Phase 4)
  // ══════════════════════════════════════════════════

  describe('getAddress', () => {
    it('should return address data', async () => {
      sandbox.stub(profileDatalayer, 'getAddress').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getAddress(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getAddress').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getAddress(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getContact', () => {
    it('should return contact data', async () => {
      sandbox.stub(profileDatalayer, 'getContact').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getContact(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getContact').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getContact(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getEducation', () => {
    it('should return education data', async () => {
      sandbox.stub(profileDatalayer, 'getEducation').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getEducation(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getEducation').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getEducation(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getEmployment', () => {
    it('should return employment data', async () => {
      sandbox.stub(profileDatalayer, 'getEmployment').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getEmployment(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getEmployment').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getEmployment(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getFamily', () => {
    it('should return family data', async () => {
      sandbox.stub(profileDatalayer, 'getFamily').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getFamily(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getFamily').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getFamily(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getLifestyle', () => {
    it('should return lifestyle data', async () => {
      sandbox.stub(profileDatalayer, 'getLifestyle').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getLifestyle(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getLifestyle').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getLifestyle(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getHobby', () => {
    it('should return hobby data', async () => {
      sandbox.stub(profileDatalayer, 'getHobby').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getHobby(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getHobby').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getHobby(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getProperty', () => {
    it('should return property data', async () => {
      sandbox.stub(profileDatalayer, 'getProperty').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getProperty(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getProperty').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getProperty(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getPhotos', () => {
    it('should return photo data', async () => {
      sandbox.stub(profileDatalayer, 'getPhotos').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getPhotos(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getPhotos').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getPhotos(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('uploadPhoto', () => {
    it('should return 201 on successful upload', async () => {
      sandbox.stub(profileDatalayer, 'uploadPhoto').resolves({ profile_photo_id: 90 });
      const res = mockRes();
      const next = mockNext();
      const req = mockReq({
        body: { profile_id: '101', photo_type: '450', category_name: 'Clear Headshot' },
        file: { buffer: Buffer.from('fake-image'), mimetype: 'image/jpeg' }
      });
      await profileController.uploadPhoto(req, res, next);
      assert.ok(res.status.calledWith(201));
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: { profile_photo_id: 90 } });
    });

    it('should return 400 for missing profile_id', async () => {
      const res = mockRes();
      const next = mockNext();
      const req = mockReq({
        body: { photo_type: '450', category_name: 'Clear Headshot' },
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' }
      });
      await profileController.uploadPhoto(req, res, next);
      assert.ok(res.status.calledWith(400));
      assert.strictEqual(res.json.firstCall.args[0].success, false);
    });

    it('should return 400 for missing photo_type', async () => {
      const res = mockRes();
      const next = mockNext();
      const req = mockReq({
        body: { profile_id: '101', category_name: 'Clear Headshot' },
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' }
      });
      await profileController.uploadPhoto(req, res, next);
      assert.ok(res.status.calledWith(400));
    });

    it('should return 400 for missing category_name', async () => {
      const res = mockRes();
      const next = mockNext();
      const req = mockReq({
        body: { profile_id: '101', photo_type: '450' },
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' }
      });
      await profileController.uploadPhoto(req, res, next);
      assert.ok(res.status.calledWith(400));
    });

    it('should call next on datalayer error', async () => {
      sandbox.stub(profileDatalayer, 'uploadPhoto').rejects(new Error('Azure down'));
      const res = mockRes();
      const next = mockNext();
      const req = mockReq({
        body: { profile_id: '101', photo_type: '450', category_name: 'Clear Headshot' },
        file: { buffer: Buffer.from('fake'), mimetype: 'image/jpeg' }
      });
      await profileController.uploadPhoto(req, res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getSearchPreference', () => {
    it('should return search preference data', async () => {
      sandbox.stub(profileDatalayer, 'getSearchPreference').resolves([{ id: 1 }]);
      const res = mockRes();
      const next = mockNext();
      await profileController.getSearchPreference(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: [{ id: 1 }] });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getSearchPreference').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getSearchPreference(mockReq({ body: { profile_id: '101' } }), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('getLookups', () => {
    it('should return lookups by type', async () => {
      sandbox.stub(profileDatalayer, 'getLookups').resolves(lookupValues);
      const res = mockRes();
      const next = mockNext();
      await profileController.getLookups(mockReq({ body: { type: 'religion' } }), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: lookupValues });
    });

    it('should call next on error', async () => {
      sandbox.stub(profileDatalayer, 'getLookups').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await profileController.getLookups(mockReq({ body: {} }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
