const pool = require('../config/db');

const paymentAdo = {

  async getPaymentPlans() {
    const [rows] = await pool.query('CALL partner_admin_get_payment_plans()');
    return rows[0] || [];
  },

  async getSubscription(profileId) {
    const [rows] = await pool.query('CALL partner_admin_get_subscription(?)', [profileId]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async getSubscriptionsByPartner(partnerId, page, pageSize) {
    const [results] = await pool.query('CALL partner_admin_get_subscriptions_by_partner(?, ?, ?)', [partnerId, page, pageSize]);
    const total = results[0] && results[0][0] ? results[0][0].total : 0;
    const subscriptions = results[1] || [];
    return { total, subscriptions };
  },

  async upsertSubscription(partnerId, profileId, planId, stripeSubId, stripeCustId, status, periodStart, periodEnd, cancelAtPeriodEnd) {
    const [rows] = await pool.query(
      'CALL partner_admin_upsert_subscription(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [partnerId, profileId, planId, stripeSubId, stripeCustId, status, periodStart, periodEnd, cancelAtPeriodEnd ? 1 : 0]
    );
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async getCredits(profileId) {
    const [rows] = await pool.query('CALL partner_admin_get_credits(?)', [profileId]);
    return rows[0] || [];
  },

  async addCredits(partnerId, profileId, creditType, quantity) {
    const [rows] = await pool.query('CALL partner_admin_add_credits(?, ?, ?, ?)', [partnerId, profileId, creditType, quantity]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async deductCredit(profileId, creditType) {
    const [rows] = await pool.query('CALL partner_admin_deduct_credit(?, ?)', [profileId, creditType]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async recordPayment(partnerId, profileId, piId, invoiceId, sessionId, paymentType, amountCents, currency, status, description, metadata) {
    const [rows] = await pool.query(
      'CALL partner_admin_record_payment(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [partnerId, profileId, piId, invoiceId, sessionId, paymentType, amountCents, currency, status, description, metadata ? JSON.stringify(metadata) : null]
    );
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async getPaymentHistory(partnerId, profileId, page, pageSize) {
    const [results] = await pool.query('CALL partner_admin_get_payment_history(?, ?, ?, ?)', [partnerId, profileId, page, pageSize]);
    const total = results[0] && results[0][0] ? results[0][0].total : 0;
    const payments = results[1] || [];
    return { total, payments };
  },

  async trackUsage(partnerId, profileId, featureKey) {
    const [rows] = await pool.query('CALL partner_admin_track_usage(?, ?, ?)', [partnerId, profileId, featureKey]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async getFeatureUsage(profileId, featureKey, periodType) {
    const [rows] = await pool.query('CALL partner_admin_get_feature_usage(?, ?, ?)', [profileId, featureKey, periodType]);
    return rows[0] && rows[0][0] ? rows[0][0].used : 0;
  },

  async getStripeCustomer(partnerId) {
    const [rows] = await pool.query('CALL partner_admin_get_stripe_customer(?)', [partnerId]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },

  async setStripeCustomer(partnerId, stripeCustomerId) {
    const [rows] = await pool.query('CALL partner_admin_set_stripe_customer(?, ?)', [partnerId, stripeCustomerId]);
    return rows[0] && rows[0][0] ? rows[0][0] : null;
  },
};

module.exports = paymentAdo;
