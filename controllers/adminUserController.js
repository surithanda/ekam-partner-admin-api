const adminUserDatalayer = require('../datalayer/adminUserDatalayer');
const { logAuditEvent } = require('../middleware/audit');
const { createAppError } = require('../config/errorCodes');

const adminUserController = {
  async listUsers(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const page = parseInt(req.body.page) || 1;
      const limit = parseInt(req.body.limit) || 20;
      const search = req.body.search || '';

      const result = await adminUserDatalayer.listUsers(partnerId, page, limit, search);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async createUser(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { username, password, email, firstName, lastName, role } = req.body;

      if (!username || !password || !email || !firstName || !lastName || !role) {
        throw createAppError('PA_USCR_001_MISSING_FIELDS');
      }

      const validRoles = ['account-admin', 'support-admin'];
      if (!validRoles.includes(role)) {
        throw createAppError('PA_USCR_200_INVALID_ROLE');
      }

      const result = await adminUserDatalayer.createUser(partnerId, { username, password, email, firstName, lastName, role });

      await logAuditEvent({
        partnerId, userId: req.user.userId, username: req.user.username, role: req.user.role,
        action: 'admin_user.create', entityType: 'admin_user', entityId: result.id,
        endpoint: req.originalUrl,
        requestBody: { username, email, firstName, lastName, role },
        newData: result,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });

      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async updateUser(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { id, email, firstName, lastName, role } = req.body;

      if (!id) {
        throw createAppError('PA_USUP_001_MISSING_ID');
      }

      if (role) {
        const validRoles = ['account-admin', 'support-admin'];
        if (!validRoles.includes(role)) {
          throw createAppError('PA_USUP_200_INVALID_ROLE');
        }
      }

      const previousUser = await adminUserDatalayer.getUserById(id, partnerId);
      if (!previousUser) {
        throw createAppError('PA_USUP_100_NOT_FOUND');
      }

      const updated = await adminUserDatalayer.updateUser(id, partnerId, { email, firstName, lastName, role });
      if (!updated) {
        throw createAppError('PA_USUP_100_NOT_FOUND');
      }

      await logAuditEvent({
        partnerId, userId: req.user.userId, username: req.user.username, role: req.user.role,
        action: 'admin_user.update', entityType: 'admin_user', entityId: id,
        endpoint: req.originalUrl,
        requestBody: { id, email, firstName, lastName, role },
        previousData: previousUser, newData: updated,
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  },

  async toggleUserStatus(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { id, isActive } = req.body;

      if (!id || isActive === undefined) {
        throw createAppError('PA_USTG_100_NOT_FOUND', 'User ID and isActive are required');
      }

      const previousUser = await adminUserDatalayer.getUserById(id, partnerId);
      if (!previousUser) {
        throw createAppError('PA_USTG_100_NOT_FOUND');
      }

      // Prevent deactivating yourself
      if (id === req.user.userId && isActive === 0) {
        throw createAppError('PA_USTG_200_SELF_DEACTIVATE');
      }

      const result = await adminUserDatalayer.toggleUserStatus(id, partnerId, isActive);
      if (!result) {
        throw createAppError('PA_USTG_100_NOT_FOUND');
      }

      await logAuditEvent({
        partnerId, userId: req.user.userId, username: req.user.username, role: req.user.role,
        action: isActive ? 'admin_user.activate' : 'admin_user.deactivate',
        entityType: 'admin_user', entityId: id,
        endpoint: req.originalUrl,
        requestBody: { id, isActive },
        previousData: { is_active: previousUser.is_active },
        newData: { is_active: isActive },
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });

      return res.json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { id, newPassword } = req.body;

      if (!id || !newPassword) {
        throw createAppError('PA_USRS_001_MISSING_FIELDS');
      }

      if (newPassword.length < 6) {
        throw createAppError('PA_USRS_002_WEAK_PASSWORD');
      }

      const targetUser = await adminUserDatalayer.getUserById(id, partnerId);
      if (!targetUser) {
        throw createAppError('PA_USRS_100_NOT_FOUND');
      }

      const result = await adminUserDatalayer.resetPassword(id, partnerId, newPassword);
      if (!result) {
        throw createAppError('PA_USRS_100_NOT_FOUND');
      }

      await logAuditEvent({
        partnerId, userId: req.user.userId, username: req.user.username, role: req.user.role,
        action: 'admin_user.reset_password', entityType: 'admin_user', entityId: id,
        endpoint: req.originalUrl,
        requestBody: { id, targetUsername: targetUser.username },
        previousData: null,
        newData: { passwordReset: true },
        ipAddress: req.ip, userAgent: req.headers['user-agent']
      });

      return res.json({ success: true, message: `Password reset for ${targetUser.username}` });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = adminUserController;
