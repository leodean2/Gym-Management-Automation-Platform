const { z } = require('zod');

// Feature 12 — Admin Analytics Dashboard
// Zod schemas for this module's query/request shapes, per FR-12.6's
// shared time-range convention. No create/update schemas exist at all —
// this entire module is read-only (BR-12.1) except the export action,
// which produces a file rather than mutating anything.

const RANGE = z.enum(['today', 'week', 'month', 'custom']);

/**
 * Shared by every KPI endpoint (dashboard, memberships, attendance,
 * financial, trainers, bookings) per FR-12.6's "same time-range query
 * parameters" rule. from/to are only required when range=custom — Zod's
 * cross-field .refine() enforces that conditional requirement, and
 * rejects from/to being present for a non-custom range too, since
 * silently accepting-but-ignoring them would let a client believe a
 * range filter applied when it didn't.
 */
const timeRangeQuerySchema = z
  .object({
    range: RANGE.default('today'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((data) => data.range !== 'custom' || (data.from && data.to), {
    message: '"from" and "to" are required when range is "custom"',
    path: ['from'],
  })
  .refine((data) => data.range === 'custom' || (!data.from && !data.to), {
    message: '"from" and "to" are only accepted when range is "custom"',
    path: ['range'],
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

/**
 * POST /analytics/export — the time-range fields here are NOT optional
 * with a default the way timeRangeQuerySchema's are: this is a request
 * body the client explicitly constructs (not a query string a browser
 * might partially populate), so range is required outright rather than
 * defaulting to 'today' silently for an export action.
 */
const exportReportSchema = z
  .object({
    report: z.enum(['memberships', 'attendance', 'financial', 'trainers', 'bookings']),
    range: RANGE,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .strict()
  .refine((data) => data.range !== 'custom' || (data.from && data.to), {
    message: '"from" and "to" are required when range is "custom"',
    path: ['from'],
  })
  .refine((data) => data.range === 'custom' || (!data.from && !data.to), {
    message: '"from" and "to" are only accepted when range is "custom"',
    path: ['range'],
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" must be on or before "to"',
    path: ['from'],
  });

module.exports = {
  timeRangeQuerySchema,
  exportReportSchema,
};