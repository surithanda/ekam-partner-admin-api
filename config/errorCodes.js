const AppError = require('../utils/AppError');
const pool = require('./db');

// In-memory cache loaded from partner_admin_error_codes table
const ERROR_CODES = new Map();

// Minimal fallback so the app can still respond if DB is unreachable at startup
const FALLBACK = { http_status: 500, error_type: 'system', default_message: 'Internal server error' };

/**
 * Load all active error codes from the database into the in-memory cache.
 * Must be called once at startup before the server begins accepting requests.
 */
async function initErrorCodes() {
  try {
    const [rows] = await pool.query(
      'SELECT error_code, http_status, error_type, default_message FROM partner_admin_error_codes WHERE is_active = 1'
    );
    ERROR_CODES.clear();
    for (const row of rows) {
      ERROR_CODES.set(row.error_code, {
        http_status: row.http_status,
        error_type: row.error_type,
        default_message: row.default_message
      });
    }
    console.log(`✅ Loaded ${ERROR_CODES.size} error codes from database`);
  } catch (err) {
    console.error('❌ Failed to load error codes from database:', err.message);
  }
}

/**
 * Create an AppError by looking up the error code from the DB-loaded cache.
 * @param {string} code - Error code (e.g. 'PA_AULG_001_MISSING_CREDENTIALS')
 * @param {string} [overrideMessage] - Optional message override
 * @returns {AppError}
 */
function createAppError(code, overrideMessage) {
  const def = ERROR_CODES.get(code) || FALLBACK;
  return new AppError(code, overrideMessage || def.default_message, def.http_status);
}

/**
 * Get the cached error code definition (used by errorHandler for logging).
 * @param {string} code
 * @returns {object|null}
 */
function getErrorDef(code) {
  return ERROR_CODES.get(code) || null;
}

module.exports = { ERROR_CODES, initErrorCodes, createAppError, getErrorDef };
