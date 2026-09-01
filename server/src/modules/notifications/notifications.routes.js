const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const notificationsController = require('./notifications.controller');
const {
  listNotificationsQuerySchema,
  markReadSchema,
  resendNotificationSchema,
} = require('./notifications.validation');
const {
  VIEW_ROLES,
  MARK_READ_ROLES,
  RESEND_ROLES,
  ATTEMPTS_VIEW_ROLES,
} = require('./notifications.constants');

// Feature 11 — Notifications
//
// No POST / route exists at all — BR-11.1: notifications are generated
// automatically by their originating feature; clients never call a
// "create notification" endpoint. Single router, single URL prefix —
// unlike Nutrition/Workout Programs/Booking, this module has no nested
// sub-resource routes mounted elsewhere (e.g. under /members).

const router = express.Router();

router.get(
  '/',
  authenticate,
  authorize(...VIEW_ROLES),
  validate(listNotificationsQuerySchema, 'query'),
  asyncHandler(notificationsController.listNotifications)
);

router.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(notificationsController.getNotification)
);

router.patch(
  '/:id/read',
  authenticate,
  authorize(...MARK_READ_ROLES),
  validate(markReadSchema),
  asyncHandler(notificationsController.markAsRead)
);

router.post(
  '/:id/resend',
  authenticate,
  authorize(...RESEND_ROLES),
  validate(resendNotificationSchema),
  asyncHandler(notificationsController.resendNotification)
);

router.get(
  '/:id/attempts',
  authenticate,
  authorize(...ATTEMPTS_VIEW_ROLES),
  asyncHandler(notificationsController.getAttempts)
);

module.exports = router;