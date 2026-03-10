/**
 * Address verification provider configuration.
 * Reads API keys and preferences from environment variables.
 */
const config = {
  providers: {
    geoapify: {
      apiKey: process.env.ADDRESS_GEOAPIFY_API_KEY || '',
      baseUrl: 'https://api.geoapify.com/v1/geocode',
      enabled: !!process.env.ADDRESS_GEOAPIFY_API_KEY
    },
    usps: {
      userId: process.env.ADDRESS_USPS_USER_ID || '',
      baseUrl: 'https://secure.shippingapis.com/ShippingAPI.dll',
      enabled: !!process.env.ADDRESS_USPS_USER_ID
    },
    mailcolt: {
      apiKey: process.env.ADDRESS_MAILCOLT_API_KEY || '',
      baseUrl: 'https://api.mailcolt.com/v1',
      enabled: !!process.env.ADDRESS_MAILCOLT_API_KEY
    }
  },

  // Ordered list — first enabled provider wins
  priority: (process.env.ADDRESS_PROVIDER_PRIORITY || 'geoapify,usps,mailcolt')
    .split(',')
    .map(p => p.trim().toLowerCase()),

  cacheTtl: parseInt(process.env.ADDRESS_CACHE_TTL, 10) || 86400,          // 24 h
  providerTimeout: parseInt(process.env.ADDRESS_PROVIDER_TIMEOUT, 10) || 5000  // 5 s
};

module.exports = config;
