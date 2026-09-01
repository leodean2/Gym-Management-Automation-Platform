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