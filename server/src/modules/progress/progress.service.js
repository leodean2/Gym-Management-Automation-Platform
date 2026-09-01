const workoutProgressRepository = require('./progress.repository');
const AppError = require('../../lib/AppError');

// Feature 8 — Progress Tracking (Body Measurements + Personal Records)
// All business rules for this module live here. Keep this layer
// framework-agnostic — no req/res here.

// --- Scoping helpers -----------------------------------------------------

async function resolveTrainer(userId) {
  return workoutProgressRepository.findTrainerByUserId(userId);
}

async function resolveMember(userId) {
  return workoutProgressRepository.findMemberByUserId(userId);
}

// --- Body Measurements ----------------------------------------------------

/**
 * "Only the assigned Trainer may normally create measurements" — a
 * Trainer is scoped to members currently assigned to them, same as
 * assignTemplate elsewhere. GymOwner/SuperAdmin are unrestricted
 * administrative fallback, per the frozen role table.
 */
async function createBodyMeasurement(input, actingUser) {
  const member = await workoutProgressRepository.findMemberById(input.member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (actingUser.role === 'Trainer') {
    const trainer = await resolveTrainer(actingUser.id);
    if (!trainer || member.current_trainer_id !== trainer.id) {
      throw AppError.forbidden('You may only record measurements for members currently assigned to you');
    }
  }
  // GymOwner / SuperAdmin: unrestricted, per the frozen role matrix.

  return workoutProgressRepository.createBodyMeasurement({
    member_id: input.member_id,
    recorded_by: actingUser.id,
    measurement_date: input.measurement_date,
    weight_kg: input.weight_kg,
    body_fat_percentage: input.body_fat_percentage,
    chest_cm: input.chest_cm,
    waist_cm: input.waist_cm,
    hips_cm: input.hips_cm,
    left_arm_cm: input.left_arm_cm,
    right_arm_cm: input.right_arm_cm,
    left_thigh_cm: input.left_thigh_cm,
    right_thigh_cm: input.right_thigh_cm,
    notes: input.notes,
  });
}

/**
 * GymOwner/SuperAdmin/Receptionist: unrestricted. Trainer: forced to
 * their assigned members only (member_id filter, if supplied, must
 * itself belong to an assigned member — checked below rather than
 * trusted). Member: forced to their own record only, member_id from the
 * query string is ignored entirely.
 */
async function listMeasurements(query, requester) {
  let scoped = { member_id: query.member_id, from: query.from, to: query.to };

  if (requester.role === 'Member') {
    const member = await resolveMember(requester.id);
    if (!member) {
      throw AppError.forbidden();
    }
    scoped.member_id = member.id;
  } else if (requester.role === 'Trainer') {
    const trainer = await resolveTrainer(requester.id);
    if (!trainer) {
      throw AppError.forbidden();
    }
    if (scoped.member_id) {
      const member = await workoutProgressRepository.findMemberById(scoped.member_id);
      if (!member || member.current_trainer_id !== trainer.id) {
        throw AppError.forbidden('You may only view measurements for members currently assigned to you');
      }
    } else {
      scoped.trainerId = trainer.id;
    }
  }

  const where = workoutProgressRepository.buildMeasurementWhere(scoped);
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await workoutProgressRepository.findMeasurements({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

async function getMeasurement(measurementId, requester) {
  const measurement = await workoutProgressRepository.findMeasurementById(measurementId);
  if (!measurement) {
    throw AppError.notFound('Body measurement not found');
  }

  if (['GymOwner', 'SuperAdmin', 'Receptionist'].includes(requester.role)) {
    return measurement;
  }
  if (requester.role === 'Member' && measurement.member.user_id === requester.id) {
    return measurement;
  }
  if (requester.role === 'Trainer') {
    const trainer = await resolveTrainer(requester.id);
    if (trainer && measurement.member.current_trainer_id === trainer.id) {
      return measurement;
    }
  }

  throw AppError.forbidden('You do not have permission to view this body measurement');
}

// --- Personal Records (system-maintained; no create/update endpoint) -------

/**
 * Same scoping shape as listMeasurements — Member forced to own,
 * Trainer forced to assigned members, staff unrestricted.
 */
async function listPersonalRecords(query, requester) {
  let scoped = { member_id: query.member_id, exercise_library_entry_id: query.exercise_library_entry_id };

  if (requester.role === 'Member') {
    const member = await resolveMember(requester.id);
    if (!member) {
      throw AppError.forbidden();
    }
    scoped.member_id = member.id;
  } else if (requester.role === 'Trainer') {
    const trainer = await resolveTrainer(requester.id);
    if (!trainer) {
      throw AppError.forbidden();
    }
    if (scoped.member_id) {
      const member = await workoutProgressRepository.findMemberById(scoped.member_id);
      if (!member || member.current_trainer_id !== trainer.id) {
        throw AppError.forbidden('You may only view personal records for members currently assigned to you');
      }
    } else {
      scoped.trainerId = trainer.id;
    }
  }

  const where = workoutProgressRepository.buildPersonalRecordWhere(scoped);
  const skip = (query.page - 1) * query.limit;
  const { items, total } = await workoutProgressRepository.findPersonalRecords({ where, skip, take: query.limit });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

async function getPersonalRecord(recordId, requester) {
  const record = await workoutProgressRepository.findPersonalRecordById(recordId);
  if (!record) {
    throw AppError.notFound('Personal record not found');
  }

  if (['GymOwner', 'SuperAdmin', 'Receptionist'].includes(requester.role)) {
    return record;
  }
  if (requester.role === 'Member' && record.member.user_id === requester.id) {
    return record;
  }
  if (requester.role === 'Trainer') {
    const trainer = await resolveTrainer(requester.id);
    if (trainer && record.member.current_trainer_id === trainer.id) {
      return record;
    }
  }

  throw AppError.forbidden('You do not have permission to view this personal record');
}

/**
 * The one entry point into this module that isn't request-driven — called
 * by workout-logging.service.js's finalizeSession, never by a route.
 * Examines every exercise logged in the session; only exercise_type ===
 * 'Weighted' is PR-eligible (Bodyweight/Cardio ignored). For each
 * eligible exercise with a performed_weight, compares against the
 * existing PersonalRecord for member+exercise: create one if none
 * exists, update in place if performed_weight beats the current
 * best_weight, otherwise leave untouched. No estimated 1RM, no
 * rep-based comparison — highest performed_weight only, exactly as
 * frozen.
 */
async function updatePersonalRecordsFromSession(workoutSessionId, memberId) {
  const sessionExercises = await workoutProgressRepository.findSessionExercisesForPR(workoutSessionId);

  for (const exercise of sessionExercises) {
    if (exercise.exercise.exercise_type !== 'Weighted') continue;
    if (exercise.performed_weight == null) continue;

    const currentPR = await workoutProgressRepository.findCurrentPR(
      memberId,
      exercise.exercise_library_entry_id
    );

    if (!currentPR) {
      await workoutProgressRepository.createPersonalRecord({
        member_id: memberId,
        exercise_library_entry_id: exercise.exercise_library_entry_id,
        workout_exercise_id: exercise.id,
        best_weight: exercise.performed_weight,
        achieved_at: new Date(),
      });
    } else if (Number(exercise.performed_weight) > Number(currentPR.best_weight)) {
      await workoutProgressRepository.updatePersonalRecord(currentPR.id, {
        workout_exercise_id: exercise.id,
        best_weight: exercise.performed_weight,
        achieved_at: new Date(),
      });
    }
    // performed_weight <= current best_weight: do nothing, per the
    // frozen rule.
  }
}

module.exports = {
  createBodyMeasurement,
  listMeasurements,
  getMeasurement,
  listPersonalRecords,
  getPersonalRecord,
  updatePersonalRecordsFromSession,
};