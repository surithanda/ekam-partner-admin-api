const jwt = require('jsonwebtoken');
const { createAppError } = require('../config/errorCodes');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(createAppError('PA_MWAU_001_NO_TOKEN'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(createAppError('PA_MWAU_002_INVALID_TOKEN'));
  }
}

function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return next(createAppError('PA_MWAU_003_NO_API_KEY'));
  }
  req.apiKey = apiKey;
  next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(createAppError('PA_MWAU_300_INSUFFICIENT_ROLE'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(createAppError('PA_MWAU_300_INSUFFICIENT_ROLE', `Role '${req.user.role}' is not authorized for this resource`));
    }
    next();
  };
}

module.exports = { authenticateToken, validateApiKey, authorizeRoles };
