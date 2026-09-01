const analyticsService = require('./analytics.service');
const { ok } = require('../../lib/apiResponse');

// Feature 12 — Admin Analytics Dashboard
// Thin by design for every endpoint except export, which needs actual
// CSV-serialization logic that doesn't exist anywhere else in this
// codebase yet — kept local to this controller rather than extracted to
// lib/, since no other module currently produces file downloads.

async function getDashboardSummary(req, res) {
  const result = await analyticsService.getDashboardSummary(req.query);
  return ok(res, result);
}

async function getMembershipAnalytics(req, res) {
  const result = await analyticsService.getMembershipAnalytics(req.query);
  return ok(res, result);
}

async function getAttendanceAnalytics(req, res) {
  const result = await analyticsService.getAttendanceAnalytics(req.query);
  return ok(res, result);
}

async function getFinancialAnalytics(req, res) {
  const result = await analyticsService.getFinancialAnalytics(req.query);
  return ok(res, result);
}

async function getTrainerAnalytics(req, res) {
  const result = await analyticsService.getTrainerAnalytics(req.query);
  return ok(res, result);
}

async function getBookingAnalytics(req, res) {
  const result = await analyticsService.getBookingAnalytics(req.query);
  return ok(res, result);
}

async function getOperationalDashboard(req, res) {
  const result = await analyticsService.getOperationalDashboard();
  return ok(res, result);
}

// --- CSV export ------------------------------------------------------------

/**
 * Flattens an arbitrary array of plain-ish objects (Prisma rows,
 * possibly with nested include objects) into CSV text. Nested objects
 * are flattened one level with dot-notation keys (e.g.
 * "member.first_name") rather than stringified as [object Object], since
 * every export record in this module includes at least one relation
 * (member, trainer, invoice, etc.) that a report consumer needs to see.
 * Not a general-purpose CSV library — deliberately minimal, scoped to
 * what this one endpoint needs.
 */
function flattenRecord(record, prefix = '') {
  const flat = {};
  for (const [key, value] of Object.entries(record)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value instanceof Date) {
      flat[fullKey] = value.toISOString();
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, flattenRecord(value, fullKey));
    } else {
      flat[fullKey] = value;
    }
  }
  return flat;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(records) {
  if (records.length === 0) return '';

  const flattened = records.map((record) => flattenRecord(record));
  const headers = Object.keys(flattened[0]);

  const headerRow = headers.map(escapeCsvValue).join(',');
  const dataRows = flattened.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','));

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Response is a raw CSV file, NOT the standard { data, error } envelope
 * — per the frozen design's explicit call-out that this is the one
 * exception in the whole codebase.
 */
async function exportReport(req, res) {
  const { report, range, records } = await analyticsService.exportReport(req.body, req.user);

  const csv = toCsv(records);
  const filename = `${report}-${range.from}-to-${range.to}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
}

module.exports = {
  getDashboardSummary,
  getMembershipAnalytics,
  getAttendanceAnalytics,
  getFinancialAnalytics,
  getTrainerAnalytics,
  getBookingAnalytics,
  getOperationalDashboard,
  exportReport,
};