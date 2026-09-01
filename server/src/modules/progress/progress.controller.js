const workoutProgressService = require('./progress.service');
const { ok, created } = require('../../lib/apiResponse');

// Feature 8 — Progress Tracking (Body Measurements + Personal Records)
// Thin by design: no Prisma, no permission checks, no PR calculation
// logic. updatePersonalRecordsFromSession has no controller function at
// all — it's never called from a route, only from
// workout-logging.service.js's finalizeSession.

// --- Body Measurements ----------------------------------------------------

async function createBodyMeasurement(req, res) {
  const result = await workoutProgressService.createBodyMeasurement(req.body, req.user);
  return created(res, result);
}

async function listMeasurements(req, res) {
  const result = await workoutProgressService.listMeasurements(req.query, req.user);
  return ok(res, result);
}

async function getMeasurement(req, res) {
  const result = await workoutProgressService.getMeasurement(req.params.id, req.user);
  return ok(res, result);
}

// --- Personal Records -------------------------------------------------------

async function listPersonalRecords(req, res) {
  const result = await workoutProgressService.listPersonalRecords(req.query, req.user);
  return ok(res, result);
}

async function getPersonalRecord(req, res) {
  const result = await workoutProgressService.getPersonalRecord(req.params.id, req.user);
  return ok(res, result);
}

module.exports = {
  createBodyMeasurement,
  listMeasurements,
  getMeasurement,
  listPersonalRecords,
  getPersonalRecord,
};