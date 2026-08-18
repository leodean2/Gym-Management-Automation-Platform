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

plansRouter.post(
  '/',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(createMembershipPlanSchema),
  asyncHandler(membershipsController.createPlan)
);

plansRouter.get(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(listPlansQuerySchema, 'query'),
  asyncHandler(membershipsController.listPlans)
);

plansRouter.patch(
  '/:id',
  authenticate,
  authorize(...ADMIN_ROLES),
  validate(updateMembershipPlanSchema),
  asyncHandler(membershipsController.updatePlan)
);

// --- /api/v1/memberships -----------------------------------------------------
const membershipsRouter = express.Router();

membershipsRouter.post(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(createMembershipSchema),
  asyncHandler(membershipsController.createMembership)
);

membershipsRouter.get(
  '/:id',
  authenticate,
  authorize(...VIEW_MEMBERSHIP_ROLES),
  asyncHandler(membershipsController.getMembership)
);

membershipsRouter.post(
  '/:id/renew',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(renewMembershipSchema),
  asyncHandler(membershipsController.renewMembership)
);

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

historyRouter.get(
  '/:memberId/membership-history',
  authenticate,
  authorize(...HISTORY_ROLES),
  asyncHandler(membershipsController.getMembershipHistory)
);

module.exports = { plansRouter, membershipsRouter, historyRouter };
