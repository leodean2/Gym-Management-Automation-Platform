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

/**
 * @openapi
 * tags:
 *   name: Analytics
 *   description: Read-only management KPIs (BR-12.1 — this module owns no data)
 */

/**
 * @openapi
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Combined top-line KPIs across all categories
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [today, week, month, custom], default: today }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date, description: Required only when range=custom }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date, description: Required only when range=custom }
 *     responses:
 *       200: { description: Dashboard summary across membership, attendance, financial, trainers, bookings }
 *       403: { description: Role not permitted (MANAGEMENT_ROLES only) }
 */
router.get(
  '/dashboard',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getDashboardSummary)
);

/**
 * @openapi
 * /analytics/memberships:
 *   get:
 *     tags: [Analytics]
 *     summary: Membership analytics for a time range
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [today, week, month, custom] }
 *     responses:
 *       200: { description: Membership KPIs }
 */
router.get(
  '/memberships',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getMembershipAnalytics)
);

/**
 * @openapi
 * /analytics/attendance:
 *   get:
 *     tags: [Analytics]
 *     summary: Attendance analytics for a time range
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Attendance KPIs (Voided check-ins excluded) }
 */
router.get(
  '/attendance',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getAttendanceAnalytics)
);

/**
 * @openapi
 * /analytics/financial:
 *   get:
 *     tags: [Analytics]
 *     summary: Financial analytics for a time range
 *     description: Computed only from Successful PaymentTransaction rows — Voided transactions are excluded from every total.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Revenue, revenue by payment method, outstanding/overdue invoice totals }
 */
router.get(
  '/financial',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getFinancialAnalytics)
);

/**
 * @openapi
 * /analytics/trainers:
 *   get:
 *     tags: [Analytics]
 *     summary: Trainer analytics and per-trainer workload
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active trainer count and workload breakdown }
 */
router.get(
  '/trainers',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getTrainerAnalytics)
);

/**
 * @openapi
 * /analytics/bookings:
 *   get:
 *     tags: [Analytics]
 *     summary: Booking analytics for a time range
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Total/completed/cancelled/no-show/upcoming bookings }
 */
router.get(
  '/bookings',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(timeRangeQuerySchema, 'query'),
  asyncHandler(analyticsController.getBookingAnalytics)
);

/**
 * @openapi
 * /analytics/operational:
 *   get:
 *     tags: [Analytics]
 *     summary: Front-desk operational dashboard
 *     description: >
 *       Ignores the range query parameter entirely — always "as of right
 *       now." Receptionist's only Analytics access.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Today's attendance/bookings, pending memberships, outstanding follow-ups }
 */
// GET /operational — Receptionist's ONLY Analytics access; ignores
// range entirely, so no query validation is applied.
router.get(
  '/operational',
  authenticate,
  authorize(...OPERATIONAL_ROLES),
  asyncHandler(analyticsController.getOperationalDashboard)
);

/**
 * @openapi
 * /analytics/export:
 *   post:
 *     tags: [Analytics]
 *     summary: Export a CSV report
 *     description: >
 *       The only non-GET, non-read-only-in-form endpoint in this module
 *       (it produces a file, never mutates operational data). Financial
 *       exports include Voided transactions, marked as such, unlike the
 *       on-screen Financial Analytics endpoint. Creates an AuditLog
 *       entry; the CSV itself is never stored.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [report, range]
 *             properties:
 *               report: { type: string, enum: [memberships, attendance, financial, trainers, bookings] }
 *               range: { type: string, enum: [today, week, month, custom] }
 *               from: { type: string, format: date }
 *               to: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV file download (not the standard JSON envelope)
 *         content:
 *           text/csv:
 *             schema: { type: string, format: binary }
 */
router.post(
  '/export',
  authenticate,
  authorize(...MANAGEMENT_ROLES),
  validate(exportReportSchema),
  asyncHandler(analyticsController.exportReport)
);

module.exports = router;