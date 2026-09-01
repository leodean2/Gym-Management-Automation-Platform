const express = require('express');
const attendanceController = require('./attendance.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  checkInSchema,
  attendanceHistoryQuerySchema,
  correctAttendanceSchema,
} = require('./attendance.validation');
const { CHECKIN_ROLES, VIEW_ROLES, CORRECT_ROLES } = require('./attendance.constants');

// --- /api/v1/attendance -----------------------------------------------------
const attendanceRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Attendance
 *   description: Member check-in and attendance history
 */

/**
 * @openapi
 * /attendance:
 *   post:
 *     tags: [Attendance]
 *     summary: Check in a Member
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *     responses:
 *       201: { description: Check-in recorded }
 *       403: { description: Role not permitted (CHECKIN_ROLES only) }
 *       409: { description: Member already checked in today, or membership not Active }
 */
attendanceRouter.post(
  '/',
  authenticate,
  authorize(...CHECKIN_ROLES),
  validate(checkInSchema),
  asyncHandler(attendanceController.checkIn)
);

/**
 * @openapi
 * /attendance/{id}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get an Attendance record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Attendance record }
 *       403: { description: Role not permitted (VIEW_ROLES only) }
 */
attendanceRouter.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(attendanceController.getDetail)
);

/**
 * @openapi
 * /attendance/{id}/correct:
 *   post:
 *     tags: [Attendance]
 *     summary: Void an incorrect Attendance record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200: { description: Attendance record marked Voided }
 *       403: { description: Role not permitted (CORRECT_ROLES only) }
 */
attendanceRouter.post(
  '/:id/correct',
  authenticate,
  authorize(...CORRECT_ROLES),
  validate(correctAttendanceSchema),
  asyncHandler(attendanceController.correct)
);

// --- /api/v1/members/:memberId/attendance -----------------------------------
const historyRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/attendance:
 *   get:
 *     tags: [Attendance]
 *     summary: Get a Member's attendance history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated attendance history (Voided records excluded) }
 *       403: { description: Role not permitted (VIEW_ROLES only) }
 */
historyRouter.get(
  '/:memberId/attendance',
  authenticate,
  authorize(...VIEW_ROLES),
  validate(attendanceHistoryQuerySchema, 'query'),
  asyncHandler(attendanceController.getHistory)
);

module.exports = { attendanceRouter, historyRouter };
