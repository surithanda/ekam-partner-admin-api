import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { generateToken } from '../helpers/testApp.mjs';
import { seedErrorCodes } from '../helpers/seedErrorCodes.mjs';
import { fullProfile, lookupValues } from '../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);

const pool = { query: sinon.stub() };
require.cache[require.resolve('../../config/db')] = { id: require.resolve('../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../config/db') };
seedErrorCodes();

const profileDatalayer = require('../../datalayer/profileDatalayer');
const supertest = require('supertest');
const app = require('../../server');
const request = supertest(app);
const sandbox = sinon.createSandbox();

const partnerAdminToken = generateToken({ role: 'partner-admin' });
const accountAdminToken = generateToken({ role: 'account-admin', userId: 2, username: 'accountadmin' });
const supportAdminToken = generateToken({ role: 'support-admin', userId: 3, username: 'supportadmin' });

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('Profiles API Integration', () => {
  describe('POST /api/profiles/list', () => {
    it('should return profiles for partner-admin', async () => {
      const data = { profiles: [], total: 0, page: 1, limit: 20 };
      sandbox.stub(profileDatalayer, 'getProfiles').resolves(data);
      const res = await request.post('/api/profiles/list').set('Authorization', `Bearer ${partnerAdminToken}`).send({ page: 1, limit: 20 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return profiles for account-admin', async () => {
      sandbox.stub(profileDatalayer, 'getProfiles').resolves({ profiles: [], total: 0 });
      const res = await request.post('/api/profiles/list').set('Authorization', `Bearer ${accountAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
    });

    it('should return profiles for support-admin', async () => {
      sandbox.stub(profileDatalayer, 'getProfiles').resolves({ profiles: [], total: 0 });
      const res = await request.post('/api/profiles/list').set('Authorization', `Bearer ${supportAdminToken}`).send({});
      assert.strictEqual(res.status, 200);
    });

    it('should return 401 without token', async () => {
      const res = await request.post('/api/profiles/list').send({});
      assert.strictEqual(res.status, 401);
    });
  });

  describe('POST /api/profiles/detail', () => {
    it('should return full profile', async () => {
      sandbox.stub(profileDatalayer, 'getProfileDetail').resolves(fullProfile);
      const res = await request.post('/api/profiles/detail').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 101 });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.personal);
    });

    it('should return 404 when not found', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(profileDatalayer, 'getProfileDetail').rejects(new AppError('PA_PFGT_100_NOT_FOUND', 'Not found', 404));
      const res = await request.post('/api/profiles/detail').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 999 });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'PA_PFGT_100_NOT_FOUND');
    });
  });

  describe('POST /api/profiles/create', () => {
    it('should create profile for partner-admin', async () => {
      sandbox.stub(profileDatalayer, 'createProfile').resolves({ accountId: 201, accountCode: 'EKM001', profileId: 102 });
      const res = await request.post('/api/profiles/create').set('Authorization', `Bearer ${partnerAdminToken}`).send({ first_name: 'Jane', last_name: 'Smith' });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.data.profileId, 102);
    });

    it('should create profile for support-admin', async () => {
      sandbox.stub(profileDatalayer, 'createProfile').resolves({ accountId: 202, accountCode: 'EKM002', profileId: 103 });
      const res = await request.post('/api/profiles/create').set('Authorization', `Bearer ${supportAdminToken}`).send({ first_name: 'Test' });
      assert.strictEqual(res.status, 201);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/profiles/create').set('Authorization', `Bearer ${accountAdminToken}`).send({ first_name: 'Test' });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('POST /api/profiles/update', () => {
    it('should update profile', async () => {
      sandbox.stub(profileDatalayer, 'updateProfile').resolves(fullProfile);
      const res = await request.post('/api/profiles/update').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 101, first_name: 'Updated' });
      assert.strictEqual(res.status, 200);
    });

    it('should return 404 when not found', async () => {
      const AppError = require('../../utils/AppError');
      sandbox.stub(profileDatalayer, 'updateProfile').rejects(new AppError('PA_PFUP_100_NOT_FOUND', 'Not found', 404));
      const res = await request.post('/api/profiles/update').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 999 });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'PA_PFUP_100_NOT_FOUND');
    });

    it('should return 403 for account-admin', async () => {
      const res = await request.post('/api/profiles/update').set('Authorization', `Bearer ${accountAdminToken}`).send({ id: 101 });
      assert.strictEqual(res.status, 403);
    });
  });

  // ══════════════════════════════════════════════════
  // ── Sub-section GET routes (Phase 4)
  // ══════════════════════════════════════════════════

  const subsectionRoutes = [
    { path: '/api/profiles/address/get',            method: 'getAddress',          label: 'Address' },
    { path: '/api/profiles/contact/get',            method: 'getContact',          label: 'Contact' },
    { path: '/api/profiles/education/get',          method: 'getEducation',        label: 'Education' },
    { path: '/api/profiles/employment/get',         method: 'getEmployment',       label: 'Employment' },
    { path: '/api/profiles/family/get',             method: 'getFamily',           label: 'Family' },
    { path: '/api/profiles/lifestyle/get',          method: 'getLifestyle',        label: 'Lifestyle' },
    { path: '/api/profiles/hobby/get',              method: 'getHobby',            label: 'Hobby' },
    { path: '/api/profiles/property/get',           method: 'getProperty',         label: 'Property' },
    { path: '/api/profiles/photos/get',             method: 'getPhotos',           label: 'Photos' },
    { path: '/api/profiles/search-preference/get',  method: 'getSearchPreference', label: 'Search Preference' },
  ];

  for (const route of subsectionRoutes) {
    describe(`POST ${route.path}`, () => {
      it(`should return ${route.label} data for partner-admin`, async () => {
        sandbox.stub(profileDatalayer, route.method).resolves([{ id: 1 }]);
        const res = await request.post(route.path)
          .set('Authorization', `Bearer ${partnerAdminToken}`)
          .send({ profile_id: 101 });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.deepStrictEqual(res.body.data, [{ id: 1 }]);
      });

      it(`should return ${route.label} data for account-admin`, async () => {
        sandbox.stub(profileDatalayer, route.method).resolves([]);
        const res = await request.post(route.path)
          .set('Authorization', `Bearer ${accountAdminToken}`)
          .send({ profile_id: 101 });
        assert.strictEqual(res.status, 200);
      });

      it(`should return ${route.label} data for support-admin`, async () => {
        sandbox.stub(profileDatalayer, route.method).resolves([]);
        const res = await request.post(route.path)
          .set('Authorization', `Bearer ${supportAdminToken}`)
          .send({ profile_id: 101 });
        assert.strictEqual(res.status, 200);
      });

      it('should return 401 without token', async () => {
        const res = await request.post(route.path).send({ profile_id: 101 });
        assert.strictEqual(res.status, 401);
      });

      it('should return error when access denied', async () => {
        const AppError = require('../../utils/AppError');
        sandbox.stub(profileDatalayer, route.method).rejects(new AppError('PA_PFGT_300_ACCESS_DENIED', 'Access denied', 403));
        const res = await request.post(route.path)
          .set('Authorization', `Bearer ${partnerAdminToken}`)
          .send({ profile_id: 101 });
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.body.error.code, 'PA_PFGT_300_ACCESS_DENIED');
      });
    });
  }

  // ══════════════════════════════════════════════════
  // ── Photo Upload & CRUD (Phase 5)
  // ══════════════════════════════════════════════════

  describe('POST /api/profiles/photos/upload', () => {
    it('should return 201 on successful upload for partner-admin', async () => {
      sandbox.stub(profileDatalayer, 'uploadPhoto').resolves({ profile_photo_id: 90 });
      const res = await request
        .post('/api/profiles/photos/upload')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .field('profile_id', '101')
        .field('photo_type', '450')
        .field('category_name', 'Clear Headshot')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg');
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.profile_photo_id, 90);
    });

    it('should return 201 for support-admin', async () => {
      sandbox.stub(profileDatalayer, 'uploadPhoto').resolves({ profile_photo_id: 91 });
      const res = await request
        .post('/api/profiles/photos/upload')
        .set('Authorization', `Bearer ${supportAdminToken}`)
        .field('profile_id', '101')
        .field('photo_type', '451')
        .field('category_name', 'Full-body Shot')
        .attach('photo', Buffer.from('fake-image-data'), 'test.jpg');
      assert.strictEqual(res.status, 201);
    });

    it('should return 403 for account-admin (read-only)', async () => {
      const res = await request
        .post('/api/profiles/photos/upload')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .field('profile_id', '101')
        .field('photo_type', '450')
        .field('category_name', 'Clear Headshot')
        .attach('photo', Buffer.from('fake'), 'test.jpg');
      assert.strictEqual(res.status, 403);
    });

    it('should return 401 without token', async () => {
      const res = await request
        .post('/api/profiles/photos/upload')
        .field('profile_id', '101')
        .field('photo_type', '450')
        .field('category_name', 'Clear Headshot')
        .attach('photo', Buffer.from('fake'), 'test.jpg');
      assert.strictEqual(res.status, 401);
    });

    it('should return 400 when no photo file attached', async () => {
      const res = await request
        .post('/api/profiles/photos/upload')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .field('profile_id', '101')
        .field('photo_type', '450')
        .field('category_name', 'Clear Headshot');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('should return 400 for missing required fields', async () => {
      sandbox.stub(profileDatalayer, 'uploadPhoto').resolves({ profile_photo_id: 90 });
      const res = await request
        .post('/api/profiles/photos/upload')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .field('profile_id', '101')
        .attach('photo', Buffer.from('fake'), 'test.jpg');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('POST /api/profiles/photos/delete', () => {
    it('should delete photo for partner-admin', async () => {
      sandbox.stub(profileDatalayer, 'deletePhoto').resolves(true);
      const res = await request
        .post('/api/profiles/photos/delete')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ profile_id: 101, photo_id: 90 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request
        .post('/api/profiles/photos/delete')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({ profile_id: 101, photo_id: 90 });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('POST /api/profiles/photos/set-primary', () => {
    it('should set photo primary for partner-admin', async () => {
      sandbox.stub(profileDatalayer, 'setPhotoPrimary').resolves(true);
      const res = await request
        .post('/api/profiles/photos/set-primary')
        .set('Authorization', `Bearer ${partnerAdminToken}`)
        .send({ profile_id: 101, photo_id: 90 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('should return 403 for account-admin', async () => {
      const res = await request
        .post('/api/profiles/photos/set-primary')
        .set('Authorization', `Bearer ${accountAdminToken}`)
        .send({ profile_id: 101, photo_id: 90 });
      assert.strictEqual(res.status, 403);
    });
  });

  describe('POST /api/profiles/toggle-status', () => {
    it('should toggle status', async () => {
      sandbox.stub(profileDatalayer, 'toggleProfileStatus').resolves(true);
      const res = await request.post('/api/profiles/toggle-status').set('Authorization', `Bearer ${partnerAdminToken}`).send({ id: 101, isActive: 0 });
      assert.strictEqual(res.status, 200);
    });
  });

  describe('POST /api/profiles/lookups', () => {
    it('should return lookups', async () => {
      sandbox.stub(profileDatalayer, 'getLookups').resolves(lookupValues);
      const res = await request.post('/api/profiles/lookups').set('Authorization', `Bearer ${partnerAdminToken}`).send({ type: 'religion' });
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(res.body.data, lookupValues);
    });
  });
});
