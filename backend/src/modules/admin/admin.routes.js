'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { permit } = require('../../middleware/rbac.middleware');
const { ROLES } = require('../../constants');

// ── Super Admin Email Guard ───────────────────────────────────────────────────
// Only superadmin@timesheetpro.com may call these endpoints, even if they
// somehow hold the super_admin role via another account.
const SUPER_ADMIN_EMAIL = 'superadmin@timesheetpro.com';

const requireSuperAdminEmail = (req, res, next) => {
  const userEmail = req.user?.email?.toLowerCase();
  if (userEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. This module is restricted to the Super Administrator account.',
    });
  }
  next();
};

// All admin routes require: valid JWT  +  super_admin role  +  exact email match
router.use(authenticate);
router.use(permit(ROLES.SUPER_ADMIN));
router.use(requireSuperAdminEmail);

router.get('/dashboard-metrics', adminController.getDashboardMetrics);
router.get('/organizations', adminController.getAllOrganizations);

module.exports = router;
