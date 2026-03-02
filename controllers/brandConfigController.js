const brandConfigDatalayer = require('../datalayer/brandConfigDatalayer');
const { logAuditEvent } = require('../middleware/audit');

const brandConfigController = {
  async getBrandConfig(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const config = await brandConfigDatalayer.getBrandConfig(partnerId);

      if (!config) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  },

  async updateBrandConfig(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const updatedBy = req.user.userId;

      // Get previous config for audit
      const previousConfig = await brandConfigDatalayer.getBrandConfig(partnerId);

      const config = await brandConfigDatalayer.upsertBrandConfig(partnerId, req.body, updatedBy);

      if (!config) {
        return res.status(500).json({ success: false, message: 'Failed to update brand config' });
      }

      // Audit log
      logAuditEvent({
        partnerId, userId: updatedBy,
        username: req.user.username, role: req.user.role,
        action: 'brand_config.update', entityType: 'brand_config', entityId: config.id,
        endpoint: '/api/partner/brand-config/update',
        requestBody: req.body,
        previousData: previousConfig,
        newData: config
      });

      res.json({ success: true, message: 'Brand config updated', data: config });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = brandConfigController;
