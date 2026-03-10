/**
 * Unified address verification service.
 * Routes requests to the highest-priority enabled provider,
 * falls back to the next provider on failure.
 */
const addressProviders = require('../../config/addressProviders');
const addressCache = require('./addressCache');
const { createAppError } = require('../../config/errorCodes');

// Provider registry — lazy-loaded so only enabled providers are required
const providerModules = {
  geoapify: () => require('./providers/geoapifyProvider')
  // usps:     () => require('./providers/uspsProvider'),
  // mailcolt: () => require('./providers/mailcoltProvider'),
};

/**
 * Return the ordered list of enabled provider instances.
 * @returns {Array<{name: string, provider: object}>}
 */
function getEnabledProviders() {
  const enabled = [];
  for (const name of addressProviders.priority) {
    const cfg = addressProviders.providers[name];
    const loader = providerModules[name];
    if (cfg && cfg.enabled && loader) {
      enabled.push({ name, provider: loader() });
    }
  }
  return enabled;
}

/**
 * Lookup city & state by ZIP code.
 * Checks cache first, then iterates enabled providers with fallback.
 * @param {string} zip
 * @param {string} [country='us']
 * @returns {Promise<Array<{city: string, state: string, country: string}>>}
 */
async function lookupByZip(zip, country = 'us') {
  const cacheKey = addressCache.key('zip', { zip, country });
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE');
  }

  let lastError = null;
  for (const { name, provider } of providers) {
    try {
      const results = await provider.lookupByZip(zip, country);
      if (results && results.length > 0) {
        addressCache.set(cacheKey, results);
      }
      return results;
    } catch (err) {
      lastError = err;
      console.error(`Address provider "${name}" failed for lookupByZip:`, err.message);
    }
  }

  // All providers failed
  throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE', lastError?.message);
}

/**
 * Lookup state(s) by city name.
 * Checks cache first, then iterates enabled providers with fallback.
 * @param {string} city
 * @param {string} [country='us']
 * @returns {Promise<Array<{state: string, country: string}>>}
 */
async function lookupByCity(city, country = 'us') {
  const cacheKey = addressCache.key('city', { city, country });
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE');
  }

  let lastError = null;
  for (const { name, provider } of providers) {
    try {
      const results = await provider.lookupByCity(city, country);
      if (results && results.length > 0) {
        addressCache.set(cacheKey, results);
      }
      return results;
    } catch (err) {
      lastError = err;
      console.error(`Address provider "${name}" failed for lookupByCity:`, err.message);
    }
  }

  throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE', lastError?.message);
}

/**
 * Verify and standardize a full address.
 * Checks cache first, then iterates enabled providers with fallback.
 * @param {object} address - { address_line1, address_line2, city, state, zip, country }
 * @returns {Promise<object>} - { verified, confidence, standardized_address, corrections, provider }
 */
async function verifyAddress(address) {
  const cacheKey = addressCache.key('verify', {
    address_line1: address.address_line1,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country
  });
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE');
  }

  let lastError = null;
  for (const { name, provider } of providers) {
    try {
      const result = await provider.verifyAddress(address);
      if (result && result.standardized_address) {
        addressCache.set(cacheKey, result);
      }
      return result;
    } catch (err) {
      lastError = err;
      console.error(`Address provider "${name}" failed for verifyAddress:`, err.message);
    }
  }

  throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE', lastError?.message);
}

/**
 * Autocomplete partial address input.
 * Checks cache first, then iterates enabled providers with fallback.
 * @param {string} query - Partial address text (minimum 3 characters)
 * @param {string} [country='us']
 * @returns {Promise<Array<{address_line1: string, address_line2: string, city: string, state: string, zip: string, country: string}>>}
 */
async function autocomplete(query, country = 'us') {
  const cacheKey = addressCache.key('ac', { query, country });
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE');
  }

  let lastError = null;
  for (const { name, provider } of providers) {
    try {
      const results = await provider.autocomplete(query, country);
      if (results && results.length > 0) {
        addressCache.set(cacheKey, results);
      }
      return results;
    } catch (err) {
      lastError = err;
      console.error(`Address provider "${name}" failed for autocomplete:`, err.message);
    }
  }

  throw createAppError('PA_AVVR_002_PROVIDER_UNAVAILABLE', lastError?.message);
}

module.exports = { lookupByZip, lookupByCity, verifyAddress, autocomplete, getEnabledProviders };
