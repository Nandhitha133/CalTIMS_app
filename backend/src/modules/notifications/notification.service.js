'use strict';

const Notification = require('./notification.model');

const notificationService = {
  async create({ userId, type, title, message, refId = null, refModel = null, organizationId }) {
    if (!organizationId) {
      console.warn(`[NotificationService] Missing organizationId for notification to user ${userId}`);
    }
    return Notification.create({ userId, type, title, message, refId, refModel, organizationId });
  },

  async getForUser(userId, query = {}, organizationId) {
    const limit = Math.min(parseInt(query.limit) || 20, 5000);
    const page = parseInt(query.page) || 1;
    const skip = (page - 1) * limit;
    const filter = { userId };
    if (organizationId) filter.organizationId = organizationId;
    if (query.unreadOnly === 'true') filter.isRead = false;

    const countFilter = { userId, isRead: false };
    if (organizationId) countFilter.organizationId = organizationId;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments(countFilter),
    ]);

    return { notifications, total, unreadCount, page, limit };
  },

  async markRead(id, userId, organizationId) {
    const filter = { _id: id, userId };
    if (organizationId) filter.organizationId = organizationId;
    return Notification.findOneAndUpdate(
      filter,
      { isRead: true },
      { new: true }
    );
  },

  async markAllRead(userId, organizationId) {
    const filter = { userId, isRead: false };
    if (organizationId) filter.organizationId = organizationId;
    return Notification.updateMany(filter, { isRead: true });
  },

  async getUnreadCount(userId, organizationId) {
    const filter = { userId, isRead: false };
    if (organizationId) filter.organizationId = organizationId;
    return Notification.countDocuments(filter);
  },

  async clearAll(userId, organizationId) {
    const filter = { userId };
    if (organizationId) filter.organizationId = organizationId;
    return Notification.deleteMany(filter);
  },
};

module.exports = notificationService;
