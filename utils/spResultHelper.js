const { createAppError } = require('../config/errorCodes');

/**
 * Check SP result for error status. If the first row indicates failure,
 * throw an AppError with the SP's error code.
 * @param {Array} rows - The result rows from pool.query('CALL ...')
 * @param {string} spName - SP name for logging context
 * @returns {object|null} The first data row, or null if empty
 */
function checkSpResult(rows, spName) {
  const firstRow = rows[0]?.[0];
  if (firstRow && firstRow.status === 'fail') {
    const code = firstRow.error_code || 'PA_SY00_999_UNKNOWN';
    const msg = firstRow.error_message || `Stored procedure error in ${spName}`;
    throw createAppError(code, msg);
  }
  return firstRow || null;
}

/**
 * Check SP result but return the full array (for list queries).
 * If the first row indicates failure, throw an AppError.
 * @param {Array} rows - The result rows from pool.query('CALL ...')
 * @param {string} spName - SP name for logging context
 * @returns {Array} The data rows
 */
function checkSpResultArray(rows, spName) {
  const firstRow = rows[0]?.[0];
  if (firstRow && firstRow.status === 'fail') {
    const code = firstRow.error_code || 'PA_SY00_999_UNKNOWN';
    const msg = firstRow.error_message || `Stored procedure error in ${spName}`;
    throw createAppError(code, msg);
  }
  return rows[0] || [];
}

module.exports = { checkSpResult, checkSpResultArray };
