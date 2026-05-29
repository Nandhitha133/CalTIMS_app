'use strict';

const express = require('express');
const router = express.Router();
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/utils/apiResponse');
const Announcement = require('./announcement.model');
const User = require('../users/user.model');
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/rbac.middleware');
const { parsePagination, buildPaginationMeta } = require('../../shared/utils/pagination');
const notificationService = require('../notifications/notification.service');
const { logAction } = require('../audit/audit.routes');

router.use(authenticate);

// Get active announcements visible to the current user's role
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const now = new Date();
  const effectiveRole = req.user.isOwner ? 'admin' : (req.user.role || '').toLowerCase();
  const roleVariants = [
    effectiveRole,
    effectiveRole.toUpperCase(),
    effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1),
  ].filter(Boolean);
  const filter = {
    organizationId: req.organizationId,
    isActive: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [
          { targetRoles: { $size: 0 } },
          { targetRoles: 'all' },
          { targetRoles: { $in: roleVariants } },
        ]
      },
    ],
  };

  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .populate('publishedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Announcement.countDocuments(filter),
  ]);

  ApiResponse.success(res, { data: announcements, pagination: buildPaginationMeta(total, page, limit) });
}));

// Admin-only: Get ALL announcements (including inactive/expired) for management view
router.get('/admin', authorize('admin'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { organizationId: req.organizationId };
  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .populate('publishedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit).lean(),
    Announcement.countDocuments(filter),
  ]);
  ApiResponse.success(res, { data: announcements, pagination: buildPaginationMeta(total, page, limit) });
}));

// Get single announcement by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const announcement = await Announcement.findOne({ _id: req.params.id, organizationId: req.organizationId })
    .populate('publishedBy', 'name email')
    .lean();

  if (!announcement) return ApiResponse.notFound(res);

  const userRole = req.user.isOwner ? 'admin' : (req.user.role || '').toLowerCase();
  const roleVariants = [
    userRole,
    userRole.toUpperCase(),
    userRole.charAt(0).toUpperCase() + userRole.slice(1),
  ].filter(Boolean);
  const now = new Date();
  const isAdminUser = ['admin', 'super_admin', 'owner'].includes(userRole);

  if (!isAdminUser) {
    const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) <= now;
    const isVisible = announcement.isActive && !isExpired && (
      !announcement.targetRoles || announcement.targetRoles.length === 0 ||
      announcement.targetRoles.includes('all') ||
      announcement.targetRoles.some(role => roleVariants.includes(role))
    );

    if (!isVisible) {
      return ApiResponse.forbidden(res, 'Announcement not visible for your role');
    }
  }

  ApiResponse.success(res, { data: announcement });
}));

// Admin-only: Create announcement + notify all active users
router.post('/', authorize('admin'), asyncHandler(async (req, res) => {
  const ann = await Announcement.create({ ...req.body, publishedBy: req.user._id, organizationId: req.organizationId });

  // Determine who to notify based on targetRoles
  const targetRoles = req.body.targetRoles && req.body.targetRoles.length > 0
    ? req.body.targetRoles
    : ['admin', 'manager', 'employee'];

  const usersToNotify = await User.find(
    { organizationId: req.organizationId, isActive: true, role: { $in: targetRoles }, _id: { $ne: req.user._id } },
    '_id'
  ).lean();

  const typeEmoji = { urgent: '🚨', warning: '⚠️', info: 'ℹ️' };
  const emoji = typeEmoji[ann.type] || 'ℹ️';

  // Fire-and-forget bulk notifications
  const notifPromises = usersToNotify.map(u =>
    notificationService.create({
      userId: u._id,
      type: 'announcement',
      title: `${emoji} ${ann.title}`,
      message: ann.content.length > 120 ? ann.content.slice(0, 117) + '...' : ann.content,
      refId: ann._id,
      refModel: 'Announcement',
    })
  );
  await Promise.allSettled(notifPromises); // don't fail if one notification fails

  ApiResponse.created(res, { message: 'Announcement created', data: ann });

  logAction({
    userId: req.user._id,
    action: 'CREATE_ANNOUNCEMENT',
    entityType: 'Announcement',
    entityId: ann._id,
    details: { title: ann.title, type: ann.type },
    organizationId: req.organizationId
  });
}));

router.put('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const ann = await Announcement.findOneAndUpdate({ _id: req.params.id, organizationId: req.organizationId }, req.body, { new: true, runValidators: true });
  if (!ann) return ApiResponse.notFound(res);
  ApiResponse.success(res, { message: 'Announcement updated', data: ann });

  logAction({
    userId: req.user._id,
    action: 'UPDATE_ANNOUNCEMENT',
    entityType: 'Announcement',
    entityId: req.params.id,
    details: { title: ann.title, type: ann.type },
    organizationId: req.organizationId
  });
}));

router.delete('/:id', authorize('admin'), asyncHandler(async (req, res) => {
  const ann = await Announcement.findOneAndDelete({ _id: req.params.id, organizationId: req.organizationId });
  if (!ann) return ApiResponse.notFound(res);
  ApiResponse.success(res, { message: 'Announcement deleted' });

  logAction({
    userId: req.user._id,
    action: 'DELETE_ANNOUNCEMENT',
    entityType: 'Announcement',
    entityId: req.params.id,
    details: { title: ann.title },
    organizationId: req.organizationId
  });
}));

module.exports = router;
