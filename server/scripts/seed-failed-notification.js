// scripts/seed-failed-notification.js
// One-off insert: creates a test Notification with status Failed, so we
// can exercise resendNotification's success path (Pending/Failed only).
//
// Usage: node scripts/seed-failed-notification.js <recipient_user_id>

const prisma = require('../src/config/db');

async function main() {
  const [, , recipientUserId] = process.argv;

  if (!recipientUserId) {
    console.error('Usage: node scripts/seed-failed-notification.js <recipient_user_id>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { id: recipientUserId } });
  if (!user) {
    console.error(`No user found with id ${recipientUserId}`);
    process.exit(1);
  }

  const notification = await prisma.notification.create({
    data: {
      notification_type: 'PaymentConfirmation',
      recipient_user_id: recipientUserId,
      recipient_email: user.email,
      related_entity_type: 'Membership',
      related_entity_id: recipientUserId,
      status: 'Failed',
    },
  });

  console.log('Created Failed test notification:');
  console.log(`  id: ${notification.id}`);
  console.log(`  status: ${notification.status}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());