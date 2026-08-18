const CHECKIN_ROLES = ['GymOwner', 'Receptionist', 'SuperAdmin'];
const VIEW_ROLES = ['GymOwner', 'Receptionist', 'Trainer', 'Member', 'SuperAdmin'];
const CORRECT_ROLES = ['GymOwner', 'SuperAdmin']; // Receptionist deliberately excluded, per FR-4.8

module.exports = { CHECKIN_ROLES, VIEW_ROLES, CORRECT_ROLES };
