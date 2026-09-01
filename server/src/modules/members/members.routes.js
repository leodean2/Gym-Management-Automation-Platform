const express = require('express');
const membersController = require('./members.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { registerMemberSchema, updateMemberSchema, searchMemberSchema } = require('./members.validation');
const { STAFF_ROLES, VIEW_ROLES, SEARCH_ROLES } = require('./members.constants');

// Feature 2 — Member Registration & Profile Management
// Pipeline mirrors auth/: authenticate -> authorize -> validate -> controller.

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Members
 *   description: Member registration and profile management
 */

/**
 * @openapi
 * /members:
 *   post:
 *     tags: [Members]
 *     summary: Register a new Member
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, phone_number, date_of_birth, gender, emergency_contact_name, emergency_contact_phone]
 *             properties:
 *               email: { type: string, format: email }
 *               first_name: { type: string }
 *               last_name: { type: string }
 *               phone_number: { type: string }
 *               date_of_birth: { type: string, format: date }
 *               gender: { type: string, enum: [Male, Female, Other] }
 *               emergency_contact_name: { type: string }
 *               emergency_contact_phone: { type: string }
 *               address: { type: string }
 *               medical_notes: { type: string }
 *     responses:
 *       201:
 *         description: Member created — includes a one-time temporary_password for the Member's own login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     membership_number: { type: string, example: MEM-2026-000001 }
 *                     first_name: { type: string }
 *                     last_name: { type: string }
 *                     current_trainer_id: { type: string, format: uuid, nullable: true }
 *                     temporary_password: { type: string }
 *                 error: { type: 'null' }
 *       403:
 *         description: Role not permitted (STAFF_ROLES only — GymOwner, Receptionist)
 */
// POST /api/v1/members
router.post(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(registerMemberSchema),
  asyncHandler(membersController.register)
);

/**
 * @openapi
 * /members:
 *   get:
 *     tags: [Members]
 *     summary: Search / list Members
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *       - in: query
 *         name: membership_number
 *         schema: { type: string }
 *       - in: query
 *         name: phone
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of Members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   description: Members module returns a plain array here, not the { items, pagination } shape used elsewhere
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       membership_number: { type: string }
 *                       first_name: { type: string }
 *                       last_name: { type: string }
 *                 error: { type: 'null' }
 *       403:
 *         description: Role not permitted (SEARCH_ROLES only)
 */
// GET /api/v1/members
router.get(
  '/',
  authenticate,
  authorize(...SEARCH_ROLES),
  validate(searchMemberSchema, 'query'),
  asyncHandler(membersController.search)
);

/**
 * @openapi
 * /members/{id}:
 *   get:
 *     tags: [Members]
 *     summary: Get a Member's profile
 *     description: >
 *       All VIEW_ROLES may call this route; ownership scoping (a Trainer
 *       may only view members currently assigned to them, a Member may
 *       only view their own profile) is enforced in the service layer,
 *       not by role alone.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Member profile
 *       403:
 *         description: Role permitted but not authorized for this specific Member (ownership check failed)
 *       404:
 *         description: Member not found
 */
// GET /api/v1/members/:id
// All VIEW_ROLES may hit this route; the service layer enforces the
// actual per-request ownership rule (Trainer -> assigned only, Member ->
// self only), since that depends on data authorize() doesn't have access to.
router.get(
  '/:id',
  authenticate,
  authorize(...VIEW_ROLES),
  asyncHandler(membersController.getProfile)
);

/**
 * @openapi
 * /members/{id}:
 *   patch:
 *     tags: [Members]
 *     summary: Update a Member's contact/operational fields
 *     description: >
 *       Only contact fields are editable (FR-2.4) — membership_number,
 *       created_by, and user_id are immutable and rejected outright by
 *       .strict() validation, not silently ignored.
 *     security:
 *       - bearerAuth: []
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
 *             minProperties: 1
 *             properties:
 *               phone_number: { type: string }
 *               address: { type: string }
 *               emergency_contact_name: { type: string }
 *               emergency_contact_phone: { type: string }
 *               medical_notes: { type: string }
 *               profile_photo_url: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Updated Member
 *       400:
 *         description: No fields provided, or an immutable/unknown field was included
 *       403:
 *         description: Role not permitted (STAFF_ROLES only)
 */
// PATCH /api/v1/members/:id
router.patch(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(updateMemberSchema),
  asyncHandler(membersController.update)
);

module.exports = router;
