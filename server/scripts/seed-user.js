// scripts/seed-user.js
// General-purpose bootstrap: creates a user with a given role directly,
// for any role that has no API-accessible creation path yet
// (SuperAdmin, GymOwner, Receptionist). Trainer/Member have proper
// registration endpoints once at least one staff account exists — this
// script is only for breaking the initial chicken-and-egg problem.
//
// Usage: node scripts/seed-user.js <email> <password> <role>
// Example: node scripts/seed-user.js reception@gymrocks.test ChangeMe123! Receptionist

const bcrypt = require('bcrypt');
const prisma = require('../src/config/db');
const { auth } = require('../src/config/env');

async function main() {
  const [, , email, plainPassword, role] = process.argv;

  if (!email || !plainPassword || !role) {
    console.error('Usage: node scripts/seed-user.js <email> <password> <role>');
    process.exit(1);
  }

  const validRoles = ['SuperAdmin', 'GymOwner', 'Receptionist'];
  if (!validRoles.includes(role)) {
    console.error(`Role must be one of: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id}, role: ${existing.role}) — not creating a duplicate.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(plainPassword, auth.bcryptCostFactor);

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role,
      account_status: 'Active',
      must_change_password: false,
    },
  });

  console.log(`Created ${role} user:`);
  console.log(`  email: ${email}`);
  console.log(`  password: ${plainPassword}`);
  console.log(`  id: ${user.id}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());