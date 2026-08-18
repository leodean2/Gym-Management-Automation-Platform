const { z } = require('zod');

const checkInSchema = z.object({ member_id: z.string().uuid() }).strict();

const attendanceHistoryQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// corrected_check_in_time is optional: FR-4.8 makes replacement conditional
// ("if the correction requires a replacement..."). Omit it to void a true
// duplicate with no replacement; provide it to void-and-reissue with a
// corrected time. member_id is deliberately not accepted — immutable.
const correctAttendanceSchema = z
  .object({
    reason: z.string().min(1),
    corrected_check_in_time: z.coerce.date().optional(),
  })
  .strict();

module.exports = { checkInSchema, attendanceHistoryQuerySchema, correctAttendanceSchema };
