const prisma = require('../../config/db');

/**
 * Workout Progress repository — ONLY database access lives here. No
 * authorization, no PR calculation logic. Function names match the
 * "Repository Responsibilities" list from the frozen design exactly,
 * plus the scoping helpers every other module's repository provides.
 */

// --- Helpers needed for authorization/scoping in the service ---------------

function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

/**
 * Resolves a Member row from the authenticated user's id — needed so the
 * service can force member_id === "your own record" for a Member
 * requester rather than trusting a client-supplied member_id.
 */
function findMemberByUserId(userId) {
  return prisma.member.findUnique({ where: { user_id: userId } });
}

// --- Body Measurements ----------------------------------------------------

function createBodyMeasurement(data) {
  return prisma.bodyMeasurement.create({ data });
}

function buildMeasurementWhere({ member_id, from, to }) {
  const where = {};
  const and = [];

  if (member_id) and.push({ member_id });
  if (from || to) {
    const measurementDate = {};
    if (from) measurementDate.gte = from;
    if (to) measurementDate.lte = to;
    and.push({ measurement_date: measurementDate });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

async function findMeasurements({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.bodyMeasurement.findMany({
      where,
      skip,
      take,
      orderBy: { measurement_date: 'desc' },
    }),
    prisma.bodyMeasurement.count({ where }),
  ]);

  return { items, total };
}

function findMeasurementById(id) {
  return prisma.bodyMeasurement.findUnique({
    where: { id },
    include: { member: { select: { user_id: true, current_trainer_id: true } } },
  });
}

// --- Personal Records -------------------------------------------------------

function buildPersonalRecordWhere({ member_id, exercise_library_entry_id }) {
  const where = {};
  const and = [];

  if (member_id) and.push({ member_id });
  if (exercise_library_entry_id) and.push({ exercise_library_entry_id });

  if (and.length > 0) where.AND = and;
  return where;
}

async function findPersonalRecords({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.personalRecord.findMany({
      where,
      skip,
      take,
      include: { exercise: { select: { name: true } } },
      orderBy: { achieved_at: 'desc' },
    }),
    prisma.personalRecord.count({ where }),
  ]);

  return { items, total };
}

function findPersonalRecordById(id) {
  return prisma.personalRecord.findUnique({
    where: { id },
    include: {
      member: { select: { user_id: true, current_trainer_id: true } },
      exercise: { select: { name: true } },
    },
  });
}

/**
 * The @@unique([member_id, exercise_library_entry_id]) constraint means
 * this is always at most one row — "the existing PersonalRecord for this
 * member+exercise, if one exists yet." Used by the service to decide
 * create-vs-update-in-place when a session is finalized.
 */
function findCurrentPR(memberId, exerciseLibraryEntryId) {
  return prisma.personalRecord.findUnique({
    where: {
      member_id_exercise_library_entry_id: {
        member_id: memberId,
        exercise_library_entry_id: exerciseLibraryEntryId,
      },
    },
  });
}

function updatePersonalRecord(id, data) {
  return prisma.personalRecord.update({ where: { id }, data });
}

function createPersonalRecord(data) {
  return prisma.personalRecord.create({ data });
}

/**
 * Not in the original "Repository Responsibilities" list, but needed for
 * updatePersonalRecordsFromSession to have anything to iterate over —
 * it's a plain Prisma read (no PR logic), so it belongs here rather than
 * in the service. Returns each logged exercise for a finalized session
 * along with its ExerciseLibraryEntry.exercise_type, since only
 * "Weighted" exercises are PR-eligible.
 */
function findSessionExercisesForPR(workoutSessionId) {
  return prisma.workoutExercise.findMany({
    where: { workout_session_id: workoutSessionId },
    include: { exercise: { select: { exercise_type: true } } },
  });
}

module.exports = {
  findTrainerByUserId,
  findMemberById,
  findMemberByUserId,
  createBodyMeasurement,
  buildMeasurementWhere,
  findMeasurements,
  findMeasurementById,
  buildPersonalRecordWhere,
  findPersonalRecords,
  findPersonalRecordById,
  findCurrentPR,
  updatePersonalRecord,
  createPersonalRecord,
  findSessionExercisesForPR,
};