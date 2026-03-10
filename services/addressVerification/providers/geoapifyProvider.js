/**
 * Geoapify address verification provider.
 * Uses the Geocoding API (free tier: 3 000 req/day).
 * Docs: https://apidocs.geoapify.com/docs/geocoding
 */
const addressProviders = require('../../../config/addressProviders');

const cfg = addressProviders.providers.geoapify;
const timeout = addressProviders.providerTimeout;

/**
 * Lookup city & state by ZIP / postal code.
 * @param {string} zip
 * @param {string} [country='us'] - ISO 3166-1 alpha-2 country code
 * @returns {Promise<Array<{city: string, state: string, country: string}>>}
 */
async function lookupByZip(zip, country = 'us') {
  const countryCode = (country || 'us').toLowerCase();
  const url = `${cfg.baseUrl}/search?text=${encodeURIComponent(zip)}&type=postcode`
    + `&filter=countrycode:${countryCode}`
    + `&format=json`
    + `&apiKey=${cfg.apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const results = body.results || [];

  // Normalize to standard shape, deduplicate by city+state
  const seen = new Set();
  const normalized = [];
  for (const r of results) {
    const city = r.city || r.county || '';
    const state = r.state || '';
    const ctry = (r.country_code || countryCode).toUpperCase();
    if (!city) continue;
    const key = `${city.toLowerCase()}|${state.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ city, state, country: ctry });
  }

  return normalized;
}

/**
 * Lookup state(s) by city name.
 * @param {string} city
 * @param {string} [country='us']
 * @returns {Promise<Array<{state: string, country: string}>>}
 */
async function lookupByCity(city, country = 'us') {
  const countryCode = (country || 'us').toLowerCase();
  const url = `${cfg.baseUrl}/search?text=${encodeURIComponent(city)}&type=city`
    + `&filter=countrycode:${countryCode}`
    + `&format=json`
    + `&apiKey=${cfg.apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const results = body.results || [];

  const seen = new Set();
  const normalized = [];
  for (const r of results) {
    const state = r.state || '';
    const ctry = (r.country_code || countryCode).toUpperCase();
    if (!state) continue;
    const key = state.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ state, country: ctry });
  }

  return normalized;
}

/**
 * Verify and standardize a full address.
 * @param {object} address - { address_line1, address_line2, city, state, zip, country }
 * @returns {Promise<{verified: boolean, confidence: string, standardized_address: object, corrections: Array, provider: string}>}
 */
async function verifyAddress(address) {
  const countryCode = (address.country || 'us').toLowerCase();

  // Build a full address string for geocoding
  const parts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean);
  const fullText = parts.join(', ');

  const url = `${cfg.baseUrl}/search?text=${encodeURIComponent(fullText)}`
    + `&filter=countrycode:${countryCode}`
    + `&format=json`
    + `&apiKey=${cfg.apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const results = body.results || [];

  if (results.length === 0) {
    return {
      verified: false,
      confidence: 'none',
      standardized_address: null,
      corrections: [],
      provider: 'geoapify'
    };
  }

  const top = results[0];

  // Build standardized address from Geoapify structured fields
  const standardized = {
    address_line1: top.address_line1 || top.street || '',
    address_line2: top.address_line2 || '',
    city: top.city || top.county || '',
    state: top.state || '',
    zip: top.postcode || '',
    country: (top.country_code || countryCode).toUpperCase()
  };

  // If Geoapify returned a house number + street, build a proper address_line1
  if (top.housenumber && top.street) {
    standardized.address_line1 = `${top.housenumber} ${top.street}`;
  } else if (top.street && !top.housenumber) {
    standardized.address_line1 = top.street;
  }

  // Determine confidence from Geoapify's rank
  const rank = top.rank || {};
  const confidenceScore = rank.confidence || 0;
  let confidence = 'low';
  if (confidenceScore >= 0.8) confidence = 'high';
  else if (confidenceScore >= 0.5) confidence = 'medium';

  // Detect corrections by comparing input vs standardized
  const corrections = [];
  const fields = ['address_line1', 'city', 'state', 'zip'];
  for (const field of fields) {
    const original = (address[field] || '').trim();
    const corrected = (standardized[field] || '').trim();
    if (original && corrected && original.toLowerCase() !== corrected.toLowerCase()) {
      corrections.push({ field, original, corrected });
    }
  }

  return {
    verified: confidenceScore >= 0.5,
    confidence,
    standardized_address: standardized,
    corrections,
    provider: 'geoapify'
  };
}

/**
 * Autocomplete partial address input.
 * @param {string} query - Partial address text (minimum 3 characters)
 * @param {string} [country='us']
 * @returns {Promise<Array<{address_line1: string, address_line2: string, city: string, state: string, zip: string, country: string}>>}
 */
async function autocomplete(query, country = 'us') {
  const countryCode = (country || 'us').toLowerCase();
  const url = `${cfg.baseUrl.replace('/geocode', '/geocode')}/autocomplete`
    + `?text=${encodeURIComponent(query)}`
    + `&filter=countrycode:${countryCode}`
    + `&format=json`
    + `&apiKey=${cfg.apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    signal: AbortSignal.timeout(timeout)
  });

  if (!response.ok) {
    throw new Error(`Geoapify API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const results = body.results || [];

  // Normalize to standard address shape, deduplicate
  const seen = new Set();
  const normalized = [];
  for (const r of results) {
    let addressLine1 = '';
    if (r.housenumber && r.street) {
      addressLine1 = `${r.housenumber} ${r.street}`;
    } else if (r.street) {
      addressLine1 = r.street;
    } else if (r.address_line1) {
      addressLine1 = r.address_line1;
    }
    const city = r.city || r.county || '';
    const state = r.state || '';
    const zip = r.postcode || '';
    const ctry = (r.country_code || countryCode).toUpperCase();

    if (!addressLine1 && !city) continue;

    const key = `${addressLine1.toLowerCase()}|${city.toLowerCase()}|${state.toLowerCase()}|${zip}`;
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      address_line1: addressLine1,
      address_line2: r.address_line2 || '',
      city,
      state,
      zip,
      country: ctry
    });
  }

  return normalized;
}

module.exports = { lookupByZip, lookupByCity, verifyAddress, autocomplete };
