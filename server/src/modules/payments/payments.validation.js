const { z } = require('zod');

// Feature 11 — Payment & Invoice Management
// Zod schemas for this module's request bodies/queries. No invoice
// CREATE schema exists here at all — invoice creation belongs to
// Memberships (createInvoiceForMembership), never this module.

const PAYMENT_METHOD = z.enum(['Cash', 'MPesa', 'Card']);
const INVOICE_STATUS = z.enum(['Pending', 'Paid', 'Overdue', 'Voided', 'Cancelled']);

// GET /invoices — filters by status, member_id, and a created_at date
// range, per the frozen design.
const listInvoicesQuerySchema = z
  .object({
    status: INVOICE_STATUS.optional(),
    member_id: z.string().uuid().optional(),
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

// POST /invoices/:id/pay — amount_paid must equal Invoice.amount_due
// exactly (no partial payments, per the frozen "out of scope for v1"
// decision), but that comparison requires loading the invoice first, so
// it lives in the service, not here. Zod only confirms amount_paid is a
// sane positive number on its own.
const recordPaymentSchema = z
  .object({
    amount_paid: z.coerce.number().positive(),
    payment_method: PAYMENT_METHOD,
    transaction_reference: z.string().min(1).max(100).optional(),
  })
  .strict();

// POST /payment-transactions/:id/correct — void-and-reissue; every field
// is required since a correction is a full replacement payment, not a
// partial patch (unlike, say, Feature 6's updateAssignmentSchema, which
// only ever touched a couple of non-structural fields).
const correctPaymentSchema = z
  .object({
    amount_paid: z.coerce.number().positive(),
    payment_method: PAYMENT_METHOD,
    transaction_reference: z.string().min(1).max(100).optional(),
    correction_reason: z.string().min(1).max(500),
  })
  .strict();

// POST /invoices/:id/correct — void-and-reissue for an unpaid invoice.
// amount_due and due_date are both required for the same "full
// replacement" reasoning as correctPaymentSchema above.
const correctInvoiceSchema = z
  .object({
    amount_due: z.coerce.number().positive(),
    due_date: z.coerce.date(),
    correction_reason: z.string().min(1).max(500),
  })
  .strict();

module.exports = {
  listInvoicesQuerySchema,
  recordPaymentSchema,
  correctPaymentSchema,
  correctInvoiceSchema,
};