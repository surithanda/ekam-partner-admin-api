const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public: webhook (no auth, raw body handled in server.js before json parser)
router.post('/webhook', paymentController.handleWebhook);

// All other routes require auth
router.use(authenticateToken);
router.use(authorizeRoles('partner-admin', 'account-admin', 'support-admin'));

// Plans & billing
router.post('/plans', paymentController.getPlans);
router.post('/billing', paymentController.getProfileBilling);
router.post('/subscriptions', paymentController.getSubscriptionsByPartner);
router.post('/history', paymentController.getPaymentHistory);

// Checkout (profile-based)
router.post('/checkout/subscription', paymentController.createSubscriptionCheckout);
router.post('/checkout/credits', paymentController.createCreditCheckout);
router.post('/assign-free', paymentController.assignFreePlan);

// Stripe Customer Portal
router.post('/portal', paymentController.createPortalSession);

// Feature access check (profile-based)
router.post('/check-access', paymentController.checkFeatureAccess);

module.exports = router;
