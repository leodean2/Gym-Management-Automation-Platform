const express = require('express');
const asyncHandler = require('../../lib/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const paymentsController = require('./payments.controller');
const {
  listInvoicesQuerySchema,
  recordPaymentSchema,
  correctPaymentSchema,
  correctInvoiceSchema,
} = require('./payments.validation');
const {
  INVOICE_VIEW_ROLES,
  INVOICE_LIST_ROLES,
  PAYMENT_RECORD_ROLES,
  PAYMENT_VIEW_ROLES,
  RECEIPT_VIEW_ROLES,
  CORRECTION_ROLES,
  PAYMENT_HISTORY_VIEW_ROLES,
} = require('./payments.constants');

// Feature 11 — Payment & Invoice Management
//
// This module owns three distinct URL prefixes (/invoices,
// /payment-transactions, /receipts), plus one nested route under
// /members — so it exports four routers. See app.js for how each is
// mounted. No POST /invoices route exists anywhere here — invoice
// creation belongs to Memberships.

// --- /api/v1/invoices ----------------------------------------------------

/**
 * @openapi
 * tags:
 *   name: Payments
 *   description: Invoices, Payment Transactions, Receipts, and corrections
 */

const invoicesRouter = express.Router();

/**
 * @openapi
 * /invoices:
 *   get:
 *     tags: [Payments]
 *     summary: List / search Invoices
 *     description: Invoice creation belongs to the Memberships module — no POST route exists here.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pending, Paid, Overdue, Voided, Cancelled] }
 *       - in: query
 *         name: member_id
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Paginated list }
 */
invoicesRouter.get(
  '/',
  authenticate,
  authorize(...INVOICE_LIST_ROLES),
  validate(listInvoicesQuerySchema, 'query'),
  asyncHandler(paymentsController.listInvoices)
);

/**
 * @openapi
 * /invoices/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get an Invoice
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Invoice detail }
 */
invoicesRouter.get(
  '/:id',
  authenticate,
  authorize(...INVOICE_VIEW_ROLES),
  asyncHandler(paymentsController.getInvoice)
);

/**
 * @openapi
 * /invoices/{id}/pay:
 *   post:
 *     tags: [Payments]
 *     summary: Record a Payment against an Invoice
 *     description: >
 *       amount_paid must equal amount_due exactly (no partial payments
 *       in v1). Success triggers membership activation as an atomic
 *       side effect — see Memberships module's activateMembershipFromPayment.
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
 *             required: [amount_paid, payment_method]
 *             properties:
 *               amount_paid: { type: number }
 *               payment_method: { type: string, enum: [Cash, MPesa, Card] }
 *               transaction_reference: { type: string }
 *     responses:
 *       201:
 *         description: Payment recorded — returns the PaymentTransaction, Receipt, and updated (Active) Membership together
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_transaction: { type: object }
 *                     receipt: { type: object }
 *                     membership: { type: object }
 *       400: { description: AMOUNT_MISMATCH }
 *       409: { description: INVOICE_NOT_PAYABLE }
 */
invoicesRouter.post(
  '/:id/pay',
  authenticate,
  authorize(...PAYMENT_RECORD_ROLES),
  validate(recordPaymentSchema),
  asyncHandler(paymentsController.recordPayment)
);

/**
 * @openapi
 * /invoices/{id}/correct:
 *   post:
 *     tags: [Payments]
 *     summary: Correct an unpaid Invoice (void-and-reissue)
 *     description: GymOwner/SuperAdmin only. Only callable on Pending/Overdue invoices — use the payment-transactions correct endpoint for a Paid invoice.
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
 *             required: [amount_due, due_date, correction_reason]
 *             properties:
 *               amount_due: { type: number }
 *               due_date: { type: string, format: date }
 *               correction_reason: { type: string }
 *     responses:
 *       201: { description: Original invoice voided; new invoice created with replaces_invoice_id chained }
 *       409: { description: Invoice is Paid/Voided/Cancelled and cannot be corrected this way }
 */
// POST /invoices/:id/correct — GymOwner/SuperAdmin only, deliberately
// more restricted than /pay per the frozen "only the Gym Owner may
// perform financial corrections" decision.
invoicesRouter.post(
  '/:id/correct',
  authenticate,
  authorize(...CORRECTION_ROLES),
  validate(correctInvoiceSchema),
  asyncHandler(paymentsController.correctInvoice)
);

// --- /api/v1/payment-transactions -------------------------------------------
const paymentTransactionsRouter = express.Router();

/**
 * @openapi
 * /payment-transactions/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a Payment Transaction
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Payment transaction detail }
 */
paymentTransactionsRouter.get(
  '/:id',
  authenticate,
  authorize(...PAYMENT_VIEW_ROLES),
  asyncHandler(paymentsController.getPaymentTransaction)
);

/**
 * @openapi
 * /payment-transactions/{id}/correct:
 *   post:
 *     tags: [Payments]
 *     summary: Correct a Payment (void-and-reissue payment + receipt together)
 *     description: >
 *       GymOwner/SuperAdmin only. Does NOT touch Membership/
 *       MembershipHistory — activation already happened correctly the
 *       first time. Original payment and receipt are both voided;
 *       new payment and receipt are created, chained via
 *       replaces_payment_id/replaces_receipt_id.
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
 *             required: [amount_paid, payment_method, correction_reason]
 *             properties:
 *               amount_paid: { type: number }
 *               payment_method: { type: string, enum: [Cash, MPesa, Card] }
 *               transaction_reference: { type: string }
 *               correction_reason: { type: string }
 *     responses:
 *       201: { description: Corrected payment and receipt }
 *       409: { description: Payment is not Successful (already Voided) }
 */
paymentTransactionsRouter.post(
  '/:id/correct',
  authenticate,
  authorize(...CORRECTION_ROLES),
  validate(correctPaymentSchema),
  asyncHandler(paymentsController.correctPayment)
);

// --- /api/v1/receipts ------------------------------------------------------
const receiptsRouter = express.Router();

/**
 * @openapi
 * /receipts/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a Receipt
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Receipt detail }
 */
receiptsRouter.get(
  '/:id',
  authenticate,
  authorize(...RECEIPT_VIEW_ROLES),
  asyncHandler(paymentsController.getReceipt)
);

// --- /api/v1/members/:memberId/payment-history ------------------------------
// Nested under the Members prefix, same convention as every other
// module's member-scoped history route (membership-history,
// attendance, trainer-history, nutrition-plan, workout-program-assignments).
const paymentHistoryRouter = express.Router();

/**
 * @openapi
 * /members/{memberId}/payment-history:
 *   get:
 *     tags: [Payments]
 *     summary: Get a Member's full payment history
 *     description: Returns invoices with their payment and receipt nested, chronological.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of invoices with nested payment/receipt }
 */
paymentHistoryRouter.get(
  '/:memberId/payment-history',
  authenticate,
  authorize(...PAYMENT_HISTORY_VIEW_ROLES),
  asyncHandler(paymentsController.getMemberPaymentHistory)
);

module.exports = {
  invoicesRouter,
  paymentTransactionsRouter,
  receiptsRouter,
  paymentHistoryRouter,
};