// scripts/seed-superadmin.js
// One-off bootstrap: creates the first SuperAdmin user directly, since
// every other user-creation path requires an already-authenticated
// staff member. Run once, then this script (or at least this account's
// password) should be treated as something to rotate/secure — it's not
// part of the normal registration flow and shouldn't be re-run against
// a database that already has users.

const bcrypt = require('bcrypt');
const prisma = require('../src/config/db');
const { auth } = require('../src/config/env');

async function main() {
  const email = 'admin@gymrocks.test'; // change if you want a different email
  const plainPassword = 'ChangeMe123!'; // change this, and change it again after first login

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (id: ${existing.id}) — not creating a duplicate.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(plainPassword, auth.bcryptCostFactor);

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: passwordHash,
      role: 'SuperAdmin',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  console.log('Created SuperAdmin user:');
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