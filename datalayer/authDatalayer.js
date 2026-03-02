const authAdo = require('../ado/authAdo');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logAuditEvent } = require('../middleware/audit');
const brandConfigDatalayer = require('./brandConfigDatalayer');
const { createAppError } = require('../config/errorCodes');

const authDatalayer = {
  async login(username, password, apiKey) {
    // 1. Validate API key → get partner_id
    const apiClient = await authAdo.getApiClientByKey(apiKey);
    if (!apiClient) {
      throw createAppError('PA_AULG_100_INVALID_API_KEY');
    }
    if (!apiClient.is_active) {
      throw createAppError('PA_AULG_200_API_CLIENT_INACTIVE');
    }
    if (!apiClient.partner_id) {
      throw createAppError('PA_AULG_201_NO_PARTNER_LINKED');
    }

    // 2. Look up user in partner_admin_users (scoped to partner)
    const user = await authAdo.getPartnerUser(username, apiClient.partner_id);
    if (!user) {
      throw createAppError('PA_AULG_202_INVALID_CREDENTIALS');
    }

    // 3. Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw createAppError('PA_AULG_202_INVALID_CREDENTIALS');
    }

    // 4. Update last login + audit log
    await authAdo.updateLastLogin(user.partner_admin_id);
    logAuditEvent({
      partnerId: user.partner_id, userId: user.partner_admin_id,
      username: user.username, role: user.role,
      action: 'auth.login', entityType: 'auth', entityId: user.partner_admin_id,
      endpoint: '/api/auth/login',
      requestBody: { username },
      newData: { partnerId: user.partner_id, role: user.role }
    });

    // 5. Generate JWT with role from DB
    const token = jwt.sign(
      {
        userId: user.partner_admin_id,
        username: user.username,
        role: user.role,
        partnerId: user.partner_id,
        apiClientId: apiClient.id,
        partnerName: apiClient.partner_name,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 6. Fetch brand config for the partner
    const brandConfig = await brandConfigDatalayer.getBrandConfig(user.partner_id);

    return {
      success: true,
      token,
      user: {
        id: user.partner_admin_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        partnerId: user.partner_id,
        partnerName: apiClient.partner_name,
        partnerDomain: apiClient.partner_root_domain
      },
      brandConfig: brandConfig || null
    };
  },

  async getPartnerDomains() {
    return await authAdo.getPartnerDomains();
  }
};

module.exports = authDatalayer;
