-- ============================================================
-- Address Verification error codes
-- Module: AV (Address Verification)
-- Operations: VR (verify), LK (lookup), AC (autocomplete)
-- ============================================================

INSERT INTO partner_admin_error_codes (error_code, http_status, error_type, default_message, module, is_active)
VALUES
  ('PA_AVLK_001_INVALID_ZIP',          400, 'validation',    'Invalid or missing ZIP code (minimum 3 characters)',         'address_verification', 1),
  ('PA_AVLK_002_INVALID_CITY',         400, 'validation',    'Invalid or missing city name (minimum 3 characters)',        'address_verification', 1),
  ('PA_AVLK_003_NO_RESULTS',           404, 'not_found',     'No matching results found for the given address lookup',     'address_verification', 1),
  ('PA_AVVR_002_PROVIDER_UNAVAILABLE', 503, 'system',        'Address verification service is temporarily unavailable',    'address_verification', 1),
  ('PA_AVAC_001_QUERY_TOO_SHORT',      400, 'validation',    'Address query must be at least 3 characters',               'address_verification', 1),
  ('PA_AVVR_001_INVALID_ADDRESS',      400, 'validation',    'Required address fields missing (address_line1, city, state, zip are required)', 'address_verification', 1),
  ('PA_AVVR_003_VERIFICATION_FAILED',  422, 'business_rule', 'Address could not be verified',                                                  'address_verification', 1)
ON DUPLICATE KEY UPDATE
  http_status     = VALUES(http_status),
  error_type      = VALUES(error_type),
  default_message = VALUES(default_message),
  module          = VALUES(module),
  is_active       = VALUES(is_active);
