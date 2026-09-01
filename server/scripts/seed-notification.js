// scripts/seed-notification.js
// One-off insert: creates a test Notification directly, since nothing
// in the system automatically generates them yet (every module's
// "trigger a notification" step is an explicit TODO), and there is no
// POST /notifications endpoint by design (BR-11.1: system-generated
// only). This script exists purely to give the Notifications module
// real data to test against.
//
// Usage: node scripts/seed-notification.js <recipient_user_id>

const prisma = require('../src/config/db');

async function main() {
  const [, , recipientUserId] = process.argv;

  if (!recipientUserId) {
    console.error('Usage: node scripts/seed-notification.js <recipient_user_id>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: recipientUserId } });
  if (!user) {
    console.error(`No user found with id ${recipientUserId}`);
    process.exit(1);
  }

  const notification = await prisma.notification.create({
    data: {
      notification_type: 'MembershipActivated',
      recipient_user_id: recipientUserId,
      recipient_email: user.email,
      related_entity_type: 'Membership',
      related_entity_id: recipientUserId, // placeholder — see note below
      status: 'Sent',
      sent_at: new Date(),
    },
  });

  console.log('Created test notification:');
  console.log(`  id: ${notification.id}`);
  console.log(`  recipient: ${user.email}`);
  console.log(`  status: ${notification.status}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());