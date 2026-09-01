const workoutProgramsService = require('./workout-programs.service');
const { ok, created } = require('../../lib/apiResponse');

// Thin by design: no Prisma, no permission checks, no business rules.

async function createTemplate(req, res) {
  const result = await workoutProgramsService.createTemplate(req.body, req.user);
  return created(res, result);
}

async function getTemplate(req, res) {
  const result = await workoutProgramsService.getTemplate(req.params.id);
  return ok(res, result);
}

async function listTemplates(req, res) {
  const result = await workoutProgramsService.listTemplates(req.query, req.user);
  return ok(res, result);
}

async function updateTemplate(req, res) {
  const result = await workoutProgramsService.updateTemplate(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function createSession(req, res) {
  const result = await workoutProgramsService.createSession(req.params.templateId, req.body, req.user);
  return created(res, result);
}

async function updateSession(req, res) {
  const result = await workoutProgramsService.updateSession(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function createExercise(req, res) {
  const result = await workoutProgramsService.createExercise(req.params.sessionId, req.body, req.user);
  return created(res, result);
}

async function updateExercise(req, res) {
  const result = await workoutProgramsService.updateExercise(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function assignTemplate(req, res) {
  const result = await workoutProgramsService.assignTemplate(req.params.templateId, req.body, req.user);
  return created(res, result);
}

async function completeAssignment(req, res) {
  const result = await workoutProgramsService.completeAssignment(req.params.id, req.user);
  return ok(res, result);
}

async function getMemberAssignments(req, res) {
  const result = await workoutProgramsService.getMemberAssignments(req.params.memberId, req.user);
  return ok(res, result);
}

module.exports = {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  createSession,
  updateSession,
  createExercise,
  updateExercise,
  assignTemplate,
  completeAssignment,
  getMemberAssignments,
};