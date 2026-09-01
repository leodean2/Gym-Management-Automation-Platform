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
const invoicesRouter = express.Router();

invoicesRouter.get(
  '/',
  authenticate,
  authorize(...INVOICE_LIST_ROLES),
  validate(listInvoicesQuerySchema, 'query'),
  asyncHandler(paymentsController.listInvoices)
);

invoicesRouter.get(
  '/:id',
  authenticate,
  authorize(...INVOICE_VIEW_ROLES),
  asyncHandler(paymentsController.getInvoice)
);

invoicesRouter.post(
  '/:id/pay',
  authenticate,
  authorize(...PAYMENT_RECORD_ROLES),
  validate(recordPaymentSchema),
  asyncHandler(paymentsController.recordPayment)
);

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

paymentTransactionsRouter.get(
  '/:id',
  authenticate,
  authorize(...PAYMENT_VIEW_ROLES),
  asyncHandler(paymentsController.getPaymentTransaction)
);

paymentTransactionsRouter.post(
  '/:id/correct',
  authenticate,
  authorize(...CORRECTION_ROLES),
  validate(correctPaymentSchema),
  asyncHandler(paymentsController.correctPayment)
);

// --- /api/v1/receipts ------------------------------------------------------
const receiptsRouter = express.Router();

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