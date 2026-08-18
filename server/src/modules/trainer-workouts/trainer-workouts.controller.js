const trainerWorkoutsService = require('./trainer-workouts.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 5 — Trainer Management & Workout Programs (Pass 1)
// Thin by design: no Prisma, no permission checks, no business rules.
// Just: pull validated input off req, call the service, shape the response.

async function register(req, res) {
  const result = await trainerWorkoutsService.registerTrainer(req.body, req.user);
  return created(res, result);
}

async function getProfile(req, res) {
  const result = await trainerWorkoutsService.getTrainerProfile(req.params.id, req.user);
  return ok(res, result);
}

async function update(req, res) {
  const result = await trainerWorkoutsService.updateTrainerProfile(
    req.params.id,
    req.body,
    req.user
  );
  return ok(res, result);
}

async function assign(req, res) {
  const result = await trainerWorkoutsService.assignTrainer(req.params.memberId, req.body, req.user);
  return ok(res, result);
}

async function getAssignmentHistory(req, res) {
  const result = await trainerWorkoutsService.getAssignmentHistory(req.params.memberId, req.user);
  return ok(res, result);
}

module.exports = { register, getProfile, update, assign, getAssignmentHistory };