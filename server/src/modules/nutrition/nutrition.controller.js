const nutritionService = require('./nutrition.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 6 — Nutrition Plan Templates & Assignment
// Controllers stay thin: pull validated input off req, call the service,
// shape the response envelope. Business logic belongs in nutrition.service.js.

// --- Templates ------------------------------------------------------------

async function createTemplate(req, res) {
  const result = await nutritionService.createTemplate(req.body, req.user);
  return created(res, result);
}

async function getTemplate(req, res) {
  const result = await nutritionService.getTemplate(req.params.id);
  return ok(res, result);
}

async function listTemplates(req, res) {
  const result = await nutritionService.listTemplates(req.query);
  return ok(res, result);
}

async function updateTemplate(req, res) {
  const result = await nutritionService.updateTemplate(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function deactivateTemplate(req, res) {
  const result = await nutritionService.deactivateTemplate(req.params.id);
  return ok(res, result);
}

// --- Assignments ----------------------------------------------------------

async function assignTemplate(req, res) {
  const result = await nutritionService.assignTemplate(req.body, req.user);
  return created(res, result);
}

async function getAssignment(req, res) {
  const result = await nutritionService.getAssignment(req.params.id, req.user);
  return ok(res, result);
}

async function listAssignments(req, res) {
  const result = await nutritionService.listAssignments(req.query);
  return ok(res, result);
}

async function replaceAssignment(req, res) {
  const result = await nutritionService.replaceAssignment(req.params.id, req.body, req.user);
  return created(res, result);
}

async function completeAssignment(req, res) {
  const result = await nutritionService.completeAssignment(req.params.id, req.user);
  return ok(res, result);
}

async function updateAssignment(req, res) {
  const result = await nutritionService.updateAssignment(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function getMemberActivePlan(req, res) {
  const result = await nutritionService.getMemberActivePlan(req.params.memberId, req.user);
  return ok(res, result);
}

module.exports = {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  deactivateTemplate,
  assignTemplate,
  getAssignment,
  listAssignments,
  replaceAssignment,
  completeAssignment,
  updateAssignment,
  getMemberActivePlan,
};