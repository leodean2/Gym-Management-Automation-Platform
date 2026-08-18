# Scheduled Jobs

This folder holds the few processes in the system that are deliberately
**time-driven rather than user-triggered** — the explicit exceptions to the
"status changes happen via manual staff/trainer action" house style
established throughout the SRS.

Per FR-11.5, FR-13.3, FR-13.4, and FR-13.5, three jobs are needed:

| File (to create)              | Frequency | Rule |
|--------------------------------|-----------|------|
| `expireUnpaidMemberships.js`   | Hourly    | FR-11.5 — Pending memberships past the configured payment window (default 48h) auto-cancel. |
| `membershipExpiryReminders.js` | Daily     | FR-13.3 — Send a reminder for memberships expiring in 3 days. Dedup: one reminder per membership per expiry date. |
| `bookingReminders.js`          | Hourly    | FR-13.5 — Remind members of bookings starting within the configured window. Dedup: one reminder per booking. |

Each job should be idempotent (safe to run twice) and should never send a
duplicate notification for the same triggering event — see the relevant FR
for the exact dedup rule.

Wire these up with a scheduler (e.g. `node-cron` in-process for a
single-instance deployment, or a Railway/Vercel cron trigger calling a
dedicated endpoint) once the underlying modules (Memberships, Notifications)
are implemented.
