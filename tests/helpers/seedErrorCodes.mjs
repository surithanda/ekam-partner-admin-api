/**
 * Test helper — seeds the ERROR_CODES Map so createAppError() returns
 * correct httpStatus values during tests (where initErrorCodes() cannot
 * reach the real database).
 *
 * Data mirrors partner_admin_error_codes table rows.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const TEST_ERROR_CODES = [
  // Auth
  { error_code: 'PA_AULG_001_MISSING_CREDENTIALS', http_status: 400, error_type: 'validation', default_message: 'Username, password and API key are required' },
  { error_code: 'PA_AULG_100_INVALID_API_KEY',     http_status: 401, error_type: 'not_found', default_message: 'Invalid API key' },
  { error_code: 'PA_AULG_200_API_CLIENT_INACTIVE',  http_status: 403, error_type: 'business_rule', default_message: 'API client is inactive' },
  { error_code: 'PA_AULG_201_NO_PARTNER_LINKED',    http_status: 403, error_type: 'business_rule', default_message: 'No partner linked to this API key' },
  { error_code: 'PA_AULG_202_INVALID_CREDENTIALS',  http_status: 401, error_type: 'business_rule', default_message: 'Invalid credentials' },
  // Middleware
  { error_code: 'PA_MWAU_001_NO_TOKEN',            http_status: 401, error_type: 'validation', default_message: 'No authorization token provided' },
  { error_code: 'PA_MWAU_002_INVALID_TOKEN',        http_status: 403, error_type: 'validation', default_message: 'Token is invalid or expired' },
  { error_code: 'PA_MWAU_003_NO_API_KEY',           http_status: 401, error_type: 'validation', default_message: 'No API key provided' },
  { error_code: 'PA_MWAU_004_INVALID_API_KEY',      http_status: 401, error_type: 'auth', default_message: 'Invalid API key' },
  { error_code: 'PA_MWAU_300_INSUFFICIENT_ROLE',    http_status: 403, error_type: 'access_denied', default_message: 'Insufficient role for this resource' },
  // Dashboard
  { error_code: 'PA_DAGT_001_MISSING_PARTNER_ID',   http_status: 400, error_type: 'validation', default_message: 'Partner ID is required' },
  // Profile
  { error_code: 'PA_PFGT_100_NOT_FOUND',            http_status: 404, error_type: 'not_found', default_message: 'Profile not found' },
  { error_code: 'PA_PFGT_300_ACCESS_DENIED',         http_status: 403, error_type: 'access_denied', default_message: 'Profile does not belong to this partner' },
  { error_code: 'PA_PFUP_100_NOT_FOUND',             http_status: 404, error_type: 'not_found', default_message: 'Profile not found' },
  { error_code: 'PA_PFTG_100_NOT_FOUND',             http_status: 404, error_type: 'not_found', default_message: 'Profile not found for status toggle' },
  { error_code: 'PA_PNGT_100_NOT_FOUND',             http_status: 404, error_type: 'not_found', default_message: 'Partner not found' },
  // Background Check
  { error_code: 'PA_BCGT_100_NOT_FOUND',             http_status: 404, error_type: 'not_found', default_message: 'Profile not found for background check' },
  { error_code: 'PA_BCGT_300_ACCESS_DENIED',          http_status: 403, error_type: 'access_denied', default_message: 'Profile does not belong to this partner' },
  { error_code: 'PA_BCIN_001_MISSING_FIELDS',        http_status: 400, error_type: 'validation', default_message: 'Profile ID and check type are required' },
  { error_code: 'PA_BCIN_100_NOT_FOUND',              http_status: 404, error_type: 'not_found', default_message: 'Profile not found' },
  { error_code: 'PA_BCIN_300_ACCESS_DENIED',           http_status: 403, error_type: 'access_denied', default_message: 'Profile does not belong to this partner' },
  // Admin Users
  { error_code: 'PA_USCR_001_MISSING_FIELDS',        http_status: 400, error_type: 'validation', default_message: 'All required fields must be provided' },
  { error_code: 'PA_USCR_200_INVALID_ROLE',           http_status: 400, error_type: 'business_rule', default_message: 'Role must be account-admin or support-admin' },
  { error_code: 'PA_USUP_001_MISSING_ID',             http_status: 400, error_type: 'validation', default_message: 'User ID is required' },
  { error_code: 'PA_USUP_100_NOT_FOUND',              http_status: 404, error_type: 'not_found', default_message: 'Admin user not found' },
  { error_code: 'PA_USUP_200_INVALID_ROLE',            http_status: 400, error_type: 'business_rule', default_message: 'Invalid role for update' },
  { error_code: 'PA_USTG_100_NOT_FOUND',              http_status: 404, error_type: 'not_found', default_message: 'Admin user not found for status toggle' },
  { error_code: 'PA_USTG_200_SELF_DEACTIVATE',        http_status: 400, error_type: 'business_rule', default_message: 'Cannot deactivate your own account' },
  { error_code: 'PA_USRS_001_MISSING_FIELDS',         http_status: 400, error_type: 'validation', default_message: 'User ID and new password are required' },
  { error_code: 'PA_USRS_002_WEAK_PASSWORD',           http_status: 400, error_type: 'validation', default_message: 'Password must be at least 6 characters' },
  { error_code: 'PA_USRS_100_NOT_FOUND',              http_status: 404, error_type: 'not_found', default_message: 'Admin user not found for password reset' },
  // Address Verification
  { error_code: 'PA_AVLK_001_INVALID_ZIP',            http_status: 400, error_type: 'validation', default_message: 'Invalid or missing ZIP code (minimum 3 characters)' },
  { error_code: 'PA_AVLK_002_INVALID_CITY',           http_status: 400, error_type: 'validation', default_message: 'Invalid or missing city name (minimum 3 characters)' },
  { error_code: 'PA_AVLK_003_NO_RESULTS',             http_status: 404, error_type: 'not_found', default_message: 'No matching results found for the given address lookup' },
  { error_code: 'PA_AVVR_002_PROVIDER_UNAVAILABLE',   http_status: 503, error_type: 'system', default_message: 'Address verification service is temporarily unavailable' },
  { error_code: 'PA_AVAC_001_QUERY_TOO_SHORT',        http_status: 400, error_type: 'validation', default_message: 'Address query must be at least 3 characters' },
  { error_code: 'PA_AVVR_001_INVALID_ADDRESS',       http_status: 400, error_type: 'validation', default_message: 'Required address fields missing (address_line1, city, state, zip are required)' },
  { error_code: 'PA_AVVR_003_VERIFICATION_FAILED',   http_status: 422, error_type: 'business_rule', default_message: 'Address could not be verified' },
  // System
  { error_code: 'PA_SY00_999_UNKNOWN',                http_status: 500, error_type: 'system', default_message: 'Internal server error' },
];

export function seedErrorCodes() {
  const { ERROR_CODES } = require('../../config/errorCodes');
  for (const row of TEST_ERROR_CODES) {
    ERROR_CODES.set(row.error_code, {
      http_status: row.http_status,
      error_type: row.error_type,
      default_message: row.default_message
    });
  }
}
