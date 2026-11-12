const Notification = require('../models/Notification');
const { emitUser } = require('../sockets');

function serializeNotification(notification) {
  const item = notification.toObject ? notification.toObject() : notification;
  return {
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    message: item.message,
    product: item.product
      ? typeof item.product === 'object' && item.product._id
        ? {
            id: item.product._id.toString(),
            name: item.product.name,
            slug: item.product.slug,
            images: item.product.images,
          }
        : item.product.toString()
      : null,
    promotion: item.promotion ? item.promotion.toString() : null,
    meta: item.meta || {},
    readAt: item.readAt || null,
    createdAt: item.createdAt,
  };
}

async function listNotifications(userId, { limit = 40 } = {}) {
  const notifications = await Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 100))
    .populate('product', 'name slug images')
    .lean();

  return notifications.map((item) => ({
    ...serializeNotification(item),
    id: item._id.toString(),
  }));
}

async function unreadCount(userId) {
  return Notification.countDocuments({ user: userId, readAt: null });
}

async function markRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { readAt: new Date() },
    { new: true },
  );

  return notification ? serializeNotification(notification) : null;
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { readAt: new Date() },
  );

  return { modified: result.modifiedCount };
}

async function createForUsers(userIds, payload) {
  const uniqueUserIds = Array.from(new Set(userIds.map((id) => id.toString())));
  if (!uniqueUserIds.length) return [];

  const documents = uniqueUserIds.map((userId) => ({
    user: userId,
    ...payload,
  }));

  const created = await Notification.insertMany(documents);

  created.forEach((notification) => {
    emitUser(notification.user.toString(), 'notification:new', serializeNotification(notification));
  });

  return created;
}

module.exports = {
  createForUsers,
  listNotifications,
  markAllRead,
  markRead,
  serializeNotification,
  unreadCount,
};
