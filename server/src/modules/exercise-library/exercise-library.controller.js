const exerciseLibraryService = require('./exercise-library.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 9 — Exercise Library
// Thin by design: no Prisma, no permission checks, no business rules.

async function createExercise(req, res) {
  const result = await exerciseLibraryService.createExercise(req.body, req.user);
  return created(res, result);
}

async function getExercise(req, res) {
  const result = await exerciseLibraryService.getExercise(req.params.id);
  return ok(res, result);
}

async function listExercises(req, res) {
  const result = await exerciseLibraryService.listExercises(req.query);
  return ok(res, result);
}

async function updateExercise(req, res) {
  const result = await exerciseLibraryService.updateExercise(req.params.id, req.body);
  return ok(res, result);
}

async function deactivateExercise(req, res) {
  const result = await exerciseLibraryService.deactivateExercise(req.params.id);
  return ok(res, result);
}

async function reactivateExercise(req, res) {
  const result = await exerciseLibraryService.reactivateExercise(req.params.id);
  return ok(res, result);
}

module.exports = {
  createExercise,
  getExercise,
  listExercises,
  updateExercise,
  deactivateExercise,
  reactivateExercise,
};