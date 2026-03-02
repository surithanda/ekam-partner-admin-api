import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { brandConfigRow } from '../../fixtures/mockData.mjs';

const require = createRequire(import.meta.url);
const pool = { query: sinon.stub() };
require.cache[require.resolve('../../../config/db')] = { id: require.resolve('../../../config/db'), exports: pool, loaded: true, filename: require.resolve('../../../config/db') };

const brandConfigAdo = require('../../../ado/brandConfigAdo');

afterEach(() => pool.query.reset());

describe('brandConfigAdo', () => {
  describe('getBrandConfig', () => {
    it('should return brand config for partner', async () => {
      pool.query.resolves([[[brandConfigRow]]]);
      const result = await brandConfigAdo.getBrandConfig(1);
      assert.deepStrictEqual(result, brandConfigRow);
    });

    it('should return null for partner with no config', async () => {
      pool.query.resolves([[[]]]);
      const result = await brandConfigAdo.getBrandConfig(999);
      assert.strictEqual(result, null);
    });
  });

  describe('upsertBrandConfig', () => {
    it('should call SP with all config params', async () => {
      pool.query.resolves([[[brandConfigRow]]]);
      const config = {
        templateId: 'classic', brandName: 'Test', brandTagline: 'Tag',
        logoUrl: 'logo.png', logoSmallUrl: 'sm.png', faviconUrl: 'fav.ico',
        primaryColor: '#fff', secondaryColor: '#000', accentColor: '#aaa',
        fontFamily: 'Inter', borderRadius: '0.5rem',
        sidebarStyle: 'standard', loginLayout: 'centered', headerStyle: 'minimal',
        customCss: null
      };
      const result = await brandConfigAdo.upsertBrandConfig(1, config, 1);
      assert.deepStrictEqual(result, brandConfigRow);
      assert.ok(pool.query.calledWith(
        'CALL partner_admin_upsert_brand_config(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [1, 'classic', 'Test', 'Tag', 'logo.png', 'sm.png', 'fav.ico',
         '#fff', '#000', '#aaa', 'Inter', '0.5rem', 'standard', 'centered', 'minimal', null, 1]
      ));
    });

    it('should handle null optional fields', async () => {
      pool.query.resolves([[[brandConfigRow]]]);
      const result = await brandConfigAdo.upsertBrandConfig(1, {}, 1);
      assert.deepStrictEqual(result, brandConfigRow);
    });
  });
});
