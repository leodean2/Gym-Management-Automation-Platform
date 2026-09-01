const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const analyticsController = require('./analytics.controller');
const { timeRangeQuerySchema, exportReportSchema } = require('./analytics.validation');
const { MANAGEMENT_ROLES, OPERATIONAL_ROLES } = require('./analytics.constants');

// Feature 12 — Admin Analytics Dashboard
//
// BR-12.1: this entire module is read-only. Every route below is GET
// except /export, which is POST since it's an action producing a
// downloadable artifact, not a resource fetch — never because it
// mutates operational data. No validate() middleware is applied to
// /operational, since that endpoint ignores the range query parameter
// entirely (FR-12.7) — there's nothing to validate.
//
// Single router, single URL prefix — unlike Nutrition/Booking/etc, this
// module has no nested sub-resource routes mounted elsewhere.

const router = express.Router();

router.get(
  '/dashboard',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getDashboardSummary)
);

router.get(
  '/memberships',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getMembershipAnalytics)
);

router.get(
  '/attendance',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getAttendanceAnalytics)
);

router.get(
  '/financial',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getFinancialAnalytics)
);

router.get(
  '/trainers',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getTrainerAnalytics)
);

router.get(
  '/bookings',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getBookingAnalytics)
);

// GET /operational — Receptionist's ONLY Analytics access; ignores
// range entirely, so no query validation is applied.
router.get(
  '/operational',
  authenticate,
  authorize(...OPERATIONAL_ROLES),
  asyncHandler(analyticsController.getOperationalDashboard)
);

router.post(
  '/export',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(exportReportSchema),
  asyncHandler(analyticsController.exportReport)
);

module.exports = router;