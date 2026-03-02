const adminUserAdo = require('../ado/adminUserAdo');
const bcrypt = require('bcryptjs');

const adminUserDatalayer = {
  async listUsers(partnerId, page, limit, search) {
    return await adminUserAdo.listUsers(partnerId, page, limit, search);
  },

  async createUser(partnerId, { username, password, email, firstName, lastName, role }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const insertId = await adminUserAdo.createUser(partnerId, username, passwordHash, email, firstName, lastName, role);
    return { id: insertId, username, email, firstName, lastName, role };
  },

  async updateUser(partnerAdminId, partnerId, data) {
    const updated = await adminUserAdo.updateUser(
      partnerAdminId, partnerId,
      data.email || null, data.firstName || null, data.lastName || null, data.role || null
    );
    if (!updated) return null;
    return await adminUserAdo.getUserById(partnerAdminId, partnerId);
  },

  async toggleUserStatus(partnerAdminId, partnerId, isActive) {
    return await adminUserAdo.toggleUserStatus(partnerAdminId, partnerId, isActive);
  },

  async getUserById(partnerAdminId, partnerId) {
    return await adminUserAdo.getUserById(partnerAdminId, partnerId);
  },

  async resetPassword(partnerAdminId, partnerId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return await adminUserAdo.resetPassword(partnerAdminId, partnerId, passwordHash);
  }
};

module.exports = adminUserDatalayer;
