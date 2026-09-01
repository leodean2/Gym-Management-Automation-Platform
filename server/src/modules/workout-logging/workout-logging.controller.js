const workoutLoggingService = require('./workout-logging.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 7 — Workout Logging (Performed)
// Thin by design: no Prisma, no permission checks, no business rules.

async function createSession(req, res) {
  const result = await workoutLoggingService.createSession(req.body, req.user);
  return created(res, result);
}

async function getSession(req, res) {
  const result = await workoutLoggingService.getSession(req.params.id, req.user);
  return ok(res, result);
}

async function listSessions(req, res) {
  const result = await workoutLoggingService.listSessions(req.query, req.user);
  return ok(res, result);
}

async function finalizeSession(req, res) {
  const result = await workoutLoggingService.finalizeSession(req.params.id, req.user);
  return ok(res, result);
}

async function reopenSession(req, res) {
  const result = await workoutLoggingService.reopenSession(req.params.id, req.body, req.user);
  return ok(res, result);
}

async function logExercise(req, res) {
  const result = await workoutLoggingService.logExercise(req.params.id, req.body, req.user);
  return created(res, result);
}

async function updateExercise(req, res) {
  const result = await workoutLoggingService.updateExercise(req.params.id, req.body, req.user);
  return ok(res, result);
}

module.exports = {
  createSession,
  getSession,
  listSessions,
  finalizeSession,
  reopenSession,
  logExercise,
  updateExercise,
};