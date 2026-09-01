// tests/integration/bookings2.test.js
//
// Automates Slice 3 (Booking) — Create Availability -> Book Session ->
// attempt overlapping booking -> expect rejection. Two members are
// created sharing one trainer specifically to isolate the TRAINER-side
// overlap check from the MEMBER-side one: if the same member attempted
// the second booking, the member-overlap check would catch it first
// (as we saw during manual testing), never actually exercising
// findOverlappingTrainerBooking or the underlying exclusion constraint.

const request = require('supertest');
const app = require('../helpers/testApp');
const testPrisma = require('../helpers/testDb');
const { createGymOwner, createReceptionist, DEFAULT_PASSWORD } = require('../helpers/seed');
const { loginAs } = require('../helpers/auth');

describe('Slice 3 — Booking (bookings2)', () => {
  let gymOwnerToken;
  let receptionToken;
  let trainer;
  let trainerToken;
  let memberA;
  let memberB;
  let memberAToken;
  let memberBToken;

  // Use a fixed future date so the "cannot be in the past" validation
  // never bites this test — far enough out to stay valid indefinitely.
  const bookingDate = '2099-01-15';

  beforeAll(async () => {
    const gymOwner = await createGymOwner();
    gymOwnerToken = await loginAs(app, gymOwner.email, DEFAULT_PASSWORD);

    const receptionist = await createReceptionist();
    receptionToken = await loginAs(app, receptionist.email, DEFAULT_PASSWORD);

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
    trainer = trainerResponse.body.data;

    trainerToken = await loginAs(app, trainerEmail, trainer.temporary_password);

    // --- Register two Members, both assigned to this Trainer ---
    const memberAEmail = `member-a-${Date.now()}@test.local`;
    const memberAResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        email: memberAEmail,
        first_name: 'Jane',
        last_name: 'First',
        phone_number: '0712345678',
        date_of_birth: '1995-06-15',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0798765432',
      });
    expect(memberAResponse.status).toBe(201);
    memberA = memberAResponse.body.data;
    memberAToken = await loginAs(app, memberAEmail, memberA.temporary_password);

    const memberBEmail = `member-b-${Date.now()}@test.local`;
    const memberBResponse = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        email: memberBEmail,
        first_name: 'Sara',
        last_name: 'Second',
        phone_number: '0722333444',
        date_of_birth: '1998-03-10',
        gender: 'Female',
        emergency_contact_name: 'Emergency Contact',
        emergency_contact_phone: '0733444555',
      });
    expect(memberBResponse.status).toBe(201);
    memberB = memberBResponse.body.data;
    memberBToken = await loginAs(app, memberBEmail, memberB.temporary_password);

    await request(app)
      .post(`/api/v1/members/${memberA.id}/assign-trainer`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ trainer_id: trainer.id });

    await request(app)
      .post(`/api/v1/members/${memberB.id}/assign-trainer`)
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({ trainer_id: trainer.id });

    // --- Create Trainer Availability covering the whole test window ---
    const availResp = await request(app)
      .post('/api/v1/trainer-availability')
      .set('Authorization', `Bearer ${gymOwnerToken}`)
      .send({
        trainer_id: trainer.id,
        availability_date: bookingDate,
        start_time: '09:00',
        end_time: '17:00',
      });
    expect(availResp.status).toBe(201);
  }, 60000);

  afterAll(async () => {
    await testPrisma.$disconnect();
  }, 30000);

  it('creates a booking successfully within an available slot', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({
        member_id: memberA.id,
        trainer_id: trainer.id,
        booking_date: bookingDate,
        start_time: '10:00',
        end_time: '11:00',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.data.status).toBe('Scheduled');
    expect(response.body.data.data.trainer_availability_id).toBeDefined();
  });

  it('rejects a second booking for the SAME member that overlaps their own existing booking', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({
        member_id: memberA.id,
        trainer_id: trainer.id,
        booking_date: bookingDate,
        start_time: '10:30',
        end_time: '11:30',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('MEMBER_ALREADY_BOOKED');
  });

  it('rejects a DIFFERENT member booking the same trainer at an overlapping time', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${memberBToken}`)
      .send({
        member_id: memberB.id,
        trainer_id: trainer.id,
        booking_date: bookingDate,
        start_time: '10:30',
        end_time: '11:30',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TRAINER_ALREADY_BOOKED');
  });

  it('allows a DIFFERENT member to book the SAME trainer at a non-overlapping time', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${memberBToken}`)
      .send({
        member_id: memberB.id,
        trainer_id: trainer.id,
        booking_date: bookingDate,
        start_time: '14:00',
        end_time: '15:00',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.data.status).toBe('Scheduled');
  });

  it('rejects a booking outside any available slot', async () => {
    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({
        member_id: memberA.id,
        trainer_id: trainer.id,
        booking_date: bookingDate,
        start_time: '18:00', // availability ends at 17:00
        end_time: '19:00',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NO_COVERING_AVAILABILITY');
  });
});
