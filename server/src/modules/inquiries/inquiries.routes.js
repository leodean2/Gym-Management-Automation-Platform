const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const { inquiryLimiter } = require('../../middleware/rateLimiter');
const inquiriesController = require('./inquiries.controller');
const {
  submitInquirySchema,
  listInquiriesQuerySchema,
  updateInquirySchema,
  addFollowUpNoteSchema,
  linkMemberSchema,
} = require('./inquiries.validation');
const { STAFF_ROLES } = require('./inquiries.constants');

// Feature 14 — Contact & Inquiry Management
//
// POST / is the system's ONLY unauthenticated route in the entire API —
// no authenticate, no authorize, just inquiryLimiter (NFR-S3) in place
// of the general rate limiter every other route gets. Every other route
// below requires authenticate + authorize(...STAFF_ROLES), with zero
// per-request scoping — this module's Role Summary table has no "own
// only" row anywhere, unlike almost every other module in this codebase.

const router = express.Router();

router.post(
  '/',
  inquiryLimiter,
  validate(submitInquirySchema),
  asyncHandler(inquiriesController.submitInquiry)
);

router.get(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(listInquiriesQuerySchema, 'query'),
  asyncHandler(inquiriesController.listInquiries)
);

router.get(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  asyncHandler(inquiriesController.getInquiry)
);

router.patch(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(updateInquirySchema),
  asyncHandler(inquiriesController.updateInquiry)
);

router.post(
  '/:id/follow-up-notes',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(addFollowUpNoteSchema),
  asyncHandler(inquiriesController.addFollowUpNote)
);

router.get(
  '/:id/follow-up-notes',
  authenticate,
  authorize(...STAFF_ROLES),
  asyncHandler(inquiriesController.getFollowUpNotes)
);

router.post(
  '/:id/link-member',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(linkMemberSchema),
  asyncHandler(inquiriesController.linkMember)
);

module.exports = router;