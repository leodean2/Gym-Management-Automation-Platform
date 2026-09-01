const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const workoutProgressController = require('./progress.controller');
const {
  createBodyMeasurementSchema,
  listBodyMeasurementsQuerySchema,
  listPersonalRecordsQuerySchema,
} = require('./progress.validation');
const {
  MEASUREMENT_CREATE_ROLES,
  MEASUREMENT_LIST_ROLES,
  MEASUREMENT_VIEW_ROLES,
  PR_LIST_ROLES,
  PR_VIEW_ROLES,
} = require('./progress.constants');

// Feature 8 — Progress Tracking (Body Measurements + Personal Records)
//
// Route naming is deliberately /body-measurements and /personal-records,
// not /progress — the future dashboard is a consumer of these resources,
// not the resource itself, per the frozen design.
//
// PersonalRecord has no POST/PATCH/DELETE routes at all: it's
// system-maintained, updated only via workout-progress.service.js's
// updatePersonalRecordsFromSession, called from
// workout-logging.service.js's finalizeSession — never from a route
// handler in this file.

// --- /api/v1/body-measurements ------------------------------------------------
const measurementsRouter = express.Router();

// POST /api/v1/body-measurements
// No PATCH/DELETE anywhere in this router — measurements are append-only
// per the frozen design ("Never edit history. If another assessment is
// performed, create another record.").
measurementsRouter.post(
  '/',
  authenticate,
  authorize(...MEASUREMENT_CREATE_ROLES),
  validate(createBodyMeasurementSchema),
  asyncHandler(workoutProgressController.createBodyMeasurement)
);

measurementsRouter.get(
  '/',
  authenticate,
  authorize(...MEASUREMENT_LIST_ROLES),
  validate(listBodyMeasurementsQuerySchema, 'query'),
  asyncHandler(workoutProgressController.listMeasurements)
);

measurementsRouter.get(
  '/:id',
  authenticate,
  authorize(...MEASUREMENT_VIEW_ROLES),
  asyncHandler(workoutProgressController.getMeasurement)
);

// --- /api/v1/personal-records ------------------------------------------------
const personalRecordsRouter = express.Router();

personalRecordsRouter.get(
  '/',
  authenticate,
  authorize(...PR_LIST_ROLES),
  validate(listPersonalRecordsQuerySchema, 'query'),
  asyncHandler(workoutProgressController.listPersonalRecords)
);

personalRecordsRouter.get(
  '/:id',
  authenticate,
  authorize(...PR_VIEW_ROLES),
  asyncHandler(workoutProgressController.getPersonalRecord)
);

module.exports = { measurementsRouter, personalRecordsRouter };