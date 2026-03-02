const pool = require('../config/db');
const { checkSpResult } = require('../utils/spResultHelper');

const brandConfigAdo = {
  async getBrandConfig(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_brand_config(?)', [partnerId]);
    checkSpResult(rows, 'partner_admin_get_brand_config');
    return rows[0]?.[0] || null;
  },

  async upsertBrandConfig(partnerId, config, updatedBy) {
    const [rows] = await pool.query(
      'CALL partner_admin_upsert_brand_config(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        partnerId,
        config.templateId || null,
        config.brandName || null,
        config.brandTagline || null,
        config.logoUrl || null,
        config.logoSmallUrl || null,
        config.faviconUrl || null,
        config.primaryColor || null,
        config.secondaryColor || null,
        config.accentColor || null,
        config.fontFamily || null,
        config.borderRadius || null,
        config.sidebarStyle || null,
        config.loginLayout || null,
        config.headerStyle || null,
        config.customCss || null,
        updatedBy
      ]
    );
    checkSpResult(rows, 'partner_admin_upsert_brand_config');
    return rows[0]?.[0] || null;
  }
};

module.exports = brandConfigAdo;
