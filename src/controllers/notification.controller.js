const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    notificationService.listNotifications(req.user._id, {
      limit: Number(req.query.limit) || 40,
    }),
    notificationService.unreadCount(req.user._id),
  ]);

  res.json({ items, unread });
});

const unread = asyncHandler(async (req, res) => {
  const count = await notificationService.unreadCount(req.user._id);
  res.json({ count });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(
    req.user._id,
    req.params.notificationId,
  );

  if (!notification) {
    res.status(404).json({ error: 'Notificacion no encontrada' });
    return;
  }

  res.json({ notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user._id);
  res.json(result);
});

module.exports = { list, markAllRead, markRead, unread };
