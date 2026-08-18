const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { clientOrigin } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./modules/auth/auth.routes');
const memberRoutes = require('./modules/members/members.routes');
const { plansRouter, membershipsRouter, historyRouter } = require('./modules/memberships/memberships.routes');
const { attendanceRouter, historyRouter: attendanceHistoryRouter } = require('./modules/attendance/attendance.routes');
const { trainersRouter, memberTrainerRouter } = require('./modules/trainer-workouts/trainer-workouts.routes');
// TODO: as each module is implemented, require and mount its routes below,
// following the same pattern as authRoutes / memberRoutes.

const app = express();

// NFR-S7: standard security headers (HSTS, X-Content-Type-Options,
// X-Frame-Options, CSP) via helmet's defaults.
app.use(helmet());

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());

// NFR-S3: general rate limit applied to all routes; specific endpoints
// (login, inquiries) layer on their own tighter limiter.
app.use(generalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ data: { status: 'ok' }, error: null });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/members', historyRouter); // adds GET /:id/membership-history
app.use('/api/v1/membership-plans', plansRouter);
app.use('/api/v1/memberships', membershipsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/members', attendanceHistoryRouter); // adds GET /:memberId/attendance
app.use('/api/v1/trainers', trainersRouter);
app.use('/api/v1/members', memberTrainerRouter); // adds POST /:memberId/assign-trainer, GET /:memberId/trainer-history
// ...remaining 9 modules mount here as they're built.

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