const Notification = require('../models/Notification');

const createNotification = async ({
  app,
  recipient,
  actor,
  type,
  title,
  message,
  relatedItem,
  relatedClaim,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      actor,
      type,
      title,
      message,
      relatedItem,
      relatedClaim,
    });

    // Populate actor info for instant UI rendering
    await notification.populate('actor', 'name avatar');
    if (relatedItem) {
      await notification.populate('relatedItem', 'title reportType');
    }

    // Emit live WebSocket notification if socket.io is available
    if (app && app.get('io')) {
      const io = app.get('io');
      io.to(`user:${recipient}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Failed to create notification:', error.message);
    return null;
  }
};

module.exports = { createNotification };
