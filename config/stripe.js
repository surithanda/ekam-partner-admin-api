const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Per-use credit product/price mapping
const CREDIT_PRODUCTS = {
  bg_check: {
    productId: 'prod_U3pl9MMIeiye7C',
    priceId: 'price_1T5i5mSEZxjLyGkwS3fAA2ac',
    unitCents: 500,
    label: 'Background Check Credit',
  },
  profile_export: {
    productId: 'prod_U3plRtOrKz9UB9',
    priceId: 'price_1T5i5rSEZxjLyGkwZSe0aJGO',
    unitCents: 200,
    label: 'Profile Export Credit',
  },
};

module.exports = { stripe, CREDIT_PRODUCTS };
