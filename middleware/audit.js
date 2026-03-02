const pool = require('../config/db');

const SENSITIVE_FIELDS = ['password', 'password_hash', 'apiKey', 'token'];

function sanitizeBody(body) {
  if (!body) return null;
  const clean = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (clean[field]) clean[field] = '***';
  }
  return JSON.stringify(clean);
}

function resolveAction(method, path) {
  const parts = path.replace(/^\/api\//, '').split('/');
  return parts.join('.').replace(/\./g, '_');
}

function resolveEntity(path, body) {
  const p = path.replace(/^\/api\//, '');

  if (p.startsWith('profiles/')) return { type: 'profile', id: body?.id || body?.profileId || null };
  if (p.startsWith('admin-users/')) return { type: 'admin_user', id: body?.id || null };
  if (p.startsWith('partner/')) return { type: 'partner', id: null };
  if (p.startsWith('background-check/')) return { type: 'background_check', id: body?.profileId || null };
  if (p.startsWith('dashboard/')) return { type: 'dashboard', id: null };
  if (p.startsWith('auth/')) return { type: 'auth', id: null };

  return { type: 'unknown', id: null };
}

function auditLog(options = {}) {
  const { action: customAction, entityType: customEntityType } = options;

  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Log after response is sent (non-blocking)
      setImmediate(async () => {
        try {
          if (!req.user) return;

          const entity = resolveEntity(req.originalUrl, req.body);
          const actionName = customAction || resolveAction(req.method, req.originalUrl);

          await pool.query(
            'CALL partner_admin_insert_audit_log(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              req.user.partnerId,
              req.user.userId,
              req.user.username,
              req.user.role,
              actionName,
              customEntityType || entity.type,
              entity.id,
              req.originalUrl,
              sanitizeBody(req.body),
              null,
              data?.success ? JSON.stringify(data.data || null).substring(0, 2000) : null,
              req.ip || req.connection?.remoteAddress,
              (req.headers['user-agent'] || '').substring(0, 500)
            ]
          );
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      });

      return originalJson(data);
    };

    next();
  };
}

// Standalone function for logging specific events (login, etc.)
async function logAuditEvent({ partnerId, userId, username, role, action, entityType, entityId, endpoint, requestBody, previousData, newData, ipAddress, userAgent }) {
  try {
    await pool.query(
      'CALL partner_admin_insert_audit_log(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        partnerId, userId, username, role, action,
        entityType || null, entityId || null, endpoint || null,
        requestBody ? JSON.stringify(requestBody) : null,
        previousData ? JSON.stringify(previousData) : null,
        newData ? JSON.stringify(newData) : null,
        ipAddress || null, userAgent || null
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { auditLog, logAuditEvent };
