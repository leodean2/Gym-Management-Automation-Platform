const bcrypt = require('bcrypt');
const crypto = require('crypto');

const membersRepository = require('./members.repository');
const AppError = require('../../lib/AppError');
const { auth } = require('../../config/env');

// --- Helpers -----------------------------------------------------------

function generateTempPassword() {
  // Not intended to be memorable — the user changes it on first login
  // (FR-1.6). Random, URL-safe, sufficiently long.
  return crypto.randomBytes(9).toString('base64url');
}

/**
 * Generates a human-readable membership number in the form
 * MEM-<year>-<sequence>, retrying on the rare case of a concurrent
 * collision (two registrations landing on the same sequence number at
 * once). Mirrors the same concurrency concern flagged for Invoice/Receipt
 * numbering during the ER design phase.
 */
async function generateMembershipNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const existingCount = await membersRepository.countCreatedBetween(yearStart, yearEnd);
  const sequence = existingCount + 1;
  return `MEM-${year}-${String(sequence).padStart(6, '0')}`;
}

function toMemberDTO(member) {
  const { user, ...rest } = member;
  return rest;
}

// --- Register Member (FR-2.1) -------------------------------------------

/**
 * Creates the User (login identity, temp password, role=Member) and Member
 * (profile) atomically, per the frozen FR-2.1 design — a Receptionist or
 * Gym Owner registering a walk-in never ends up with an orphaned User row
 * and no profile, or vice versa.
 */
async function registerMember(input, actingUser) {
  const existingUser = await membersRepository.findUserByEmail(input.email);
  if (existingUser) {
    throw AppError.conflict('EMAIL_ALREADY_REGISTERED', 'This email is already registered');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, auth.bcryptCostFactor);

  // Retry a handful of times in the vanishingly unlikely case two
  // registrations race for the same generated membership number.
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    const membershipNumber = await generateMembershipNumber();
    try {
      const { member } = await membersRepository.createMemberWithUser({
        userData: {
          email: input.email,
          password_hash: passwordHash,
          role: 'Member',
          must_change_password: true,
        },
        memberData: {
          membership_number: membershipNumber,
          first_name: input.first_name,
          last_name: input.last_name,
          phone_number: input.phone_number,
          date_of_birth: input.date_of_birth,
          gender: input.gender,
          address: input.address,
          emergency_contact_name: input.emergency_contact_name,
          emergency_contact_phone: input.emergency_contact_phone,
          medical_notes: input.medical_notes,
          created_by: actingUser.id,
        },
      });

      // TODO (Feature 13): trigger the StaffAccountIssued notification via
      // Resend, containing tempPassword / a setup link, instead of
      // returning it directly. Returned here only because Notifications
      // isn't wired yet — remove `temporary_password` from the response
      // once it is.
      return { ...toMemberDTO(member), temporary_password: tempPassword };
    } catch (err) {
      if (err.code === 'P2002') {
        // Unique constraint collision (membership_number or email) — retry.
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// --- Get Member Profile (FR-2.3) ----------------------------------------

/**
 * Ownership/permission logic lives here, not in the controller or a route
 * middleware, because "can this requester see this specific member" depends
 * on data (who their assigned trainer is) that only the service layer
 * fetches. authorize() only answered "is this role ever allowed to hit this
 * endpoint" — this answers "is THIS request allowed."
 */
async function getMemberProfile(memberId, requester) {
  const member = await membersRepository.findById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  switch (requester.role) {
    case 'GymOwner':
    case 'Receptionist':
    case 'SuperAdmin':
      break; // full access

    case 'Trainer': {
      const trainer = await membersRepository.findTrainerByUserId(requester.id);
      if (!trainer || member.current_trainer_id !== trainer.id) {
        throw AppError.forbidden('You are not the assigned trainer for this member');
      }
      break;
    }

    case 'Member':
      if (member.user_id !== requester.id) {
        throw AppError.forbidden('You may only view your own profile');
      }
      break;

    default:
      throw AppError.forbidden();
  }

  return toMemberDTO(member);
}

// --- Search Members (FR-2.6) ---------------------------------------------

async function searchMembers(query, requester) {
  let trainerScope = null;

  if (requester.role === 'Trainer') {
    const trainer = await membersRepository.findTrainerByUserId(requester.id);
    if (!trainer) {
      throw AppError.forbidden();
    }
    trainerScope = trainer.id;
  }

  const where = membersRepository.buildSearchWhere({
    name: query.name,
    membership_number: query.membership_number,
    phone: query.phone,
    trainerScope,
  });

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await membersRepository.searchMembers({
    where,
    skip,
    take: query.limit,
  });

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: Math.ceil(total / query.limit),
    },
  };
}

// --- Update Member (FR-2.4) ----------------------------------------------

/**
 * Only reachable by GymOwner/Receptionist per routing (authorize()), so no
 * further ownership check is needed here. Member self-service editing
 * (FR-2.4's other half) is intentionally out of scope for this endpoint —
 * it belongs on a separate `/members/me` route with its own, narrower
 * field allowlist, not bolted onto the staff-facing update path.
 */
async function updateMember(memberId, updates) {
  const member = await membersRepository.findById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  const updated = await membersRepository.updateMember(memberId, updates);
  return toMemberDTO(updated);
}

module.exports = { registerMember, getMemberProfile, searchMembers, updateMember };
