import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { mockReq, mockRes, mockNext } from '../../helpers/mockReqRes.mjs';
import { brandConfigFormatted, updateBrandConfigInput } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

// Stub audit middleware
require.cache[require.resolve('../../../middleware/audit')] = {
  id: require.resolve('../../../middleware/audit'),
  exports: { auditLog: () => (req, res, next) => next(), logAuditEvent: sinon.stub() },
  loaded: true,
  filename: require.resolve('../../../middleware/audit')
};

const brandConfigDatalayer = require('../../../datalayer/brandConfigDatalayer');
const brandConfigController = require('../../../controllers/brandConfigController');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('brandConfigController', () => {
  describe('getBrandConfig', () => {
    it('should return brand config', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(brandConfigFormatted);
      const res = mockRes();
      const next = mockNext();
      await brandConfigController.getBrandConfig(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: brandConfigFormatted });
    });

    it('should return 200 with null data when no config exists', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(null);
      const res = mockRes();
      const next = mockNext();
      await brandConfigController.getBrandConfig(mockReq(), res, next);
      assert.deepStrictEqual(res.json.firstCall.args[0], { success: true, data: null });
    });

    it('should call next on error', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await brandConfigController.getBrandConfig(mockReq(), res, next);
      assert.ok(next.calledOnce);
    });
  });

  describe('updateBrandConfig', () => {
    it('should update and return brand config', async () => {
      sandbox.stub(brandConfigDatalayer, 'getBrandConfig').resolves(brandConfigFormatted);
      sandbox.stub(brandConfigDatalayer, 'upsertBrandConfig').resolves({ ...brandConfigFormatted, templateId: 'classic' });
      const res = mockRes();
      const next = mockNext();
      await brandConfigController.updateBrandConfig(mockReq({ body: updateBrandConfigInput }), res, next);
      assert.strictEqual(res.json.firstCall.args[0].success, true);
    });

    it('should call next on error', async () => {
      sandbox.stub(brandConfigDatalayer, 'upsertBrandConfig').rejects(new Error('fail'));
      const res = mockRes();
      const next = mockNext();
      await brandConfigController.updateBrandConfig(mockReq({ body: updateBrandConfigInput }), res, next);
      assert.ok(next.calledOnce);
    });
  });
});
