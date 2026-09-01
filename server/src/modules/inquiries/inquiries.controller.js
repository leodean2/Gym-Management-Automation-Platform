const inquiriesService = require('./inquiries.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 14 — Contact & Inquiry Management
// Thin by design: no Prisma, no permission checks, no business rules.

/**
 * The only controller function in this entire codebase with no
 * req.user — public, unauthenticated submission. Deliberately returns
 * only { id, status, created_at }, not the full inquiry object, per the
 * frozen design's "caller is an anonymous website visitor, not staff"
 * reasoning — service returns the full row, this trims it down for the
 * public response.
 */
async function submitInquiry(req, res) {
  const inquiry = await inquiriesService.submitInquiry(req.body);
  return created(res, {
    id: inquiry.id,
    status: inquiry.status,
    created_at: inquiry.created_at,
  });
}

async function getInquiry(req, res) {
  const result = await inquiriesService.getInquiry(req.params.id);
  return ok(res, result);
}

async function listInquiries(req, res) {
  const result = await inquiriesService.listInquiries(req.query);
  return ok(res, result);
}

async function updateInquiry(req, res) {
  const result = await inquiriesService.updateInquiry(req.params.id, req.body);
  return ok(res, result);
}

async function addFollowUpNote(req, res) {
  const result = await inquiriesService.addFollowUpNote(req.params.id, req.body, req.user);
  return created(res, result);
}

async function getFollowUpNotes(req, res) {
  const result = await inquiriesService.getFollowUpNotes(req.params.id);
  return ok(res, result);
}

async function linkMember(req, res) {
  const result = await inquiriesService.linkMember(req.params.id, req.body);
  return created(res, result);
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
