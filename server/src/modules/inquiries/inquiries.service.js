const inquiriesRepository = require('./inquiries.repository');
const AppError = require('../../lib/AppError');

// Feature 14 — Contact & Inquiry Management
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here. No requester-based scoping
// appears anywhere below (unlike most other modules) — every non-
// submission endpoint shares one flat STAFF_ROLES role set with no
// per-request "own only" narrowing, matching this module's Role Summary
// table having zero variation across its rows.

// --- Submit Inquiry (FR-14.1) -----------------------------------------------

/**
 * The system's one unauthenticated write — no actingUser parameter at
 * all, since there IS no authenticated user for a public submission.
 * status defaults to New via the schema itself; never set explicitly
 * here.
 */
async function submitInquiry(input) {
  return inquiriesRepository.createInquiry({
    full_name: input.full_name,
    email: input.email,
    phone_number: input.phone_number,
    subject: input.subject,
    message: input.message,
  });
}

// --- View --------------------------------------------------------------

async function getInquiry(inquiryId) {
  const inquiry = await inquiriesRepository.findInquiryById(inquiryId);
  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }
  return inquiry;
}

async function listInquiries(query) {
  const where = inquiriesRepository.buildInquiryWhere({
    status: query.status,
    outcome: query.outcome,
    search: query.search,
    from: query.from,
    to: query.to,
  });
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await inquiriesRepository.findInquiries({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Update Status / Outcome (FR-14.3 / FR-14.4) ---------------------------

/**
 * Three conditional rules, all requiring the inquiry's CURRENT state to
 * evaluate, which is why none of this lives in Zod:
 *   1. status cannot move backward from Closed to New/Contacted — this
 *      check runs FIRST, so a request trying to reopen AND change
 *      outcome in the same PATCH is rejected for reopening, before the
 *      outcome rules below are ever evaluated.
 *   2. outcome required when the RESULTING status is Closed.
 *   3. Outcome is only valid when the inquiry's resulting status is
 *      Closed. This intentionally allows correcting the outcome on an
 *      already-Closed inquiry without requiring status: "Closed" to be
 *      sent again — resultingStatus falls back to the inquiry's
 *      existing status when this particular PATCH omits the status
 *      field entirely.
 */
async function updateInquiry(inquiryId, updates) {
  const inquiry = await inquiriesRepository.findInquiryById(inquiryId);
  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }

  if (inquiry.status === 'Closed' && updates.status && updates.status !== 'Closed') {
    throw AppError.conflict('CANNOT_REOPEN_CLOSED_INQUIRY', 'A closed inquiry cannot be reopened');
  }

  const resultingStatus = updates.status ?? inquiry.status;

  if (resultingStatus === 'Closed' && !updates.outcome && !inquiry.outcome) {
    throw AppError.badRequest(
      'OUTCOME_REQUIRES_CLOSED_STATUS',
      'outcome is required when status is Closed'
    );
  }
  if (resultingStatus !== 'Closed' && updates.outcome) {
    throw AppError.badRequest(
      'OUTCOME_NOT_ALLOWED',
      'outcome may only be supplied when status is Closed'
    );
  }

  return inquiriesRepository.updateInquiry(inquiryId, updates);
}

// --- Follow-up Notes -------------------------------------------------------

async function addFollowUpNote(inquiryId, input, actingUser) {
  const inquiry = await inquiriesRepository.findInquiryById(inquiryId);
  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }

  return inquiriesRepository.createFollowUpNote({
    inquiry_id: inquiryId,
    created_by: actingUser.id,
    note: input.note,
  });
}

async function getFollowUpNotes(inquiryId) {
  const inquiry = await inquiriesRepository.findInquiryById(inquiryId);
  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }
  return inquiriesRepository.findFollowUpNotesByInquiry(inquiryId);
}

// --- Link to Member (FR-14.6) -----------------------------------------------

/**
 * "Purely referential — linking never modifies the Member record" —
 * this function's only write is to Inquiry.linked_member_id; Member is
 * only ever READ here (findMemberById), never updated.
 */
async function linkMember(inquiryId, input) {
  const inquiry = await inquiriesRepository.findInquiryById(inquiryId);
  if (!inquiry) {
    throw AppError.notFound('Inquiry not found');
  }
  if (inquiry.status !== 'Closed') {
    throw AppError.conflict('INQUIRY_NOT_CLOSED', 'Only a closed inquiry may be linked to a member');
  }

  const member = await inquiriesRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  return inquiriesRepository.updateInquiry(inquiryId, { linked_member_id: member.id });
}

module.exports = {
  submitInquiry,
  getInquiry,
  listInquiries,
  updateInquiry,
  addFollowUpNote,
  getFollowUpNotes,
  linkMember,
};