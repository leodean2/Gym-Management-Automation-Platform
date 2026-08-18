const bcrypt = require('bcrypt');
const crypto = require('crypto');

const trainersRepository = require('./trainers.repository');
const AppError = require('../../lib/AppError');
const { auth } = require('../../config/env');
const {
  STAFF_ROLES,
  PROFILE_VIEW_ROLES,
  HISTORY_ROLES,
  STAFF_UPDATABLE_FIELDS,
  SELF_UPDATABLE_FIELDS,
} = require('./trainers.constants');

// Feature 5 — Trainer Management & Workout Programs (Pass 1: accounts,
// profile, assignment). All business rules for this module live here:
// validation against frozen FRs, permission checks beyond simple role
// (e.g. "a Trainer may only view/edit their own profile"), and any
// database writes. Keep this layer framework-agnostic — no req/res here.

// --- Helpers -----------------------------------------------------------

function generateTempPassword() {
  // Not intended to be memorable — the user changes it on first login,
  // mirroring FR-1.6's handling for Members.
  return crypto.randomBytes(9).toString('base64url');
}

/**
 * Generates a human-readable employee number in the form
 * TRN-<year>-<sequence>, retrying on the rare case of a concurrent
 * collision — same concurrency handling as members.service.js's
 * membership number generator.
 */
async function generateEmployeeNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const existingCount = await trainersRepository.countCreatedBetween(yearStart, yearEnd);
  const sequence = existingCount + 1;
  return `TRN-${year}-${String(sequence).padStart(6, '0')}`;
}

function toTrainerDTO(trainer) {
  const { user, ...rest } = trainer;
  return rest;
}

// --- Register Trainer (FR-5.1) -------------------------------------------

/**
 * Creates the User (login identity, temp password, role=Trainer) and
 * Trainer (profile) atomically — mirrors members.service.js's
 * registerMember so a Trainer account is never left half-created.
 * Route-level authorize() restricts this to ADMIN_ROLES; no further
 * role check is needed here.
 */
async function registerTrainer(input, actingUser) {
  const existingUser = await trainersRepository.findUserByEmail(input.email);
  if (existingUser) {
    throw AppError.conflict('EMAIL_ALREADY_REGISTERED', 'This email is already registered');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, auth.bcryptCostFactor);

  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    const employeeNumber = await generateEmployeeNumber();
    try {
      const { trainer } = await trainersRepository.createTrainerWithUser({
        userData: {
          email: input.email,
          password_hash: passwordHash,
          role: 'Trainer',
          must_change_password: true,
        },
        trainerData: {
          employee_number: employeeNumber,
          first_name: input.first_name,
          last_name: input.last_name,
          phone_number: input.phone_number,
          specialization: input.specialization,
          hire_date: input.hire_date,
          created_by: actingUser.id,
        },
      });

      // TODO (Feature 13): trigger the StaffAccountIssued notification via
      // Resend instead of returning tempPassword directly — same TODO as
      // members.service.js's registerMember, for the same reason.
      return { ...toTrainerDTO(trainer), temporary_password: tempPassword };
    } catch (err) {
      if (err.code === 'P2002') {
        // Unique constraint collision (employee_number or email) — retry.
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// --- Get Trainer Profile (FR-5.2) -----------------------------------------

/**
 * "Is this role ever allowed to hit this endpoint" is answered by
 * authorize() in the routes. This answers "is THIS request allowed" —
 * specifically, a Trainer may only view their own profile, not anyone
 * else's, even though the Trainer role is in PROFILE_VIEW_ROLES.
 */
async function getTrainerProfile(trainerId, requester) {
  const trainer = await trainersRepository.findById(trainerId);
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }

  if (!PROFILE_VIEW_ROLES.includes(requester.role)) {
    throw AppError.forbidden();
  }

  if (requester.role === 'Trainer' && trainer.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own profile');
  }

  return toTrainerDTO(trainer);
}

// --- Update Trainer (FR-5.2) -----------------------------------------------

/**
 * updateTrainerSchema accepts the union of staff-updatable and
 * self-updatable fields since Zod doesn't know who the requester is —
 * this function is where that's actually enforced, by filtering the
 * requested fields against whichever allowlist applies to this requester.
 */
async function updateTrainerProfile(trainerId, updates, requester) {
  const trainer = await trainersRepository.findById(trainerId);
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }

  let allowedFields;
  if (STAFF_ROLES.includes(requester.role)) {
    allowedFields = STAFF_UPDATABLE_FIELDS;
  } else if (requester.role === 'Trainer' && trainer.user_id === requester.id) {
    allowedFields = SELF_UPDATABLE_FIELDS;
  } else {
    throw AppError.forbidden();
  }

  const disallowed = Object.keys(updates).filter((field) => !allowedFields.includes(field));
  if (disallowed.length > 0) {
    throw AppError.forbidden(`You are not permitted to update: ${disallowed.join(', ')}`);
  }

  const updated = await trainersRepository.updateTrainer(trainerId, updates);
  return toTrainerDTO(updated);
}

// --- Trainer Assignment (FR-5.x) --------------------------------------------

/**
 * Assigns (or reassigns) a Trainer to a Member, recording the change in
 * TrainerAssignmentHistory. Route-level authorize() restricts this to
 * staff roles; no further role check is needed here.
 */
async function assignTrainer(memberId, input, actingUser) {
  const member = await trainersRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  const trainer = await trainersRepository.findById(input.trainer_id);
  if (!trainer) {
    throw AppError.notFound('Trainer not found');
  }

  if (member.current_trainer_id === trainer.id) {
    throw AppError.conflict(
      'TRAINER_ALREADY_ASSIGNED',
      'This trainer is already assigned to this member',
    );
  }

  const { member: updatedMember } = await trainersRepository.assignTrainerToMember({
    memberId,
    newTrainerId: trainer.id,
    historyData: {
      member_id: memberId,
      previous_trainer_id: member.current_trainer_id,
      new_trainer_id: trainer.id,
      reassigned_by: actingUser.id,
      reassigned_at: new Date(),
      reason: input.reason ?? null,
    },
  });

  return updatedMember;
}

// --- Trainer Assignment History (FR-5.x) ------------------------------------

/**
 * HISTORY_ROLES includes Member, so a Member is allowed to view assignment
 * history in principle — but only their own, hence the ownership check
 * below, same pattern as getTrainerProfile's Trainer-self scoping.
 */
async function getAssignmentHistory(memberId, requester) {
  const member = await trainersRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  if (!HISTORY_ROLES.includes(requester.role)) {
    throw AppError.forbidden();
  }

  if (requester.role === 'Member' && member.user_id !== requester.id) {
    throw AppError.forbidden('You may only view your own trainer assignment history');
  }

  return trainersRepository.findAssignmentHistoryByMember(memberId);
}

module.exports = {
  registerTrainer,
  getTrainerProfile,
  updateTrainerProfile,
  assignTrainer,
  getAssignmentHistory,
};