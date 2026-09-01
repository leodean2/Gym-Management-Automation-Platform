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

/**
 * @openapi
 * tags:
 *   name: Inquiries
 *   description: Public contact form and staff lead-tracking workflow
 */

/**
 * @openapi
 * /inquiries:
 *   post:
 *     tags: [Inquiries]
 *     summary: Submit a public inquiry
 *     description: >
 *       The system's ONE fully unauthenticated endpoint — no
 *       Authorization header accepted. Rate-limited separately from the
 *       general API limit. Returns only a minimal confirmation, not the
 *       full inquiry object.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, email, phone_number, message]
 *             properties:
 *               full_name: { type: string }
 *               email: { type: string, format: email }
 *               phone_number: { type: string }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Inquiry submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     status: { type: string, example: New }
 *                     created_at: { type: string, format: date-time }
 *       429: { description: Rate limit exceeded }
 */
router.post(
  '/',
  inquiryLimiter,
  validate(submitInquirySchema),
  asyncHandler(inquiriesController.submitInquiry)
);

/**
 * @openapi
 * /inquiries:
 *   get:
 *     tags: [Inquiries]
 *     summary: List / search Inquiries
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [New, Contacted, Closed] }
 *       - in: query
 *         name: outcome
 *         schema: { type: string, enum: [Joined, NotInterested] }
 *       - in: query
 *         name: search
 *         schema: { type: string, description: Matches name/email/phone }
 *     responses:
 *       200: { description: Paginated list }
 *       403: { description: Role not permitted (STAFF_ROLES only) }
 */
router.get(
  '/',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(listInquiriesQuerySchema, 'query'),
  asyncHandler(inquiriesController.listInquiries)
);

/**
 * @openapi
 * /inquiries/{id}:
 *   get:
 *     tags: [Inquiries]
 *     summary: Get an Inquiry (with linked member and note count)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Inquiry detail }
 */
router.get(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  asyncHandler(inquiriesController.getInquiry)
);

/**
 * @openapi
 * /inquiries/{id}:
 *   patch:
 *     tags: [Inquiries]
 *     summary: Update Inquiry status and/or outcome
 *     description: >
 *       outcome is required when the resulting status is Closed, and
 *       rejected if supplied while the resulting status isn't Closed.
 *       An already-Closed inquiry's outcome may still be corrected by
 *       sending outcome alone (no status field). Status may never move
 *       backward from Closed.
 *     security: [{ bearerAuth: [] }]
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
 *               status: { type: string, enum: [New, Contacted, Closed] }
 *               outcome: { type: string, enum: [Joined, NotInterested] }
 *     responses:
 *       200: { description: Updated Inquiry }
 *       400: { description: OUTCOME_REQUIRES_CLOSED_STATUS or OUTCOME_NOT_ALLOWED }
 *       409: { description: CANNOT_REOPEN_CLOSED_INQUIRY }
 */
router.patch(
  '/:id',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(updateInquirySchema),
  asyncHandler(inquiriesController.updateInquiry)
);

/**
 * @openapi
 * /inquiries/{id}/follow-up-notes:
 *   post:
 *     tags: [Inquiries]
 *     summary: Add a follow-up note (append-only)
 *     description: created_by is derived from the authenticated requester, never accepted from the body.
 *     security: [{ bearerAuth: [] }]
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
 *             required: [note]
 *             properties:
 *               note: { type: string }
 *     responses:
 *       201: { description: Follow-up note created }
 */
router.post(
  '/:id/follow-up-notes',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(addFollowUpNoteSchema),
  asyncHandler(inquiriesController.addFollowUpNote)
);

/**
 * @openapi
 * /inquiries/{id}/follow-up-notes:
 *   get:
 *     tags: [Inquiries]
 *     summary: Get an Inquiry's follow-up notes
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of notes, chronological, with author and timestamp }
 */
router.get(
  '/:id/follow-up-notes',
  authenticate,
  authorize(...STAFF_ROLES),
  asyncHandler(inquiriesController.getFollowUpNotes)
);

/**
 * @openapi
 * /inquiries/{id}/link-member:
 *   post:
 *     tags: [Inquiries]
 *     summary: Link a closed Inquiry to a Member record
 *     description: >
 *       Purely referential — never modifies the Member record. The
 *       inquiry must already be status Closed.
 *     security: [{ bearerAuth: [] }]
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
 *             required: [member_id]
 *             properties:
 *               member_id: { type: string, format: uuid }
 *     responses:
 *       201: { description: Inquiry linked to member }
 *       409: { description: INQUIRY_NOT_CLOSED }
 */
router.post(
  '/:id/link-member',
  authenticate,
  authorize(...STAFF_ROLES),
  validate(linkMemberSchema),
  asyncHandler(inquiriesController.linkMember)
);

module.exports = router;