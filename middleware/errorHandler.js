const AppError = require('../utils/AppError');
const pool = require('../config/db');

function logErrorToDb(err, req) {
  setImmediate(async () => {
    try {
      const errorCode = (err instanceof AppError) ? err.errorCode : 'PA_SY00_999_UNKNOWN';
      const username = req.user?.username || null;
      const partnerId = req.user?.partnerId || null;
      const requestData = JSON.stringify({
        method: req.method,
        url: req.originalUrl,
        body: req.body || null
      }).substring(0, 65000);
      const stackTrace = (err.stack || '').substring(0, 65000);

      await pool.query(
        'CALL partner_admin_log_api_error(?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          errorCode,
          null,
          (err.message || '').substring(0, 500),
          username,
          req.originalUrl || 'unknown',
          partnerId,
          requestData,
          stackTrace
        ]
      );
    } catch (logErr) {
      console.error('Error logging to DB:', logErr.message);
    }
  });
}

function errorHandler(err, req, res, next) {
  logErrorToDb(err, req);

  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      success: false,
      error: {
        code: err.errorCode,
        type: err.isOperational ? 'operational' : 'system',
        message: err.message
      }
    });
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'PA_SY00_999_UNKNOWN',
      type: 'system',
      message: 'Internal server error'
    }
  });
}

module.exports = errorHandler;
