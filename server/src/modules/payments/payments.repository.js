const prisma = require('../../config/db');

/**
 * Payments repository — ONLY database access lives here. No
 * authorization, no business rules. Invoice CREATE/UPDATE (beyond status
 * transitions this module owns — Paid, Voided via correction) belongs to
 * Memberships; this module only ever reads invoices and writes
 * Payment/Receipt-side state plus the narrow invoice-status transitions
 * that are genuinely this module's responsibility.
 */

// --- Helpers needed for authorization/scoping in the service ---------------

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

function findMemberByUserId(userId) {
  return prisma.member.findUnique({ where: { user_id: userId } });
}

// --- Invoice (read + narrow status transitions only) ------------------------

function findInvoiceById(id) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { membership: { include: { member: { select: { user_id: true } } } } },
  });
}

function buildInvoiceWhere({ status, member_id, from, to }) {
  const where = {};
  const and = [];

  if (status) and.push({ status });
  if (member_id) and.push({ membership: { member_id } });
  if (from || to) {
    const createdAt = {};
    if (from) createdAt.gte = from;
    if (to) createdAt.lte = to;
    and.push({ created_at: createdAt });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

async function findInvoices({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total };
}

function markInvoicePaid(id) {
  return prisma.invoice.update({ where: { id }, data: { status: 'Paid' } });
}

/**
 * Backs "Correct Invoice" — void-and-reissue via replaces_invoice_id,
 * same chain pattern as PaymentTransaction/Receipt corrections below.
 * Both writes happen atomically so an invoice is never left voided with
 * no replacement, or vice versa.
 */
function correctInvoice({ originalInvoiceId, voidReason, newInvoiceData }) {
  return prisma.$transaction(async (tx) => {
    const voided = await tx.invoice.update({
      where: { id: originalInvoiceId },
      data: { status: 'Voided', void_reason: voidReason },
    });

    const replacement = await tx.invoice.create({ data: newInvoiceData });

    return { voided, replacement };
  });
}

function countInvoicesCreatedBetween(start, end) {
  return prisma.invoice.count({ where: { created_at: { gte: start, lt: end } } });
}

// --- Payment Transaction ----------------------------------------------------

function findPaymentTransactionById(id) {
  return prisma.paymentTransaction.findUnique({
    where: { id },
    include: {
      invoice: { include: { membership: { include: { member: { select: { user_id: true } } } } } },
    },
  });
}

function countPaymentsCreatedBetween(start, end) {
  return prisma.paymentTransaction.count({ where: { created_at: { gte: start, lt: end } } });
}

/**
 * "A successful payment ALWAYS has exactly one receipt" — Invoice ->
 * Paid, PaymentTransaction created, Receipt created, all in one
 * transaction. If receipt creation fails (e.g. a receipt_number
 * collision), the whole operation rolls back — nothing is left
 * half-recorded. paymentData and receiptData are fully assembled by the
 * service before this is called; this function only executes the writes.
 */
function recordPaymentWithReceipt({ invoiceId, paymentData, receiptData }) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: 'Paid' },
    });

    const payment = await tx.paymentTransaction.create({ data: paymentData });

    const receipt = await tx.receipt.create({
      data: { ...receiptData, payment_transaction_id: payment.id },
    });

    return { invoice, payment, receipt };
  });
}

/**
 * "Correct Payment" — original PaymentTransaction -> Voided, original
 * Receipt -> Voided, a new PaymentTransaction created
 * (replaces_payment_id chained), a new Receipt created for it
 * (replaces_receipt_id chained), all atomically. Deliberately does NOT
 * touch Invoice or Membership/MembershipHistory — the invoice stays Paid
 * (only the payment record itself is being corrected, not un-paid), and
 * activation already happened correctly the first time.
 */
function correctPaymentWithReceipt({
  originalPaymentId,
  paymentVoidReason,
  newPaymentData,
  originalReceiptId,
  receiptVoidReason,
  newReceiptData,
}) {
  return prisma.$transaction(async (tx) => {
    const voidedPayment = await tx.paymentTransaction.update({
      where: { id: originalPaymentId },
      data: { status: 'Voided', void_reason: paymentVoidReason },
    });

    const voidedReceipt = await tx.receipt.update({
      where: { id: originalReceiptId },
      data: { status: 'Voided', void_reason: receiptVoidReason },
    });

    const newPayment = await tx.paymentTransaction.create({ data: newPaymentData });

    const newReceipt = await tx.receipt.create({
      data: { ...newReceiptData, payment_transaction_id: newPayment.id },
    });

    return { voidedPayment, voidedReceipt, newPayment, newReceipt };
  });
}

// --- Receipt -----------------------------------------------------------

function findReceiptById(id) {
  return prisma.receipt.findUnique({
    where: { id },
    include: {
      payment_transaction: {
        include: {
          invoice: { include: { membership: { include: { member: { select: { user_id: true } } } } } },
        },
      },
    },
  });
}

function findReceiptByPaymentId(paymentTransactionId) {
  return prisma.receipt.findUnique({ where: { payment_transaction_id: paymentTransactionId } });
}

function countReceiptsCreatedBetween(start, end) {
  return prisma.receipt.count({ where: { created_at: { gte: start, lt: end } } });
}

// --- Member Payment History (FR-11.8-style, mirrors membership history) ----

/**
 * Returns the member's invoices with their payment + receipt nested one
 * level in a single query, chronological — "invoices, payments, and
 * receipts together" per the frozen design, without three separate
 * round trips the service would otherwise have to stitch together.
 */
function findPaymentHistoryForMember(memberId) {
  return prisma.invoice.findMany({
    where: { membership: { member_id: memberId } },
    include: { payment_transaction: { include: { receipt: true } } },
    orderBy: { created_at: 'desc' },
  });
}

module.exports = {
  findMemberById,
  findMemberByUserId,
  findInvoiceById,
  buildInvoiceWhere,
  findInvoices,
  markInvoicePaid,
  correctInvoice,
  countInvoicesCreatedBetween,
  findPaymentTransactionById,
  countPaymentsCreatedBetween,
  recordPaymentWithReceipt,
  correctPaymentWithReceipt,
  findReceiptById,
  findReceiptByPaymentId,
  countReceiptsCreatedBetween,
  findPaymentHistoryForMember,
};