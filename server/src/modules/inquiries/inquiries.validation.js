const { z } = require('zod');

// Feature 14 — Contact & Inquiry Management
// Zod schemas for this module's request bodies/queries.

const INQUIRY_STATUS = z.enum(['New', 'Contacted', 'Closed']);
const INQUIRY_OUTCOME = z.enum(['Joined', 'NotInterested']);

// POST /inquiries — the system's only unauthenticated endpoint.
// phone_number is required (matches Inquiry.phone_number NOT NULL in the
// frozen schema — deliberately not left optional, per the doc's explicit
// warning not to let this drift back). subject is the only optional
// field. status/outcome are never accepted here — every new inquiry
// starts at the schema's own default (New), never client-supplied.
const submitInquirySchema = z
  .object({
    full_name: z.string().min(1).max(150),
    email: z.string().email(),
    phone_number: z.string().min(1).max(30),
    subject: z.string().max(150).optional(),
    message: z.string().min(1).max(2000),
  })
  .strict();

// GET /inquiries — filters by status, outcome, a free-text search
// (matches name/email/phone per the frozen design), and a created_at
// date range.
const listInquiriesQuerySchema = z
  .object({
    status: INQUIRY_STATUS.optional(),
    outcome: INQUIRY_OUTCOME.optional(),
    search: z.string().min(1).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

// PATCH /inquiries/:id — status and outcome are genuinely separate
// fields, per the frozen design's deliberate ER-phase decision (future
// outcomes can be added without touching the status lifecycle). The
// "outcome required when status=Closed / rejected otherwise" and
// "cannot reopen from Closed" rules both require reading the inquiry's
// CURRENT status first, so they live in the service, not here — this
// schema only confirms shape, not the conditional business rule.
const updateInquirySchema = z
  .object({
    status: INQUIRY_STATUS.optional(),
    outcome: INQUIRY_OUTCOME.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// POST /inquiries/:id/follow-up-notes — append-only, no update/delete
// schema exists anywhere in this module for notes. created_by is never
// accepted here — derived from the authenticated requester in the
// service.
const addFollowUpNoteSchema = z
  .object({
    note: z.string().min(1).max(2000),
  })
  .strict();

// POST /inquiries/:id/link-member
const linkMemberSchema = z
  .object({
    member_id: z.string().uuid(),
  })
  .strict();

module.exports = {
  submitInquirySchema,
  listInquiriesQuerySchema,
  updateInquirySchema,
  addFollowUpNoteSchema,
  linkMemberSchema,
};