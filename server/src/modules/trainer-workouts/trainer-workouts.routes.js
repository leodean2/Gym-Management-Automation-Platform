const express = require('express');
const trainerWorkoutsController = require('./trainer-workouts.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { registerTrainerSchema, updateTrainerSchema, assignTrainerSchema } = require('./trainer-workouts.validation');
const { ADMIN_ROLES, PROFILE_VIEW_ROLES, HISTORY_ROLES } = require('./trainers.constants');

// Feature 5 — Trainer Management & Workout Programs (Pass 1)

// --- /api/v1/trainers --------------------------------------------------------
const trainersRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Trainers
 *   description: Trainer accounts, profile, and member assignment
 */

/**
 * @openapi
 * /trainers:
 *   post:
 *     tags: [Trainers]
 *     summary: Register a Trainer
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, phone_number, specialization, hire_date]
 *             properties:
 *               email: { type: string, format: email }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone_number: { type: string }
 *               specialization: { type: string }
 *               hire_date: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Trainer created — includes a one-time temporary_password
 *       403:
 *         description: Role not permitted (ADMIN_ROLES only — GymOwner, SuperAdmin)
 */
trainersRouter.post(
  '/',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(registerTrainerSchema),
  asyncHandler(trainerWorkoutsController.register)
);

/**
 * @openapi
 * /trainers/{id}:
 *   get:
 *     tags: [Trainers]
 *     summary: Get a Trainer's profile
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Trainer profile }
 *       403: { description: Role not permitted, or a Trainer viewing someone else's profile }
 */
trainersRouter.get(
  '/:id',
  authenticate,
  authorize(...PROFILE_VIEW_ROLES),
  asyncHandler(trainerWorkoutsController.getProfile)
);

/**
 * @openapi
 * /trainers/{id}:
 *   patch:
 *     tags: [Trainers]
 *     summary: Update a Trainer's profile
 *     description: >
 *       Staff may update administrative fields; a Trainer may update
 *       their own contact fields only — the service enforces which
 *       fields apply per requester role, not the route.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone_number: { type: string }
 *               specialization: { type: string }
 *               profile_photo_url: { type: string, format: uri }
 *     responses:
 *       200: { description: Updated Trainer }
 *       403: { description: Attempting to update a field not permitted for this requester }
 */
trainersRouter.patch(
  '/:id',
  authenticate,
  authorize(...PROFILE_VIEW_ROLES), // service enforces the staff-vs-self field split
  validate(updateTrainerSchema),
  asyncHandler(trainerWorkoutsController.update)
);

// --- /api/v1/members/:memberId/assign-trainer & /trainer-history -----------
// FR-5.3: assignment is Gym Owner only (Receptionist is not listed) — ADMIN_ROLES, not STAFF_ROLES.
const memberTrainerRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/assign-trainer:
 *   post:
 *     tags: [Trainers]
 *     summary: Assign (or reassign) a Trainer to a Member
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trainer_id]
 *             properties:
 *               trainer_id: { type: string, format: uuid }
 *     responses:
 *       200: { description: Member updated with new current_trainer_id; a TrainerAssignmentHistory row is recorded }
 *       403: { description: Role not permitted (ADMIN_ROLES only) }
 */
memberTrainerRouter.post(
  '/:memberId/assign-trainer',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(assignTrainerSchema),
  asyncHandler(trainerWorkoutsController.assign)
);

/**
 * @openapi
 * /members/{memberId}/trainer-history:
 *   get:
 *     tags: [Trainers]
 *     summary: Get a Member's trainer assignment history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of TrainerAssignmentHistory rows }
 *       403: { description: Role not permitted (HISTORY_ROLES only) }
 */
memberTrainerRouter.get(
  '/:memberId/trainer-history',
  authenticate,
  authorize(...HISTORY_ROLES),
  asyncHandler(trainerWorkoutsController.getAssignmentHistory)
);

module.exports = { trainersRouter, memberTrainerRouter };