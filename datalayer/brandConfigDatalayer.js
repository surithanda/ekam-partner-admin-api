const brandConfigAdo = require('../ado/brandConfigAdo');

const brandConfigDatalayer = {
  async getBrandConfig(partnerId) {
    const config = await brandConfigAdo.getBrandConfig(partnerId);
    if (!config) {
      return null;
    }
    return formatConfig(config);
  },

  async upsertBrandConfig(partnerId, config, updatedBy) {
    const result = await brandConfigAdo.upsertBrandConfig(partnerId, config, updatedBy);
    if (!result) {
      return null;
    }
    return formatConfig(result);
  }
};

function formatConfig(row) {
  return {
    id: row.brand_config_id,
    partnerId: row.partner_id,
    templateId: row.template_id,
    brandName: row.brand_name,
    brandTagline: row.brand_tagline,
    logoUrl: row.logo_url,
    logoSmallUrl: row.logo_small_url,
    faviconUrl: row.favicon_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    fontFamily: row.font_family,
    borderRadius: row.border_radius,
    sidebarStyle: row.sidebar_style,
    loginLayout: row.login_layout,
    headerStyle: row.header_style,
    customCss: row.custom_css,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = brandConfigDatalayer;
