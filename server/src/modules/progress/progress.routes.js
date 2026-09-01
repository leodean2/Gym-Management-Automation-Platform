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

/**
 * @openapi
 * tags:
 *   name: Progress
 *   description: Body Measurements and Personal Records (Feature 8)
 */

/**
 * @openapi
 * /body-measurements:
 *   post:
 *     tags: [Progress]
 *     summary: Record a Body Measurement (append-only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id, measurement_date]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *               measurement_date: { type: string, format: date }
 *               weight_kg: { type: number }
 *               body_fat_percentage: { type: number }
 *               chest_cm: { type: number }
 *               waist_cm: { type: number }
 *               hips_cm: { type: number }
 *               left_arm_cm: { type: number }
 *               right_arm_cm: { type: number }
 *               left_thigh_cm: { type: number }
 *               right_thigh_cm: { type: number }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Measurement recorded }
 *       403: { description: Trainer not currently assigned to this member }
 */
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

/**
 * @openapi
 * /body-measurements:
 *   get:
 *     tags: [Progress]
 *     summary: List Body Measurements
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Paginated list, scoped to requester's role }
 */
measurementsRouter.get(
  '/',
  authenticate,
  authorize(...MEASUREMENT_LIST_ROLES),
  validate(listBodyMeasurementsQuerySchema, 'query'),
  asyncHandler(workoutProgressController.listMeasurements)
);

/**
 * @openapi
 * /body-measurements/{id}:
 *   get:
 *     tags: [Progress]
 *     summary: Get a Body Measurement
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Measurement detail }
 */
measurementsRouter.get(
  '/:id',
  authenticate,
  authorize(...MEASUREMENT_VIEW_ROLES),
  asyncHandler(workoutProgressController.getMeasurement)
);

// --- /api/v1/personal-records ------------------------------------------------
const personalRecordsRouter = express.Router();

/**
 * @openapi
 * /personal-records:
 *   get:
 *     tags: [Progress]
 *     summary: List Personal Records
 *     description: >
 *       System-maintained — no POST/PATCH/DELETE exists anywhere.
 *       Updated automatically when a Workout Session is finalized (see
 *       Workout Logging module).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: member_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: exercise_library_entry_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated list, scoped to requester's role }
 */
personalRecordsRouter.get(
  '/',
  authenticate,
  authorize(...PR_LIST_ROLES),
  validate(listPersonalRecordsQuerySchema, 'query'),
  asyncHandler(workoutProgressController.listPersonalRecords)
);

/**
 * @openapi
 * /personal-records/{id}:
 *   get:
 *     tags: [Progress]
 *     summary: Get a Personal Record
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Personal Record detail (highest performed_weight for this member+exercise) }
 */
personalRecordsRouter.get(
  '/:id',
  authenticate,
  authorize(...PR_VIEW_ROLES),
  asyncHandler(workoutProgressController.getPersonalRecord)
);

module.exports = { measurementsRouter, personalRecordsRouter };