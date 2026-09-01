const paymentsRepository = require('./payments.repository');
const membershipsService = require('../memberships/memberships.service');
const AppError = require('../../lib/AppError');

// Feature 11 — Payment & Invoice Management
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.
//
// This module never calculates membership dates itself — see
// activateMembershipFromPayment's call below. That logic exists in
// exactly one place, memberships.service.js.

// --- Receipt numbering -------------------------------------------------

/**
 * Mirrors memberships.service.js's generateInvoiceNumber exactly — same
 * collision-retry approach, same year-scoped sequence pattern.
 */
async function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const existingCount = await paymentsRepository.countReceiptsCreatedBetween(yearStart, yearEnd);
  const sequence = existingCount + 1;
  return `RCT-${year}-${String(sequence).padStart(6, '0')}`;
}

/**
 * Same generator/sequence as memberships.service.js's
 * generateInvoiceNumber (INV-<year>-<sequence>, collision-retry) —
 * intentionally duplicated here rather than imported across module
 * service boundaries, since payments.service.js only ever reaches into
 * Memberships through its one explicit export
 * (activateMembershipFromPayment), never its internals. Both read the
 * same underlying invoices table via each module's own
 * countInvoicesCreatedBetween, so the sequence stays globally correct
 * regardless of which module's generator created any given number.
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const existingCount = await paymentsRepository.countInvoicesCreatedBetween(yearStart, yearEnd);
  const sequence = existingCount + 1;
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}

// --- Invoice (view only — creation belongs to Memberships) ------------------

async function getInvoice(invoiceId, requester) {
  const invoice = await paymentsRepository.findInvoiceById(invoiceId);
  if (!invoice) {
    throw AppError.notFound('Invoice not found');
  }

  if (requester.role === 'Member' && invoice.membership.member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own invoices');
  }

  return invoice;
}

/**
 * Member is deliberately excluded from this endpoint's role set
 * entirely per the frozen Role Summary — a Member views their own
 * invoices only via getInvoice(:id) or getMemberPaymentHistory, never
 * this general list/search, same "list excludes Member, single-record
 * view includes Member" split used in Feature 8.
 */
async function listInvoices(query) {
  const where = paymentsRepository.buildInvoiceWhere({
    status: query.status,
    member_id: query.member_id,
    from: query.from,
    to: query.to,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await paymentsRepository.findInvoices({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Record Payment (FR-11.2) -----------------------------------------------

/**
 * "Invoice must exist and be Pending or Overdue — reject if Voided or
 * Cancelled." / "amount_paid must equal amount_due exactly." Payment +
 * invoice-paid + receipt all commit atomically via
 * recordPaymentWithReceipt; membership activation is a SEPARATE call
 * made only after that transaction succeeds — the primary financial
 * transaction and the derived membership-state change are two distinct
 * operations, same "commit primary, derived consequence follows"
 * boundary applied to Feature 8's PR updates, except here activation
 * failure is NOT swallowed (unlike Feature 8) — an invoice that's Paid
 * with no resulting Active membership is a serious enough inconsistency
 * that it should surface as an error, not fail silently in the
 * background. This is a deliberate difference from Feature 8: PRs are a
 * rebuildable projection; membership activation is not.
 */
async function recordPayment(invoiceId, input, actingUser) {
  const invoice = await paymentsRepository.findInvoiceById(invoiceId);
  if (!invoice) {
    throw AppError.notFound('Invoice not found');
  }
  if (!['Pending', 'Overdue'].includes(invoice.status)) {
    throw AppError.conflict(
      'INVOICE_NOT_PAYABLE',
      `An invoice with status ${invoice.status} cannot be paid`
    );
  }
  if (Number(input.amount_paid) !== Number(invoice.amount_due)) {
    throw AppError.badRequest(
      'AMOUNT_MISMATCH',
      `amount_paid (${input.amount_paid}) must equal amount_due (${invoice.amount_due}) exactly`
    );
  }

  let lastError;
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    const receiptNumber = await generateReceiptNumber();
    try {
      result = await paymentsRepository.recordPaymentWithReceipt({
        invoiceId,
        paymentData: {
          invoice_id: invoiceId,
          amount_paid: input.amount_paid,
          payment_method: input.payment_method,
          transaction_reference: input.transaction_reference,
          status: 'Successful',
          recorded_by: actingUser.id,
          payment_date: new Date(),
        },
        receiptData: {
          receipt_number: receiptNumber,
          status: 'Issued',
          issued_at: new Date(),
        },
      });
      break;
    } catch (err) {
      if (err.code === 'P2002') {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  if (!result) {
    throw lastError;
  }

  const membership = await membershipsService.activateMembershipFromPayment({
    invoiceId,
    actingUser,
  });

  return {
    payment_transaction: result.payment,
    receipt: result.receipt,
    membership,
  };
}

// --- Payment Transaction / Receipt (view only) ------------------------------

async function getPaymentTransaction(paymentId, requester) {
  const payment = await paymentsRepository.findPaymentTransactionById(paymentId);
  if (!payment) {
    throw AppError.notFound('Payment transaction not found');
  }

  if (requester.role === 'Member' && payment.invoice.membership.member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own payment transactions');
  }

  return payment;
}

async function getReceipt(receiptId, requester) {
  const receipt = await paymentsRepository.findReceiptById(receiptId);
  if (!receipt) {
    throw AppError.notFound('Receipt not found');
  }

  if (
    requester.role === 'Member' &&
    receipt.payment_transaction.invoice.membership.member.user_id !== requester.id
  ) {
    throw AppError.forbidden('You may only view your own receipts');
  }

  return receipt;
}

// --- Correct Payment (FR-11.11) ---------------------------------------------

/**
 * GymOwner/SuperAdmin only, enforced at the route — no additional
 * per-request ownership scoping needed here (unlike Member-facing view
 * endpoints), since this is already the most-restricted role set in the
 * module. Does NOT touch Membership/MembershipHistory — a correction to
 * the amount doesn't retroactively change when the membership was
 * activated, per the frozen design's explicit note.
 */
async function correctPayment(paymentId, input) {
  const payment = await paymentsRepository.findPaymentTransactionById(paymentId);
  if (!payment) {
    throw AppError.notFound('Payment transaction not found');
  }
  if (payment.status !== 'Successful') {
    throw AppError.conflict(
      'PAYMENT_NOT_CORRECTABLE',
      `A payment with status ${payment.status} cannot be corrected`
    );
  }

  const originalReceipt = await paymentsRepository.findReceiptByPaymentId(paymentId);
  if (!originalReceipt) {
    throw AppError.conflict('RECEIPT_MISSING', 'No receipt exists for this payment to correct alongside it');
  }

  let lastError;
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    const receiptNumber = await generateReceiptNumber();
    try {
      result = await paymentsRepository.correctPaymentWithReceipt({
        originalPaymentId: paymentId,
        paymentVoidReason: input.correction_reason,
        newPaymentData: {
          invoice_id: payment.invoice_id,
          amount_paid: input.amount_paid,
          payment_method: input.payment_method,
          transaction_reference: input.transaction_reference,
          status: 'Successful',
          recorded_by: payment.recorded_by,
          replaces_payment_id: paymentId,
          payment_date: payment.payment_date,
        },
        originalReceiptId: originalReceipt.id,
        receiptVoidReason: input.correction_reason,
        newReceiptData: {
          receipt_number: receiptNumber,
          status: 'Issued',
          replaces_receipt_id: originalReceipt.id,
          issued_at: new Date(),
        },
      });
      break;
    } catch (err) {
      if (err.code === 'P2002') {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  if (!result) {
    throw lastError;
  }

  return {
    voided_payment: result.voidedPayment,
    payment_transaction: result.newPayment,
    receipt: result.newReceipt,
  };
}

// --- Correct Invoice (unpaid only) ------------------------------------------

/**
 * Uses the normal invoice-numbering sequence — no special "corrected"
 * format or prefix. The fact that this invoice is a correction is
 * expressed entirely through the relationship (replaces_invoice_id),
 * not the number itself: invoice numbers are a unique sequential
 * business identifier, and mixing correction semantics into that
 * identifier creates parsing assumptions, sorting inconsistencies, and
 * a second numbering scheme to maintain, none of which the accounting
 * side of this system should have to deal with.
 */
async function correctInvoice(invoiceId, input, actingUser) {
  const invoice = await paymentsRepository.findInvoiceById(invoiceId);
  if (!invoice) {
    throw AppError.notFound('Invoice not found');
  }
  if (!['Pending', 'Overdue'].includes(invoice.status)) {
    throw AppError.conflict(
      'INVOICE_NOT_CORRECTABLE',
      `An invoice with status ${invoice.status} cannot be corrected — correct the payment instead if it has already been paid`
    );
  }

  let lastError;
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    const invoiceNumber = await generateInvoiceNumber();
    try {
      result = await paymentsRepository.correctInvoice({
        originalInvoiceId: invoiceId,
        voidReason: input.correction_reason,
        newInvoiceData: {
          membership_id: invoice.membership_id,
          membership_plan_id: invoice.membership_plan_id,
          invoice_number: invoiceNumber,
          amount_due: input.amount_due,
          due_date: input.due_date,
          issued_by: actingUser.id,
          replaces_invoice_id: invoiceId,
        },
      });
      break;
    } catch (err) {
      if (err.code === 'P2002') {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  if (!result) {
    throw lastError;
  }

  return { voided_invoice: result.voided, invoice: result.replacement };
}

// --- Member Payment History -------------------------------------------------

async function getMemberPaymentHistory(memberId, requester) {
  const member = await paymentsRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (requester.role === 'Member' && member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own payment history');
  }

  return paymentsRepository.findPaymentHistoryForMember(memberId);
}

module.exports = {
  getInvoice,
  listInvoices,
  recordPayment,
  getPaymentTransaction,
  getReceipt,
  correctPayment,
  correctInvoice,
  getMemberPaymentHistory,
};