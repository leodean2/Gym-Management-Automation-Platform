const prisma = require('../../config/db');

/**
 * Workout Logging repository — ONLY database access lives here. No
 * authorization, no business rules. Every function is a thin, named
 * wrapper around a Prisma call, mirroring workout-programs.repository.js's
 * and nutrition.repository.js's shape.
 */

// --- Helpers needed for authorization/validation in the service ------------

function findTrainerByUserId(userId) {
  return prisma.trainer.findUnique({ where: { user_id: userId } });
}

function findMemberById(id) {
  return prisma.member.findUnique({ where: { id } });
}

function findMemberByUserId(userId) {
  return prisma.member.findUnique({ where: { user_id: userId } });
}

function findAssignmentById(id) {
  return prisma.workoutProgramAssignment.findUnique({
    where: { id },
    include: {
      member: { select: { user_id: true } },
    },
  });
}

function findProgramSessionById(id) {
  return prisma.workoutProgramSession.findUnique({ where: { id } });
}

/**
 * Backs the server-side prescribed-vs-ad-hoc derivation: matches a
 * WorkoutSession's WorkoutProgramSession against the exercise being
 * logged. A hit means "this exercise is prescribed here" — the service
 * uses the returned row's id as template_exercise_id; a miss means
 * ad-hoc, and template_exercise_id is left NULL.
 */
function findTemplateExerciseForSession(workoutProgramSessionId, exerciseLibraryEntryId) {
  return prisma.templateExercise.findFirst({
    where: {
      workout_program_session_id: workoutProgramSessionId,
      exercise_library_entry_id: exerciseLibraryEntryId,
    },
  });
}

// --- Workout Session -----------------------------------------------------

function createSession(data) {
  return prisma.workoutSession.create({ data });
}

function findSessionById(id) {
  return prisma.workoutSession.findUnique({
    where: { id },
    include: {
      member: { select: { user_id: true, current_trainer_id: true } },
      exercises: true,
      reopen_history: { orderBy: { reopened_at: 'desc' } },
    },
  });
}

/**
 * trainerId scopes via the member relation's current_trainer_id, since
 * WorkoutSession has no trainer_id column of its own — the trainer/
 * member link only exists through the WorkoutProgramAssignment or,
 * more directly here, through Member.current_trainer_id.
 */
function buildSessionWhere({ member_id, workout_program_assignment_id, status, trainerId }) {
  const where = {};
  const and = [];

  if (member_id) and.push({ member_id });
  if (workout_program_assignment_id) and.push({ workout_program_assignment_id });
  if (status) and.push({ status });
  if (trainerId) and.push({ member: { current_trainer_id: trainerId } });

  if (and.length > 0) where.AND = and;
  return where;
}

async function listSessions({ where, skip, take }) {
  const [items, total] = await Promise.all([
    prisma.workoutSession.findMany({
      where,
      skip,
      take,
      orderBy: { session_date: 'desc' },
    }),
    prisma.workoutSession.count({ where }),
  ]);

  return { items, total };
}

/**
 * InProgress -> Finalized. completed_at is set here, not accepted from
 * the client — matches "Member manually Finalizes" / "Finalized session
 * is read-only," with the server owning the timestamp.
 */
function finalizeSession(id, finalizedBy) {
  return prisma.workoutSession.update({
    where: { id },
    data: {
      status: 'Finalized',
      completed_at: new Date(),
      finalized_by: finalizedBy,
    },
  });
}

/**
 * Reopen does NOT create a new WorkoutSession — the frozen design is
 * explicit that the row is reused. completed_at is cleared, status goes
 * back to InProgress, and the reopen is recorded as its own history row,
 * all atomically so a session is never left Finalized-but-uncompleted or
 * reopened-with-no-audit-trail.
 */
function reopenSession({ sessionId, reopenedBy, reason }) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.workoutSession.update({
      where: { id: sessionId },
      data: {
        status: 'InProgress',
        completed_at: null,
      },
    });

    const history = await tx.workoutSessionReopenHistory.create({
      data: {
        workout_session_id: sessionId,
        reopened_by: reopenedBy,
        reopened_at: new Date(),
        reason,
      },
    });

    return { session, history };
  });
}

// --- Workout Exercise -----------------------------------------------------

function createExercise(sessionId, data) {
  return prisma.workoutExercise.create({
    data: { ...data, workout_session_id: sessionId },
  });
}

function findExerciseById(id) {
  return prisma.workoutExercise.findUnique({
    where: { id },
    include: {
      workout_session: {
        select: { id: true, member_id: true, status: true },
      },
    },
  });
}

/**
 * exercise_library_entry_id and template_exercise_id are never passed
 * here — enforced upstream by updateExerciseSchema's field allowlist, not
 * by this function.
 */
function updateExercise(id, data) {
  return prisma.workoutExercise.update({ where: { id }, data });
}

module.exports = {
  findTrainerByUserId,
  findMemberById,
  findMemberByUserId,
  findAssignmentById,
  findProgramSessionById,
  findTemplateExerciseForSession,
  createSession,
  findSessionById,
  buildSessionWhere,
  listSessions,
  finalizeSession,
  reopenSession,
  createExercise,
  findExerciseById,
  updateExercise,
};