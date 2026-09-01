const paymentsService = require('./payments.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 11 — Payment & Invoice Management
// Thin by design: no Prisma, no permission checks, no business rules.
// No createInvoice controller function exists — invoice creation
// belongs to Memberships, never this module.

// --- Invoice -------------------------------------------------------------

async function getInvoice(req, res) {
  const result = await paymentsService.getInvoice(req.params.id, req.user);
  return ok(res, result);
}

async function listInvoices(req, res) {
  const result = await paymentsService.listInvoices(req.query);
  return ok(res, result);
}

// --- Record Payment --------------------------------------------------------

async function recordPayment(req, res) {
  const result = await paymentsService.recordPayment(req.params.id, req.body, req.user);
  return created(res, result);
}

// --- Payment Transaction / Receipt (view only) -------------------------------

async function getPaymentTransaction(req, res) {
  const result = await paymentsService.getPaymentTransaction(req.params.id, req.user);
  return ok(res, result);
}

async function getReceipt(req, res) {
  const result = await paymentsService.getReceipt(req.params.id, req.user);
  return ok(res, result);
}

// --- Corrections ---------------------------------------------------------

async function correctPayment(req, res) {
  const result = await paymentsService.correctPayment(req.params.id, req.body);
  return created(res, result);
}

async function correctInvoice(req, res) {
  const result = await paymentsService.correctInvoice(req.params.id, req.body, req.user);
  return created(res, result);
}

// --- Member Payment History ---------------------------------------------

async function getMemberPaymentHistory(req, res) {
  const result = await paymentsService.getMemberPaymentHistory(req.params.memberId, req.user);
  return ok(res, result);
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