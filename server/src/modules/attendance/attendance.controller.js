const attendanceService = require('./attendance.service');
const { ok, created } = require('../../lib/apiResponse');

async function checkIn(req, res) {
  const result = await attendanceService.checkIn(req.body, req.user);
  return created(res, result);
}

async function getHistory(req, res) {
  const result = await attendanceService.getHistory(req.params.memberId, req.query, req.user);
  return ok(res, result);
}

async function getDetail(req, res) {
  const result = await attendanceService.getDetail(req.params.id, req.user);
  return ok(res, result);
}

async function correct(req, res) {
  const result = await attendanceService.correct(req.params.id, req.body, req.user);
  return created(res, result);
}

module.exports = { checkIn, getHistory, getDetail, correct };
