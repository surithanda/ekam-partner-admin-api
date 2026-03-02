const paymentDatalayer = require('../datalayer/paymentDatalayer');

/**
 * Middleware factory that checks whether a partner has access to a given feature.
 * If the partner has exceeded their plan limit and has no credits, returns 403.
 * On success, calls next() and optionally attaches access info to req.featureAccess.
 *
 * @param {string} featureKey - One of: profile_view, bg_check, profile_export, profile_list, search
 * @param {object} [options]
 * @param {boolean} [options.consume=false] - If true, also tracks usage and deducts credit
 */
function featureGate(featureKey, options = {}) {
  return async (req, res, next) => {
    try {
      const partnerId = req.user?.partnerId;
      if (!partnerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      if (options.consume) {
        const result = await paymentDatalayer.consumeFeature(partnerId, featureKey);
        if (!result.allowed) {
          return res.status(403).json({
            success: false,
            message: result.message,
            featureGated: true,
            reason: result.reason,
            used: result.used,
            limit: result.limit,
          });
        }
        req.featureAccess = result;
      } else {
        const access = await paymentDatalayer.checkFeatureAccess(partnerId, featureKey);
        if (!access.allowed) {
          return res.status(403).json({
            success: false,
            message: access.message,
            featureGated: true,
            reason: access.reason,
            used: access.used,
            limit: access.limit,
          });
        }
        req.featureAccess = access;
      }

      next();
    } catch (err) {
      console.error('Feature gate error:', err.message);
      // Don't block the request on feature gate errors — degrade gracefully
      next();
    }
  };
}

module.exports = { featureGate };
