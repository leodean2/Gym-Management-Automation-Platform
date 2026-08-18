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

attendanceRouter.post(
  '/',
  authenticate,
  authorize(...CHECKIN_ROLES),
  validate(checkInSchema),
  asyncHandler(attendanceController.checkIn)
);

attendanceRouter.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(attendanceController.getDetail)
);

attendanceRouter.post(
  '/:id/correct',
  authenticate,
  authorize(...CORRECT_ROLES),
  validate(correctAttendanceSchema),
  asyncHandler(attendanceController.correct)
);

// --- /api/v1/members/:memberId/attendance -----------------------------------
const historyRouter = express.Router();

historyRouter.get(
  '/:memberId/attendance',
  authenticate,
  authorize(...VIEW_ROLES),
  validate(attendanceHistoryQuerySchema, 'query'),
  asyncHandler(attendanceController.getHistory)
);

module.exports = { attendanceRouter, historyRouter };
