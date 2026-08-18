const attendanceRepository = require('./attendance.repository');
const AppError = require('../../lib/AppError');

function toDateOnly(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Shared by history/detail: GymOwner/Receptionist/SuperAdmin -> full;
 * Trainer -> assigned members only; Member -> self only. */
async function assertCanViewMember(member, requester) {
  if (['GymOwner', 'Receptionist', 'SuperAdmin'].includes(requester.role)) return;

  if (requester.role === 'Trainer') {
    const trainer = await attendanceRepository.findTrainerByUserId(requester.id);
    if (!trainer || member.current_trainer_id !== trainer.id) {
      throw AppError.forbidden('You are not the assigned trainer for this member');
    }
    return;
  }

  if (requester.role === 'Member') {
    if (member.user_id !== requester.id) {
      throw AppError.forbidden('You may only view your own attendance');
    }
    return;
  }

  throw AppError.forbidden();
}

// --- Check In (FR-4.1 / FR-4.2 / FR-4.4) ------------------------------------

async function checkIn({ member_id }, actingUser) {
  const member = await attendanceRepository.findMemberById(member_id);
  if (!member) {
    throw AppError.notFound('Member not found');
  }

  const membership = await attendanceRepository.findActiveMembershipByMember(member_id);
  if (!membership) {
    // Covers "no membership", "Expired", and "Suspended" in one check —
    // only an Active membership satisfies this query.
    throw AppError.conflict(
      'NO_ACTIVE_MEMBERSHIP',
      'This member does not have an eligible (active) membership'
    );
  }

  const today = toDateOnly(new Date());
  const existing = await attendanceRepository.findTodayPresentAttendance(member_id, today);
  if (existing) {
    throw AppError.conflict('ALREADY_CHECKED_IN', 'This member has already checked in today');
  }

  return attendanceRepository.createAttendance({
    member_id,
    membership_id: membership.id,
    attendance_date: today,
    check_in_time: new Date(),
    status: 'Present',
    created_by: actingUser.id,
  });
}

// --- History (FR-4.5) -------------------------------------------------------

async function getHistory(memberId, query, requester) {
  const member = await attendanceRepository.findMemberById(memberId);
  if (!member) {
    throw AppError.notFound('Member not found');
  }
  await assertCanViewMember(member, requester);

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await attendanceRepository.findHistory({
    memberId,
    from: query.from ? toDateOnly(query.from) : undefined,
    to: query.to ? toDateOnly(query.to) : undefined,
    skip,
    take: query.limit,
  });

  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, total_pages: Math.ceil(total / query.limit) },
  };
}

// --- Detail (audit view — Voided records ARE visible here, per FR-4.8) ----

async function getDetail(attendanceId, requester) {
  const record = await attendanceRepository.findAttendanceById(attendanceId);
  if (!record) {
    throw AppError.notFound('Attendance record not found');
  }
  await assertCanViewMember(record.member, requester);
  return record;
}

// --- Correct (FR-4.8, void-and-reissue) -------------------------------------

async function correct(attendanceId, { reason, corrected_check_in_time }, actingUser) {
  const original = await attendanceRepository.findAttendanceById(attendanceId);
  if (!original) {
    throw AppError.notFound('Attendance record not found');
  }
  if (original.status === 'Voided') {
    throw AppError.conflict('ALREADY_VOIDED', 'This attendance record has already been voided');
  }

  const replacementData = corrected_check_in_time
    ? {
        member_id: original.member_id,
        membership_id: original.membership_id,
        attendance_date: toDateOnly(corrected_check_in_time),
        check_in_time: corrected_check_in_time,
        status: 'Present',
        created_by: actingUser.id,
      }
    : null;

  const { voided, replacement } = await attendanceRepository.voidAndReplace(
    attendanceId,
    reason,
    replacementData
  );

  return replacement || voided;
}

module.exports = { checkIn, getHistory, getDetail, correct };
