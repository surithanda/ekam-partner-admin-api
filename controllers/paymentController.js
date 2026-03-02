const paymentDatalayer = require('../datalayer/paymentDatalayer');
const { stripe } = require('../config/stripe');
const { createAppError } = require('../config/errorCodes');

const paymentController = {

  /**
   * POST /api/payments/plans — list all active subscription plans
   */
  async getPlans(req, res, next) {
    try {
      const plans = await paymentDatalayer.getPlans();
      res.json({ success: true, data: plans });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_001'));
    }
  },

  /**
   * POST /api/payments/billing — billing overview for a specific profile
   */
  async getProfileBilling(req, res, next) {
    try {
      const { profileId } = req.body;
      if (!profileId) return res.status(400).json({ success: false, message: 'profileId is required' });

      const overview = await paymentDatalayer.getProfileBilling(profileId);
      res.json({ success: true, data: overview });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_002'));
    }
  },

  /**
   * POST /api/payments/subscriptions — list all active subscriptions for partner
   */
  async getSubscriptionsByPartner(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const page = parseInt(req.body.page) || 1;
      const pageSize = parseInt(req.body.pageSize) || 20;
      const result = await paymentDatalayer.getSubscriptionsByPartner(partnerId, page, pageSize);
      res.json({ success: true, data: result });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_002B'));
    }
  },

  /**
   * POST /api/payments/checkout/subscription — create checkout for a profile's plan
   */
  async createSubscriptionCheckout(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId, planId } = req.body;
      if (!profileId) return res.status(400).json({ success: false, message: 'profileId is required' });
      if (!planId) return res.status(400).json({ success: false, message: 'planId is required' });

      const plans = await paymentDatalayer.getPlans();
      const session = await paymentDatalayer.createSubscriptionCheckout(partnerId, profileId, planId, plans);
      res.json({ success: true, data: { sessionId: session.id, url: session.url } });
    } catch (err) {
      next(createAppError(err.message, 400, 'PA_PAY_003'));
    }
  },

  /**
   * POST /api/payments/checkout/credits — purchase credits for a profile
   */
  async createCreditCheckout(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId, creditType, quantity } = req.body;
      if (!profileId) return res.status(400).json({ success: false, message: 'profileId is required' });
      if (!creditType) return res.status(400).json({ success: false, message: 'creditType is required' });

      const session = await paymentDatalayer.createCreditCheckout(partnerId, profileId, creditType, quantity || 1);
      res.json({ success: true, data: { sessionId: session.id, url: session.url } });
    } catch (err) {
      next(createAppError(err.message, 400, 'PA_PAY_004'));
    }
  },

  /**
   * POST /api/payments/portal — Stripe Customer Portal session
   */
  async createPortalSession(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const session = await paymentDatalayer.createPortalSession(partnerId);
      res.json({ success: true, data: { url: session.url } });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_005'));
    }
  },

  /**
   * POST /api/payments/assign-free — assign free plan to a profile
   */
  async assignFreePlan(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const { profileId } = req.body;
      if (!profileId) return res.status(400).json({ success: false, message: 'profileId is required' });

      const result = await paymentDatalayer.assignFreePlan(partnerId, profileId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(createAppError(err.message, 400, 'PA_PAY_008'));
    }
  },

  /**
   * POST /api/payments/history — payment history (by profile or partner)
   */
  async getPaymentHistory(req, res, next) {
    try {
      const partnerId = req.user.partnerId;
      const profileId = req.body.profileId || null;
      const page = parseInt(req.body.page) || 1;
      const pageSize = parseInt(req.body.pageSize) || 20;
      const result = await paymentDatalayer.getPaymentHistory(partnerId, profileId, page, pageSize);
      res.json({ success: true, data: result });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_006'));
    }
  },

  /**
   * POST /api/payments/check-access — check if a profile can use a feature
   */
  async checkFeatureAccess(req, res, next) {
    try {
      const { profileId, featureKey } = req.body;
      if (!profileId) return res.status(400).json({ success: false, message: 'profileId is required' });
      if (!featureKey) return res.status(400).json({ success: false, message: 'featureKey is required' });

      const access = await paymentDatalayer.checkFeatureAccess(profileId, featureKey);
      res.json({ success: true, data: access });
    } catch (err) {
      next(createAppError(err.message, 500, 'PA_PAY_007'));
    }
  },

  /**
   * POST /api/payments/webhook — Stripe webhook handler (no auth middleware)
   */
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          await paymentDatalayer.handleCheckoutCompleted(session);
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          await paymentDatalayer.handleSubscriptionEvent(subscription);
          break;
        }
        case 'invoice.paid': {
          const invoice = event.data.object;
          await paymentDatalayer.handleInvoicePaid(invoice);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          console.warn('Invoice payment failed:', invoice.id, 'Customer:', invoice.customer);
          break;
        }
        default:
          // Unhandled event type
          break;
      }
    } catch (err) {
      console.error('Webhook handler error:', err.message);
    }

    res.json({ received: true });
  },
};

module.exports = paymentController;
