import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { brandConfigRow, brandConfigFormatted } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const brandConfigAdo = require('../../../ado/brandConfigAdo');
const brandConfigDatalayer = require('../../../datalayer/brandConfigDatalayer');
const sandbox = sinon.createSandbox();

afterEach(() => { sandbox.restore(); pool.query.reset(); });

describe('brandConfigDatalayer', () => {
  describe('getBrandConfig', () => {
    it('should return formatted config', async () => {
      sandbox.stub(brandConfigAdo, 'getBrandConfig').resolves(brandConfigRow);
      const result = await brandConfigDatalayer.getBrandConfig(1);
      assert.deepStrictEqual(result, brandConfigFormatted);
    });

    it('should return null when no config exists', async () => {
      sandbox.stub(brandConfigAdo, 'getBrandConfig').resolves(null);
      assert.strictEqual(await brandConfigDatalayer.getBrandConfig(999), null);
    });
  });

  describe('upsertBrandConfig', () => {
    it('should return formatted config after upsert', async () => {
      sandbox.stub(brandConfigAdo, 'upsertBrandConfig').resolves(brandConfigRow);
      const result = await brandConfigDatalayer.upsertBrandConfig(1, { templateId: 'modern' }, 1);
      assert.deepStrictEqual(result, brandConfigFormatted);
    });

    it('should return null on failure', async () => {
      sandbox.stub(brandConfigAdo, 'upsertBrandConfig').resolves(null);
      assert.strictEqual(await brandConfigDatalayer.upsertBrandConfig(1, {}, 1), null);
    });
  });
});
