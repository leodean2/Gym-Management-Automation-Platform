// tests/integration/trainer-workflow.test.js
//
// Automates Slice 2 (Trainer Workflow) — the longest manually-verified
// chain, crossing Features 5 (Trainer/Workout Programs), 7 (Workout
// Logging), and 8 (Progress/Personal Records):
//
//   Register Trainer -> assign to Member -> create Exercise Library entry
//   -> create Template -> Session -> TemplateExercise -> assign Template
//   -> Member creates WorkoutSession -> logs exercise (server-side
//   template_exercise_id derivation) -> finalizes session -> asserts a
//   PersonalRecord was created automatically.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const { createGymOwner, DEFAULT_PASSWORD } = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Slice 2 — Trainer Workflow', () => {
  let gymOwnerToken;

  beforeAll(async () => {
    const gymOwner = await createGymOwner();
    gymOwnerToken = await loginAs(app, gymOwner.email, DEFAULT_PASSWORD);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('creates a template, assigns it, logs a workout, finalizes, and produces a Personal Record', async () => {
    // --- Register Trainer ---
    const trainerEmail = `trainer-${Date.now()}@test.local`;
    const trainerResponse = await request(app)
      .post('/api/v1/trainers')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        email: trainerEmail,
        first_name: 'Mike',
        last_name: 'Coach',
        phone_number: '0711222333',
        specialization: 'Strength & Conditioning',
        hire_date: '2026-01-15',
      });

    expect(trainerResponse.status).toBe(201);
    const trainer = trainerResponse.body.data;
    expect(trainer.employee_number).toMatch(/^TRN-\d{4}-\d{6}$/);

    const trainerToken = await loginAs(app, trainerEmail, trainer.temporary_password);

    // --- Register Member ---
    const memberEmail = `member-${Date.now()}@test.local`;
    const memberResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        email: memberEmail,
        first_name: 'Jane',
        last_name: 'Test',
        phone_number: '0712345678',
        date_of_birth: '1995-06-15',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0798765432',
      });

    expect(memberResponse.status).toBe(201);
    const member = memberResponse.body.data;
    const memberToken = await loginAs(app, memberEmail, member.temporary_password);

    // --- Assign Trainer to Member ---
    const assignTrainerResponse = await request(app)
      .post(`/api/v1/members/${member.id}/assign-trainer`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ trainer_id: trainer.id });

    expect(assignTrainerResponse.status).toBe(200);
    expect(assignTrainerResponse.body.data.current_trainer_id).toBe(trainer.id);

    // --- Create Exercise Library entry (Weighted — PR-eligible) ---
    const exerciseResponse = await request(app)
      .post('/api/v1/exercise-library')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        name: `Barbell Bench Press ${Date.now()}`,
        description: 'Flat barbell bench press',
        exercise_type: 'Weighted',
        category: 'Strength',
        muscle_group: 'Chest',
      });

    expect(exerciseResponse.status).toBe(201);
    const exercise = exerciseResponse.body.data;

    // --- Create Workout Program Template (Trainer-only) ---
    const templateResponse = await request(app)
      .post('/api/v1/workout-program-templates')
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        name: 'Beginner Strength 8-Week',
        description: 'Foundational strength program',
        category: 'Strength',
        difficulty_level: 'Beginner',
        estimated_duration_weeks: 8,
      });

    expect(templateResponse.status).toBe(201);
    const template = templateResponse.body.data;
    expect(template.created_by).toBe(trainer.id);

    // --- Create Session on the Template ---
    const sessionTemplateResponse = await request(app)
      .post(`/api/v1/workout-program-templates/${template.id}/sessions`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        session_name: 'Day 1 - Upper Body',
        description: 'Push focus',
        session_order: 1,
      });

    expect(sessionTemplateResponse.status).toBe(201);
    const programSession = sessionTemplateResponse.body.data;

    // --- Add Exercise to the Session as a TemplateExercise ---
    const templateExerciseResponse = await request(app)
      .post(`/api/v1/workout-program-sessions/${programSession.id}/exercises`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        exercise_library_entry_id: exercise.id,
        exercise_order: 1,
        target_sets: 3,
        target_reps: '8-10',
        target_weight: 60,
        rest_seconds: 90,
      });

    expect(templateExerciseResponse.status).toBe(201);
    const templateExercise = templateExerciseResponse.body.data;

    // --- Assign Template to Member ---
    const assignTemplateResponse = await request(app)
      .post(`/api/v1/workout-program-templates/${template.id}/assign`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({
        member_id: member.id,
        start_date: new Date().toISOString().slice(0, 10),
      });

    expect(assignTemplateResponse.status).toBe(201);
    const assignment = assignTemplateResponse.body.data;
    expect(assignment.status).toBe('Active');

    // --- Member creates a WorkoutSession against the assignment ---
    const workoutSessionResponse = await request(app)
      .post('/api/v1/workout-sessions')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        workout_program_assignment_id: assignment.id,
        workout_program_session_id: programSession.id,
        session_date: new Date().toISOString().slice(0, 10),
      });

    expect(workoutSessionResponse.status).toBe(201);
    const workoutSession = workoutSessionResponse.body.data;
    expect(workoutSession.status).toBe('InProgress');

    // --- Member logs the exercise, deliberately above the target weight
    //     to trigger a new Personal Record ---
    const performedWeight = 65; // > target_weight: 60
    const logExerciseResponse = await request(app)
      .post(`/api/v1/workout-sessions/${workoutSession.id}/exercises`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        exercise_library_entry_id: exercise.id,
        performed_sets: 3,
        performed_reps: 9,
        performed_weight: performedWeight,
        rest_seconds: 90,
        perceived_exertion: 7,
      });

    expect(logExerciseResponse.status).toBe(201);
    const loggedExercise = logExerciseResponse.body.data;

    // Server-side prescribed-vs-ad-hoc derivation — never client-supplied.
    expect(loggedExercise.template_exercise_id).toBe(templateExercise.id);

    // --- Finalize the session ---
    const finalizeResponse = await request(app)
      .patch(`/api/v1/workout-sessions/${workoutSession.id}/finalize`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(finalizeResponse.status).toBe(200);
    expect(finalizeResponse.body.data.status).toBe('Finalized');

    // --- Assert a Personal Record was created automatically ---
    const personalRecordsResponse = await request(app)
      .get('/api/v1/personal-records')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(personalRecordsResponse.status).toBe(200);
    const records = personalRecordsResponse.body.data.items;
    expect(records).toHaveLength(1);
    expect(records[0].exercise_library_entry_id).toBe(exercise.id);
    expect(Number(records[0].best_weight)).toBe(performedWeight);
    expect(records[0].workout_exercise_id).toBe(loggedExercise.id);
  }, 60000);
});