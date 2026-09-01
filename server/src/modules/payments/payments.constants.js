/**
 * Feature 11 — Payment & Invoice Management
 * Role groups used by payments.routes.js, per the frozen Role Summary
 * table. Correction actions (payment + invoice) are deliberately more
 * restricted than recording a normal payment — Receptionist can record
 * payments but not correct them, per the documented "only the Gym Owner
 * [and SuperAdmin] may perform financial corrections" decision.
 */

const INVOICE_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Member'];
const INVOICE_LIST_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];
const PAYMENT_RECORD_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];
const PAYMENT_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Member'];
const RECEIPT_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Member'];
const CORRECTION_ROLES = ['GymOwner', 'SuperAdmin'];
const PAYMENT_HISTORY_VIEW_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin', 'Member'];

module.exports = {
  INVOICE_VIEW_ROLES,
  INVOICE_LIST_ROLES,
  PAYMENT_RECORD_ROLES,
  PAYMENT_VIEW_ROLES,
  RECEIPT_VIEW_ROLES,
  CORRECTION_ROLES,
  PAYMENT_HISTORY_VIEW_ROLES,
};