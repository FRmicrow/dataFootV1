import logger from '../utils/logger.js';

/**
 * Middleware to protect destructive admin routes
 * Verifies the X-Admin-Key header against ADMIN_SECRET_KEY env var
 *
 * Usage:
 * router.post('/admin/maintenance/deduplicate', requireAdminKey, controllerFn);
 *
 * Request must include header: X-Admin-Key: {value matching ADMIN_SECRET_KEY}
 */
export const requireAdminKey = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET_KEY;

  if (!expectedKey) {
    logger.error('ADMIN_SECRET_KEY not configured in environment');
    return res.status(500).json({ success: false, error: 'Server misconfiguration' });
  }

  if (!key || key !== expectedKey) {
    logger.warn({ providedKey: !!key, expectedKey: !!expectedKey }, 'Unauthorized admin access attempt');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
};
