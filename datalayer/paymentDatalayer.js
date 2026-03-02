const paymentAdo = require('../ado/paymentAdo');
const { stripe, CREDIT_PRODUCTS } = require('../config/stripe');

const paymentDatalayer = {

  async getPlans() {
    return paymentAdo.getPaymentPlans();
  },

  async getSubscription(profileId) {
    return paymentAdo.getSubscription(profileId);
  },

  async getSubscriptionsByPartner(partnerId, page, pageSize) {
    return paymentAdo.getSubscriptionsByPartner(partnerId, page, pageSize);
  },

  async getCredits(profileId) {
    return paymentAdo.getCredits(profileId);
  },

  async getPaymentHistory(partnerId, profileId, page, pageSize) {
    return paymentAdo.getPaymentHistory(partnerId, profileId, page, pageSize);
  },

  /**
   * Ensure partner has a Stripe customer record. Create one if missing.
   */
  async ensureStripeCustomer(partnerId) {
    const partner = await paymentAdo.getStripeCustomer(partnerId);
    if (!partner) throw new Error('Partner not found');

    if (partner.stripe_customer_id) {
      return partner.stripe_customer_id;
    }

    const customer = await stripe.customers.create({
      name: partner.business_name,
      email: partner.business_email || undefined,
      metadata: { partner_id: String(partnerId) },
    });

    await paymentAdo.setStripeCustomer(partnerId, customer.id);
    return customer.id;
  },

  /**
   * Create a Stripe Checkout session for a profile subscription plan.
   */
  async createSubscriptionCheckout(partnerId, profileId, planId, plans) {
    const plan = plans.find(p => p.plan_id === planId);
    if (!plan) throw new Error('Invalid plan');
    if (plan.plan_key === 'free') throw new Error('Cannot checkout for free plan');

    const customerId = await this.ensureStripeCustomer(partnerId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      metadata: { partner_id: String(partnerId), profile_id: String(profileId), plan_id: String(planId), type: 'subscription' },
      subscription_data: {
        metadata: { partner_id: String(partnerId), profile_id: String(profileId), plan_id: String(planId) },
      },
    });

    return session;
  },

  /**
   * Create a Stripe Checkout session for purchasing per-use credits for a profile.
   */
  async createCreditCheckout(partnerId, profileId, creditType, quantity) {
    const creditConfig = CREDIT_PRODUCTS[creditType];
    if (!creditConfig) throw new Error('Invalid credit type');
    if (!quantity || quantity < 1) throw new Error('Quantity must be at least 1');

    const customerId = await this.ensureStripeCustomer(partnerId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: creditConfig.priceId, quantity }],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
      metadata: {
        partner_id: String(partnerId),
        profile_id: String(profileId),
        type: 'credit_purchase',
        credit_type: creditType,
        quantity: String(quantity),
      },
    });

    return session;
  },

  /**
   * Create a Stripe Customer Portal session for managing subscriptions.
   */
  async createPortalSession(partnerId) {
    const customerId = await this.ensureStripeCustomer(partnerId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_CANCEL_URL,
    });

    return session;
  },

  /**
   * Assign the free plan to a profile (no Stripe checkout needed).
   */
  async assignFreePlan(partnerId, profileId) {
    const plans = await paymentAdo.getPaymentPlans();
    const freePlan = plans.find(p => p.plan_key === 'free');
    if (!freePlan) throw new Error('Free plan not found');

    await paymentAdo.upsertSubscription(
      partnerId, profileId, freePlan.plan_id, null, null,
      'active', new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), false
    );
    return { success: true, plan: freePlan };
  },

  /**
   * Handle successful checkout — called from webhook.
   */
  async handleCheckoutCompleted(session) {
    const partnerId = parseInt(session.metadata?.partner_id);
    const profileId = parseInt(session.metadata?.profile_id);
    if (!partnerId) return;

    if (session.metadata?.type === 'credit_purchase') {
      const creditType = session.metadata.credit_type;
      const quantity = parseInt(session.metadata.quantity) || 1;

      await paymentAdo.addCredits(partnerId, profileId || 0, creditType, quantity);
      await paymentAdo.recordPayment(
        partnerId, profileId || null, session.payment_intent, null, session.id,
        'credit_purchase', session.amount_total, session.currency,
        'succeeded', `Purchased ${quantity}x ${creditType} credits`,
        { credit_type: creditType, quantity }
      );
    }
  },

  /**
   * Handle subscription update from webhook.
   */
  async handleSubscriptionEvent(subscription) {
    const partnerId = parseInt(subscription.metadata?.partner_id);
    const profileId = parseInt(subscription.metadata?.profile_id);
    const planId = parseInt(subscription.metadata?.plan_id);
    if (!partnerId || !planId) return;

    await paymentAdo.upsertSubscription(
      partnerId,
      profileId || 0,
      planId,
      subscription.id,
      subscription.customer,
      subscription.status,
      subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
      subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      subscription.cancel_at_period_end || false
    );
  },

  /**
   * Handle invoice.paid — record payment in history.
   */
  async handleInvoicePaid(invoice) {
    const subId = invoice.subscription;
    if (!subId) return;

    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const partnerId = parseInt(sub.metadata?.partner_id);
      const profileId = parseInt(sub.metadata?.profile_id);
      if (!partnerId) return;

      await paymentAdo.recordPayment(
        partnerId, profileId || null, invoice.payment_intent, invoice.id, null,
        'subscription', invoice.amount_paid, invoice.currency,
        'succeeded', `Subscription payment - ${invoice.lines?.data?.[0]?.description || 'Plan'}`,
        { subscription_id: subId }
      );
    } catch (err) {
      console.error('Error handling invoice.paid:', err.message);
    }
  },

  /**
   * Check feature access for a profile based on their plan + credits.
   */
  async checkFeatureAccess(profileId, featureKey) {
    const sub = await paymentAdo.getSubscription(profileId);
    if (!sub) {
      return { allowed: false, reason: 'no_subscription', message: 'No active subscription. Please subscribe to a plan.' };
    }

    let limit = 0;
    let periodType = 'monthly';

    switch (featureKey) {
      case 'profile_view':
        limit = sub.max_views_per_day;
        periodType = 'daily';
        break;
      case 'bg_check':
        limit = sub.max_bg_checks_per_month;
        break;
      case 'profile_export':
        limit = sub.max_exports_per_month;
        break;
      case 'profile_list':
        limit = sub.max_profiles;
        break;
      default:
        return { allowed: true };
    }

    if (limit === -1) return { allowed: true };

    const used = await paymentAdo.getFeatureUsage(profileId, featureKey, periodType);

    if (used < limit) {
      return { allowed: true, used, limit, remaining: limit - used };
    }

    if (featureKey === 'bg_check' || featureKey === 'profile_export') {
      const credits = await paymentAdo.getCredits(profileId);
      const creditType = featureKey === 'bg_check' ? 'bg_check' : 'profile_export';
      const creditRow = credits.find(c => c.credit_type === creditType);
      const creditBalance = creditRow ? creditRow.balance : 0;

      if (creditBalance > 0) {
        return { allowed: true, used, limit, remaining: 0, usingCredit: true, creditBalance };
      }

      return {
        allowed: false, reason: 'limit_reached',
        message: `Used all ${limit} ${featureKey.replace('_', ' ')}s this ${periodType === 'daily' ? 'day' : 'month'}. Purchase credits or upgrade.`,
        used, limit, creditBalance: 0,
      };
    }

    return {
      allowed: false, reason: 'limit_reached',
      message: `Reached ${periodType} limit of ${limit} for ${featureKey.replace('_', ' ')}. Upgrade plan for more.`,
      used, limit,
    };
  },

  /**
   * Consume a feature usage unit for a profile.
   */
  async consumeFeature(partnerId, profileId, featureKey) {
    const access = await this.checkFeatureAccess(profileId, featureKey);
    if (!access.allowed) return access;

    await paymentAdo.trackUsage(partnerId, profileId, featureKey);

    if (access.usingCredit) {
      const creditType = featureKey === 'bg_check' ? 'bg_check' : 'profile_export';
      await paymentAdo.deductCredit(profileId, creditType);
    }

    return { allowed: true, consumed: true };
  },

  /**
   * Get billing overview for a specific profile.
   */
  async getProfileBilling(profileId) {
    const [sub, credits, plans] = await Promise.all([
      paymentAdo.getSubscription(profileId),
      paymentAdo.getCredits(profileId),
      paymentAdo.getPaymentPlans(),
    ]);

    const usagePromises = ['profile_view', 'bg_check', 'profile_export', 'profile_list'].map(async (key) => {
      const periodType = key === 'profile_view' ? 'daily' : 'monthly';
      const used = await paymentAdo.getFeatureUsage(profileId, key, periodType);
      return { feature: key, used, period: periodType };
    });
    const usage = await Promise.all(usagePromises);

    return { subscription: sub, credits, plans, usage };
  },
};

module.exports = paymentDatalayer;
