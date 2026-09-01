const workoutLoggingRepository = require('./workout-logging.repository');
const workoutProgressService = require('../progress/progress.service');
const AppError = require('../../lib/AppError');

// --- Scoping helpers -----------------------------------------------------

async function resolveTrainer(userId) {
  return workoutLoggingRepository.findTrainerByUserId(userId);
}

function isOwnerMember(session, requester) {
  return requester.role === 'Member' && session.member.user_id === requester.id;
}

async function isAssignedTrainer(session, requester) {
  if (requester.role !== 'Trainer') return false;
  const trainer = await resolveTrainer(requester.id);
  return !!trainer && session.member.current_trainer_id === trainer.id;
}

// --- Create Session --------------------------------------------------------

/**
 * "Cannot log against inactive assignment" — the assignment itself must
 * be Active. The prescribed session must belong to the same template the
 * assignment references, so a client can't attach a WorkoutSession to a
 * WorkoutProgramSession from an unrelated program. member_id is never
 * client-supplied — it's derived from the assignment, per the frozen
 * schema (WorkoutSession has no separate member_id override path).
 */
async function createSession(input, actingUser) {
  const assignment = await workoutLoggingRepository.findAssignmentById(
    input.workout_program_assignment_id
  );
  if (!assignment) {
    throw AppError.notFound('Workout program assignment not found');
  }
  if (assignment.status !== 'Active') {
    throw AppError.conflict(
      'ASSIGNMENT_NOT_ACTIVE',
      'Cannot log a workout session against an assignment that is not Active'
    );
  }

  const programSession = await workoutLoggingRepository.findProgramSessionById(
    input.workout_program_session_id
  );
  if (!programSession) {
    throw AppError.notFound('Workout program session not found');
  }
  if (programSession.workout_program_template_id !== assignment.workout_program_template_id) {
    throw AppError.badRequest(
      'SESSION_TEMPLATE_MISMATCH',
      'This program session does not belong to the assigned template'
    );
  }

  if (actingUser.role === 'Member' && assignment.member.user_id !== actingUser.id) {
    throw AppError.forbidden('You may only log workout sessions for your own assignment');
  }
  if (actingUser.role === 'Trainer') {
    const trainer = await resolveTrainer(actingUser.id);
    if (!trainer || assignment.trainer_id !== trainer.id) {
      throw AppError.forbidden('You may only log sessions for members assigned to you');
    }
  }

  return workoutLoggingRepository.createSession({
    member_id: assignment.member_id,
    workout_program_assignment_id: assignment.id,
    workout_program_session_id: programSession.id,
    session_date: input.session_date,
    started_at: new Date(),
    status: 'InProgress',
    notes: input.notes,
  });
}

// --- View --------------------------------------------------------------

async function getSession(sessionId, requester) {
  const session = await workoutLoggingRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Workout session not found');
  }

  if (['Receptionist', 'GymOwner', 'SuperAdmin'].includes(requester.role)) {
    return session;
  }
  if (isOwnerMember(session, requester)) {
    return session;
  }
  if (await isAssignedTrainer(session, requester)) {
    return session;
  }

  throw AppError.forbidden('You do not have permission to view this workout session');
}

async function listSessions(query, requester) {
  let scoped = { status: query.status, workout_program_assignment_id: query.workout_program_assignment_id };

  if (requester.role === 'Member') {
    const member = await workoutLoggingRepository.findMemberByUserId(requester.id);
    if (!member) {
      throw AppError.forbidden();
    }
    scoped.member_id = member.id;
  } else if (requester.role === 'Trainer') {
    const trainer = await resolveTrainer(requester.id);
    if (!trainer) {
      throw AppError.forbidden();
    }
    scoped.trainerId = trainer.id;
  } else {
    scoped.member_id = query.member_id;
  }

  const where = workoutLoggingRepository.buildSessionWhere(scoped);

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await workoutLoggingRepository.listSessions({
    where,
    skip,
    take: query.limit,
  });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Finalize (FR-7.3) -----------------------------------------------------

/**
 * SESSION_FINALIZE_ROLES = ['Member', 'Trainer'] — no admin override here,
 * unlike reopen. "Member manually Finalizes"; a Trainer may also finalize
 * on a member's behalf, scoped to their assigned members.
 */
async function finalizeSession(sessionId, actingUser) {
  const session = await workoutLoggingRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Workout session not found');
  }
  if (session.status !== 'InProgress') {
    throw AppError.conflict('SESSION_NOT_IN_PROGRESS', 'Only an in-progress session can be finalized');
  }

  const isOwner = isOwnerMember(session, actingUser);
  const isTrainerOfMember = await isAssignedTrainer(session, actingUser);
  if (!isOwner && !isTrainerOfMember) {
    throw AppError.forbidden('You may only finalize your own session, or a session for a member assigned to you');
  }

  const finalized = await workoutLoggingRepository.finalizeSession(sessionId, actingUser.id);

  // Session finalization above is the primary business operation and is
  // already durably committed by this point. PersonalRecord is a
  // derived, rebuildable projection of WorkoutExercise history — a
  // failure updating it must never make the client believe finalization
  // itself failed (see safelyUpdatePersonalRecords).
  await safelyUpdatePersonalRecords(finalized.id, finalized.member_id);

  return finalized;
}

/**
 * Best-effort synchronization of a derived read model, deliberately
 * isolated from finalizeSession's return value and error path. No logger
 * utility exists in this codebase yet (server/src/lib has no logger.js),
 * so this uses console.error with structured fields as a stand-in — swap
 * for a real logger call here if one is added later; the call site in
 * finalizeSession does not need to change.
 */
async function safelyUpdatePersonalRecords(sessionId, memberId) {
  try {
    await workoutProgressService.updatePersonalRecordsFromSession(sessionId, memberId);
  } catch (err) {
    console.error('Failed to update Personal Records after workout finalization', {
      sessionId,
      memberId,
      error: err.message,
    });
  }
}

// --- Reopen (FR-7.4) -----------------------------------------------------

/**
 * SESSION_REOPEN_ROLES = ['Trainer', 'GymOwner', 'SuperAdmin'] — Member
 * deliberately excluded, consistent with the "finalized data is
 * Trainer/Admin-controlled" integrity principle applied to Booking and
 * Workout Session reopening throughout this system.
 */
async function reopenSession(sessionId, { reason }, actingUser) {
  const session = await workoutLoggingRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Workout session not found');
  }
  if (session.status !== 'Finalized') {
    throw AppError.conflict('SESSION_NOT_FINALIZED', 'Only a finalized session can be reopened');
  }

  if (actingUser.role === 'Trainer') {
    const isTrainerOfMember = await isAssignedTrainer(session, actingUser);
    if (!isTrainerOfMember) {
      throw AppError.forbidden('You may only reopen sessions for members assigned to you');
    }
  }
  // GymOwner / SuperAdmin: unrestricted, per the frozen role matrix.

  const { session: reopened } = await workoutLoggingRepository.reopenSession({
    sessionId,
    reopenedBy: actingUser.id,
    reason,
  });
  return reopened;
}

// --- Log Exercise (FR-7.2) --------------------------------------------------

/**
 * The InProgress gate is what actually enforces "Finalized session is
 * read-only" — not a role check. Ownership/assignment scoping mirrors
 * getSession exactly, restricted to EXERCISE_MANAGE_ROLES at the route.
 */
async function logExercise(sessionId, input, actingUser) {
  const session = await workoutLoggingRepository.findSessionById(sessionId);
  if (!session) {
    throw AppError.notFound('Workout session not found');
  }
  if (session.status !== 'InProgress') {
    throw AppError.conflict('SESSION_NOT_IN_PROGRESS', 'Cannot log exercises against a finalized session');
  }

  const isOwner = isOwnerMember(session, actingUser);
  const isTrainerOfMember = await isAssignedTrainer(session, actingUser);
  const isAdmin = ['GymOwner', 'SuperAdmin'].includes(actingUser.role);
  if (!isOwner && !isTrainerOfMember && !isAdmin) {
    throw AppError.forbidden('You do not have permission to log exercises for this session');
  }

  // Prescribed-vs-ad-hoc derivation, server-side (never client-supplied).
  const templateExercise = await workoutLoggingRepository.findTemplateExerciseForSession(
    session.workout_program_session_id,
    input.exercise_library_entry_id
  );

  return workoutLoggingRepository.createExercise(sessionId, {
    exercise_library_entry_id: input.exercise_library_entry_id,
    template_exercise_id: templateExercise ? templateExercise.id : null,
    performed_sets: input.performed_sets,
    performed_reps: input.performed_reps,
    performed_weight: input.performed_weight,
    rest_seconds: input.rest_seconds,
    duration_seconds: input.duration_seconds,
    distance: input.distance,
    perceived_exertion: input.perceived_exertion,
    notes: input.notes,
  });
}

// --- Update Exercise -------------------------------------------------------

async function updateExercise(exerciseId, updates, actingUser) {
  const exercise = await workoutLoggingRepository.findExerciseById(exerciseId);
  if (!exercise) {
    throw AppError.notFound('Workout exercise not found');
  }
  if (exercise.workout_session.status !== 'InProgress') {
    throw AppError.conflict(
      'SESSION_NOT_IN_PROGRESS',
      'Cannot edit a logged exercise once its session is finalized'
    );
  }

  const session = await workoutLoggingRepository.findSessionById(exercise.workout_session.id);
  const isOwner = isOwnerMember(session, actingUser);
  const isTrainerOfMember = await isAssignedTrainer(session, actingUser);
  const isAdmin = ['GymOwner', 'SuperAdmin'].includes(actingUser.role);
  if (!isOwner && !isTrainerOfMember && !isAdmin) {
    throw AppError.forbidden('You do not have permission to edit this logged exercise');
  }

  return workoutLoggingRepository.updateExercise(exerciseId, updates);
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