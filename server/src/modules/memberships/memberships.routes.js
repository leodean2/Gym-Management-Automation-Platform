const express = require('express');
const membershipsController = require('./memberships.controller');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  listPlansQuerySchema,
  createMembershipSchema,
  renewMembershipSchema,
  suspendMembershipSchema,
} = require('./memberships.validation');
const { ADMIN_ROLES, STAFF_ROLES, VIEW_MEMBERSHIP_ROLES, HISTORY_ROLES } = require('./memberships.constants');

// Feature 3 — Membership Plans & Renewals
//
// This module owns three distinct URL prefixes, so it exports three
// routers rather than one — see app.js for how each is mounted.

// --- /api/v1/membership-plans -----------------------------------------------
const plansRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Memberships
 *   description: Membership Plans, Memberships, renewal, suspension, and history
 */

/**
 * @openapi
 * /membership-plans:
 *   post:
 *     tags: [Memberships]
 *     summary: Create a Membership Plan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, duration_days, price]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               duration_days: { type: integer, example: 30 }
 *               price: { type: number, example: 5000 }
 *     responses:
 *       201:
 *         description: Plan created
 *       403:
 *         description: Role not permitted (ADMIN_ROLES only — GymOwner, SuperAdmin)
 *       409:
 *         description: PLAN_NAME_TAKEN — a plan with this name already exists
 */
plansRouter.post(
  '/',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(createMembershipPlanSchema),
  asyncHandler(membershipsController.createPlan)
);

/**
 * @openapi
 * /membership-plans:
 *   get:
 *     tags: [Memberships]
 *     summary: List Membership Plans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: >
 *           Array of plans (plain array under data, same convention as
 *           GET /members — not the { items, pagination } shape used
 *           elsewhere)
 *       403:
 *         description: Role not permitted (STAFF_ROLES only)
 */
plansRouter.get(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(listPlansQuerySchema, 'query'),
  asyncHandler(membershipsController.listPlans)
);

/**
 * @openapi
 * /membership-plans/{id}:
 *   patch:
 *     tags: [Memberships]
 *     summary: Update a Membership Plan
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
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               duration_days: { type: integer }
 *               price: { type: number }
 *               status: { type: string, enum: [Active, Inactive] }
 *     responses:
 *       200:
 *         description: Updated plan
 *       403:
 *         description: Role not permitted (ADMIN_ROLES only)
 */
plansRouter.patch(
  '/:id',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(updateMembershipPlanSchema),
  asyncHandler(membershipsController.updatePlan)
);

// --- /api/v1/memberships -----------------------------------------------------
const membershipsRouter = express.Router();

/**
 * @openapi
 * /memberships:
 *   post:
 *     tags: [Memberships]
 *     summary: Create a Membership (starts Pending, with a Pending Invoice)
 *     description: >
 *       Does NOT activate the membership — status stays Pending and
 *       start_date/expiry_date remain null until a payment is recorded
 *       against the created Invoice via POST /invoices/{id}/pay
 *       (Payments module).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [member_id, membership_plan_id]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *               membership_plan_id: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Membership (Pending) and its Invoice (Pending)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     membership:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         status: { type: string, example: Pending }
 *                         start_date: { type: 'null' }
 *                         expiry_date: { type: 'null' }
 *                     invoice:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         invoice_number: { type: string, example: INV-2026-000001 }
 *                         membership_plan_id: { type: string, format: uuid, description: Snapshot of the plan this invoice bills for }
 *                         amount_due: { type: number }
 *                         status: { type: string, example: Pending }
 *                 error: { type: 'null' }
 *       403:
 *         description: Role not permitted (STAFF_ROLES only)
 */
membershipsRouter.post(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(createMembershipSchema),
  asyncHandler(membershipsController.createMembership)
);

/**
 * @openapi
 * /memberships/{id}:
 *   get:
 *     tags: [Memberships]
 *     summary: Get a Membership
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Membership details
 *       403:
 *         description: Role not permitted (VIEW_MEMBERSHIP_ROLES only)
 *       404:
 *         description: Membership not found
 */
membershipsRouter.get(
  '/:id',
  authenticate,
  authorize(...VIEW_MEMBERSHIP_ROLES),
  asyncHandler(membershipsController.getMembership)
);

/**
 * @openapi
 * /memberships/{id}/renew:
 *   post:
 *     tags: [Memberships]
 *     summary: Renew a Membership (creates a new Pending Invoice only)
 *     description: >
 *       Does NOT activate anything or change dates — mirrors
 *       POST /memberships. membership_plan_id is optional: omit to
 *       renew into the same plan, or provide a different plan id to
 *       upgrade/downgrade. The chosen plan is snapshotted on the new
 *       Invoice; Membership.membership_plan_id is only updated once
 *       payment succeeds (see Payments module), never at renewal
 *       request time.
 *     security:
 *       - bearerAuth: []
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
 *               membership_plan_id: { type: string, format: uuid, description: Optional — omit to renew into the current plan }
 *     responses:
 *       201:
 *         description: New Pending Invoice for the renewal
 *       403:
 *         description: Role not permitted (STAFF_ROLES only)
 *       409:
 *         description: A Pending renewal invoice already exists for this membership
 */
membershipsRouter.post(
  '/:id/renew',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(renewMembershipSchema),
  asyncHandler(membershipsController.renewMembership)
);

/**
 * @openapi
 * /memberships/{id}/suspend:
 *   post:
 *     tags: [Memberships]
 *     summary: Suspend an Active Membership
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
 *             required: [suspended_reason]
 *             properties:
 *               suspended_reason: { type: string }
 *     responses:
 *       200:
 *         description: Membership suspended
 *       403:
 *         description: Role not permitted (ADMIN_ROLES only)
 *       409:
 *         description: Only an Active membership can be suspended
 */
membershipsRouter.post(
  '/:id/suspend',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(suspendMembershipSchema),
  asyncHandler(membershipsController.suspendMembership)
);

// --- /api/v1/members/:id/membership-history ----------------------------------
// Nested under the Members prefix since it reads as "this member's
// history," mounted separately in app.js alongside members.routes.js.
const historyRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/membership-history:
 *   get:
 *     tags: [Memberships]
 *     summary: Get a Member's full Membership history
 *     description: >
 *       Nested under /members rather than /memberships — mounted as its
 *       own router (historyRouter) alongside members.routes.js in app.js.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: >
 *           Array of MembershipHistory rows (InitialActivation, Renewal,
 *           etc. — see event_type), each recording the plan and period
 *           dates that applied at that point in time
 *       403:
 *         description: Role not permitted (HISTORY_ROLES only)
 */
historyRouter.get(
  '/:memberId/membership-history',
  authenticate,
  authorize(...HISTORY_ROLES),
  asyncHandler(membershipsController.getMembershipHistory)
);

module.exports = { plansRouter, membershipsRouter, historyRouter };
