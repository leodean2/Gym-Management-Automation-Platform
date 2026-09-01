const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const exerciseLibraryController = require('./exercise-library.controller');
const {
  createExerciseSchema,
  updateExerciseSchema,
  listExercisesQuerySchema,
} = require('./exercise-library.validation');
const { WRITE_ROLES, VIEW_ROLES } = require('./exercise-library.constants');

// Feature 9 — Exercise Library
//
// No DELETE anywhere in this router — the library is permanent per the
// frozen design ("Exercise history must remain valid forever"). Status
// changes go through the dedicated /deactivate and /reactivate endpoints
// only; PATCH / never accepts a status field (enforced by
// updateExerciseSchema's .strict() shape and defensively again in the
// service).

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(...WRITE_ROLES),
  validate(createExerciseSchema),
  asyncHandler(exerciseLibraryController.createExercise)
);

/**
 * @openapi
 * tags:
 *   name: Exercise Library
 *   description: Exercise library — create, list, view, update, deactivate, reactivate
 */

/**
 * @openapi
 * /exercise-library:
 *   get:
 *     tags: [Exercise Library]
 *     summary: List exercise library entries
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: exercise_type
 *         schema: { type: string, enum: [Weighted, Bodyweight, Cardio] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Strength, Cardio, Flexibility, Mobility, Rehabilitation] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Inactive] }
 *       - in: query
 *         name: muscle_group
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of exercises
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           category: { type: string }
 *                           exercise_type: { type: string }
 *                           muscle_group: { type: string }
 *                           status: { type: string }
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                 error: { type: 'null' }
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Role not permitted (VIEW_ROLES only)
 */
router.get(
  '/',
  authenticate,
  authorize(...VIEW_ROLES),
  validate(listExercisesQuerySchema, 'query'),
  asyncHandler(exerciseLibraryController.listExercises)
);

router.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(exerciseLibraryController.getExercise)
);

router.patch(
  '/:id',
  authenticate,
  authorize(...WRITE_ROLES),
  validate(updateExerciseSchema),
  asyncHandler(exerciseLibraryController.updateExercise)
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorize(...WRITE_ROLES),
  asyncHandler(exerciseLibraryController.deactivateExercise)
);

router.patch(
  '/:id/reactivate',
  authenticate,
  authorize(...WRITE_ROLES),
  asyncHandler(exerciseLibraryController.reactivateExercise)
);

module.exports = router;