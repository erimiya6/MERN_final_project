const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  actor,
  action,
  targetModel,
  targetId,
  req,
  metadata = {},
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      actor: actor || (req && req.user ? req.user._id : null),
      action,
      targetModel,
      targetId,
      ipAddress,
      userAgent,
      metadata,
    });
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error.message);
  }
};

module.exports = { logAudit };
