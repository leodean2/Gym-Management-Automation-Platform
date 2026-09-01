const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const { clientOrigin } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./modules/auth/auth.routes');
const memberRoutes = require('./modules/members/members.routes');
const { plansRouter, membershipsRouter, historyRouter } = require('./modules/memberships/memberships.routes');
const { attendanceRouter, historyRouter: attendanceHistoryRouter } = require('./modules/attendance/attendance.routes');
const { trainersRouter, memberTrainerRouter: trainerAssignmentHistoryRouter } = require('./modules/trainer-workouts/trainer-workouts.routes');
const {
  templatesRouter: workoutTemplatesRouter,
  sessionsRouter: workoutProgramSessionsRouter,
  exercisesRouter: templateExercisesRouter,
  assignmentsRouter: workoutAssignmentsRouter,
  historyRouter: workoutProgramHistoryRouter,
} = require('./modules/trainer-workouts/workout-programs.routes');
const {
  templatesRouter: nutritionTemplatesRouter,
  assignmentsRouter: nutritionAssignmentsRouter,
  memberPlanRouter: nutritionMemberPlanRouter,
} = require('./modules/nutrition/nutrition.routes');
const {
  sessionsRouter: workoutLoggingSessionsRouter,
  exercisesRouter: workoutExercisesRouter,
} = require('./modules/workout-logging/workout-logging.routes');
const {
  measurementsRouter,
  personalRecordsRouter,
} = require('./modules/progress/progress.routes');
const exerciseLibraryRoutes = require('./modules/exercise-library/exercise-library.routes');
const {
  availabilityRouter: trainerAvailabilityRouter,
  bookingsRouter,
} = require('./modules/booking/booking.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const {
  invoicesRouter,
  paymentTransactionsRouter,
  receiptsRouter,
  paymentHistoryRouter,
} = require('./modules/payments/payments.routes');
const inquiriesRoutes = require('./modules/inquiries/inquiries.routes');

const app = express();

// NFR-S7: standard security headers (HSTS, X-Content-Type-Options,
// X-Frame-Options, CSP) via helmet's defaults.
app.use(helmet());

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());

// NFR-S3: general rate limit applied to all routes; Login and Inquiry
// submission layer on their own tighter limiters within their own route
// files (loginLimiter in auth.routes.js, inquiryLimiter in
// inquiries.routes.js).
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ data: { status: 'ok' }, error: null });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/members', historyRouter); // adds GET /:id/membership-history
app.use('/api/v1/membership-plans', plansRouter);
app.use('/api/v1/memberships', membershipsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/members', attendanceHistoryRouter); // adds GET /:memberId/attendance
app.use('/api/v1/trainers', trainersRouter);
app.use('/api/v1/members', trainerAssignmentHistoryRouter); // adds POST /:memberId/assign-trainer, GET /:memberId/trainer-history
app.use('/api/v1/workout-program-templates', workoutTemplatesRouter);
app.use('/api/v1/workout-program-sessions', workoutProgramSessionsRouter);
app.use('/api/v1/template-exercises', templateExercisesRouter);
app.use('/api/v1/workout-program-assignments', workoutAssignmentsRouter);
app.use('/api/v1/members', workoutProgramHistoryRouter); // adds GET /:memberId/workout-program-assignments
app.use('/api/v1/nutrition-plan-templates', nutritionTemplatesRouter);
app.use('/api/v1/nutrition-plan-assignments', nutritionAssignmentsRouter);
app.use('/api/v1/members', nutritionMemberPlanRouter); // adds GET /:memberId/nutrition-plan
app.use('/api/v1/workout-sessions', workoutLoggingSessionsRouter);
app.use('/api/v1/workout-exercises', workoutExercisesRouter);
app.use('/api/v1/body-measurements', measurementsRouter);
app.use('/api/v1/personal-records', personalRecordsRouter);
app.use('/api/v1/exercise-library', exerciseLibraryRoutes);
app.use('/api/v1/trainer-availability', trainerAvailabilityRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/payment-transactions', paymentTransactionsRouter);
app.use('/api/v1/receipts', receiptsRouter);
app.use('/api/v1/members', paymentHistoryRouter); // adds GET /:memberId/payment-history
app.use('/api/v1/inquiries', inquiriesRoutes);
// All 14 SRS features are now mounted.

// 404 handler - must come after all routes, before the error handler.
app.use((req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Global error handler - must be LAST.
app.use(errorHandler);

module.exports = app;