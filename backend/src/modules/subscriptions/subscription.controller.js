'use strict';

const subscriptionService = require('./subscription.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/utils/apiResponse');
const AppError = require('../../shared/utils/AppError');

const subscriptionController = {
  /**
   * Upgrade subscription plan
   */
  upgrade: asyncHandler(async (req, res) => {
    const { planType } = req.body;
    const { organizationId, _id: userId } = req.user;

    if (!['BASIC', 'PRO'].includes(planType)) {
      throw new AppError('Invalid plan type. Must be BASIC or PRO.', 400);
    }

    if (!organizationId) {
      throw new AppError('User is not associated with an organization', 403);
    }

    const subscription = await subscriptionService.upgradeSubscription(organizationId, {
      planType,
      userId,
      req
    });

    ApiResponse.success(res, {
      message: `Successfully upgraded to ${planType} plan`,
      data: subscription
    });
  }),

  /**
   * Get current subscription
   */
  getCurrent: asyncHandler(async (req, res) => {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new AppError('User is not associated with an organization', 403);
    }

    const subscription = await subscriptionService.getSubscription(organizationId);
    ApiResponse.success(res, { data: subscription });
  }),

  /**
   * Handle upgrade request from frontend
   */
  requestUpgrade: asyncHandler(async (req, res) => {
    const { organizationId, _id: userId } = req.user;
    const { plan, price, name, email, company, phone, message } = req.body;

    // In a real app, this would send an email or create a ticket
    // For now, we'll log it and return success
    console.log(`Upgrade request from ${name} (${email}) for plan ${plan}`);

    ApiResponse.success(res, {
      message: 'Upgrade request received. Our team will contact you shortly.',
    });
  }),

  /**
   * Get subscription billing history
   */
  getHistory: asyncHandler(async (req, res) => {
    const { organizationId } = req.user;
    if (!organizationId) {
      throw new AppError('User is not associated with an organization', 403);
    }

    // For now, return the current subscription as a history record
    const subscription = await subscriptionService.getSubscription(organizationId);
    const history = subscription ? [{
      planName: subscription.planType,
      startDate: subscription.createdAt,
      endDate: subscription.trialEndDate || subscription.expiryDate,
      totalCost: 0, // Mock cost
      status: subscription.status
    }] : [];

    ApiResponse.success(res, { data: history });
  }),
};

module.exports = subscriptionController;
