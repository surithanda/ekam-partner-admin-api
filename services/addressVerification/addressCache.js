/**
 * Simple in-memory cache with TTL for address lookups.
 * Avoids repeated external API calls for the same ZIP/city queries.
 */
const addressProviders = require('../../config/addressProviders');

class AddressCache {
  constructor(ttlSeconds) {
    this._store = new Map();
    this._ttl = (ttlSeconds || addressProviders.cacheTtl) * 1000; // convert to ms
  }

  /**
   * Build a cache key from operation + params.
   * @param {string} operation - e.g. 'zip', 'city'
   * @param {object} params - { zip, city, country, ... }
   * @returns {string}
   */
  key(operation, params) {
    const parts = Object.values(params).map(v => (v || '').toString().toLowerCase().trim());
    return `${operation}:${parts.join(':')}`;
  }

  /**
   * Get a cached value if it exists and is not expired.
   * @param {string} cacheKey
   * @returns {*|null}
   */
  get(cacheKey) {
    const entry = this._store.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(cacheKey);
      return null;
    }
    return entry.value;
  }

  /**
   * Store a value with TTL.
   * @param {string} cacheKey
   * @param {*} value
   */
  set(cacheKey, value) {
    this._store.set(cacheKey, {
      value,
      expiresAt: Date.now() + this._ttl
    });
  }

  /** Clear all cached entries. */
  clear() {
    this._store.clear();
  }

  /** Number of entries currently in cache. */
  get size() {
    return this._store.size;
  }
}

module.exports = new AddressCache();
