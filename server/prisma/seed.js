// prisma/seed.js
//
// Comprehensive demo/development seed data — SuperAdmin, GymOwner,
// Receptionist, a Trainer, two Members, Membership Plans, Exercise
// Library entries, a Workout Program Template (with Session +
// TemplateExercises), and a Nutrition Plan Template.
//
// Writes directly via Prisma, NOT through the API/service layer —
// unlike tests/helpers, this script's job is fast, predictable data
// population, not exercising business logic. Idempotent: checks for a
// known seed marker (the SuperAdmin's email) and exits cleanly if
// already run, rather than creating duplicates on a second run.
//
// Run with: npx prisma db seed
// (wired via the "prisma".."seed" entry in package.json)

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_PASSWORD = 'Password123!';
const BCRYPT_COST_FACTOR = 12; // Matches NFR-S2's production default — this
// seeds a real dev database people will actually log into, unlike
// tests/helpers/seed.js's throwaway low-cost-factor test accounts.

/**
 * Generates the next sequential number in the same PREFIX-YYYY-NNNNNN
 * format used throughout the real app (e.g. generateInvoiceNumber in
 * memberships.service.js), but safe to run against a database that
 * already has real data in it — finds the current highest sequence for
 * this year and prefix, rather than assuming 000001. Prevents exactly
 * the P2002 unique-constraint collision this script hit when a
 * hardcoded 'TRN-2026-000001' already existed from prior manual/
 * automated testing.
 */
async function nextSequenceNumber(prefix, model, field) {
  const year = new Date().getFullYear();
  const existing = await model.findMany({
    where: { [field]: { startsWith: `${prefix}-${year}-` } },
    select: { [field]: true },
    orderBy: { [field]: 'desc' },
    take: 1,
  });

  let nextSequence = 1;
  if (existing.length > 0) {
    const lastNumber = existing[0][field];
    const lastSequence = parseInt(lastNumber.split('-')[2], 10);
    nextSequence = lastSequence + 1;
  }

  return `${prefix}-${year}-${String(nextSequence).padStart(6, '0')}`;
}

async function main() {
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@gymrocksfitness.com' },
  });
  if (existingSuperAdmin) {
    console.log('Seed data already present (superadmin@gymrocksfitness.com exists) — skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_COST_FACTOR);

  // --- Staff accounts ---------------------------------------------------
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'SuperAdmin',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  const gymOwner = await prisma.user.create({
    data: {
      email: 'owner@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'GymOwner',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      email: 'reception@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'Receptionist',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  console.log('Created staff accounts:', {
    superAdmin: superAdmin.email,
    gymOwner: gymOwner.email,
    receptionist: receptionist.email,
  });

  // --- Trainer ------------------------------------------------------------
  const trainerUser = await prisma.user.create({
    data: {
      email: 'mike.coach@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'Trainer',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  const trainer = await prisma.trainer.create({
    data: {
      user_id: trainerUser.id,
      created_by: superAdmin.id,
      employee_number: await nextSequenceNumber('TRN', prisma.trainer, 'employee_number'),
      first_name: 'Mike',
      last_name: 'Coach',
      phone_number: '0711222333',
      specialization: 'Strength & Conditioning',
      hire_date: new Date('2026-01-15'),
    },
  });

  console.log('Created trainer:', trainerUser.email);

  // --- Members --------------------------------------------------------------
  const memberOneUser = await prisma.user.create({
    data: {
      email: 'jane.member@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'Member',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  const memberOne = await prisma.member.create({
    data: {
      user_id: memberOneUser.id,
      created_by: receptionist.id,
      membership_number: await nextSequenceNumber('MEM', prisma.member, 'membership_number'),
      first_name: 'Jane',
      last_name: 'Doe',
      gender: 'Female',
      date_of_birth: new Date('1995-06-15'),
      phone_number: '0712345678',
      emergency_contact_name: 'John Doe',
      emergency_contact_phone: '0798765432',
      current_trainer_id: trainer.id,
    },
  });

  const memberTwoUser = await prisma.user.create({
    data: {
      email: 'sam.member@gymrocksfitness.com',
      password_hash: passwordHash,
      role: 'Member',
      account_status: 'Active',
      must_change_password: false,
    },
  });

  const memberTwo = await prisma.member.create({
    data: {
      user_id: memberTwoUser.id,
      created_by: receptionist.id,
      membership_number: await nextSequenceNumber('MEM', prisma.member, 'membership_number'),
      first_name: 'Sam',
      last_name: 'Smith',
      gender: 'Male',
      date_of_birth: new Date('1990-11-02'),
      phone_number: '0722333444',
      emergency_contact_name: 'Alex Smith',
      emergency_contact_phone: '0733444555',
      current_trainer_id: null, // deliberately unassigned — a realistic "new member" state
    },
  });

  console.log('Created members:', { memberOne: memberOneUser.email, memberTwo: memberTwoUser.email });

  // --- Membership Plans -----------------------------------------------------
  const [basicPlan, goldPlan, platinumPlan] = await Promise.all([
    prisma.membershipPlan.create({
      data: {
        name: 'Basic Monthly',
        description: 'Gym floor access only, no classes or trainer sessions included.',
        duration_days: 30,
        price: 2500,
        status: 'Active',
        created_by: gymOwner.id,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: 'Gold Monthly',
        description: 'Full gym access plus two group classes per week.',
        duration_days: 30,
        price: 5000,
        status: 'Active',
        created_by: gymOwner.id,
      },
    }),
    prisma.membershipPlan.create({
      data: {
        name: 'Platinum Quarterly',
        description: 'Full access, unlimited classes, one trainer session per week.',
        duration_days: 90,
        price: 15000,
        status: 'Active',
        created_by: gymOwner.id,
      },
    }),
  ]);

  console.log('Created membership plans:', [basicPlan.name, goldPlan.name, platinumPlan.name]);

  // --- Exercise Library -------------------------------------------------------
  const exercises = await Promise.all([
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Barbell Bench Press',
        description: 'Flat barbell bench press.',
        exercise_type: 'Weighted',
        category: 'Strength',
        muscle_group: 'Chest',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Barbell Back Squat',
        description: 'Standard back squat, barbell on traps.',
        exercise_type: 'Weighted',
        category: 'Strength',
        muscle_group: 'Legs',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Deadlift',
        description: 'Conventional stance barbell deadlift.',
        exercise_type: 'Weighted',
        category: 'Strength',
        muscle_group: 'Back',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Push-Up',
        description: 'Standard bodyweight push-up.',
        exercise_type: 'Bodyweight',
        category: 'Strength',
        muscle_group: 'Chest',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Pull-Up',
        description: 'Standard bodyweight pull-up, overhand grip.',
        exercise_type: 'Bodyweight',
        category: 'Strength',
        muscle_group: 'Back',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Treadmill Run',
        description: 'Steady-state treadmill running.',
        exercise_type: 'Cardio',
        category: 'Cardio',
        muscle_group: 'Full Body',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
    prisma.exerciseLibraryEntry.create({
      data: {
        name: 'Standing Hamstring Stretch',
        description: 'Static hamstring stretch, standing.',
        exercise_type: 'Bodyweight',
        category: 'Flexibility',
        muscle_group: 'Legs',
        status: 'Active',
        created_by: superAdmin.id,
      },
    }),
  ]);

  console.log(`Created ${exercises.length} exercise library entries.`);

  // --- Workout Program Template (with Session + TemplateExercises) --------------
  const workoutTemplate = await prisma.workoutProgramTemplate.create({
    data: {
      name: 'Beginner Strength 8-Week',
      description: 'Foundational full-body strength program for new members.',
      category: 'Strength',
      difficulty_level: 'Beginner',
      estimated_duration_weeks: 8,
      status: 'Active',
      created_by: trainer.id,
    },
  });

  const workoutSession = await prisma.workoutProgramSession.create({
    data: {
      workout_program_template_id: workoutTemplate.id,
      session_name: 'Day 1 — Full Body',
      description: 'Compound-lift focused full body session.',
      session_order: 1,
    },
  });

  await prisma.templateExercise.createMany({
    data: [
      {
        workout_program_session_id: workoutSession.id,
        exercise_library_entry_id: exercises[0].id, // Bench Press
        exercise_order: 1,
        target_sets: 3,
        target_reps: '8-10',
        target_weight: 40,
        rest_seconds: 90,
      },
      {
        workout_program_session_id: workoutSession.id,
        exercise_library_entry_id: exercises[1].id, // Back Squat
        exercise_order: 2,
        target_sets: 3,
        target_reps: '8-10',
        target_weight: 50,
        rest_seconds: 120,
      },
      {
        workout_program_session_id: workoutSession.id,
        exercise_library_entry_id: exercises[2].id, // Deadlift
        exercise_order: 3,
        target_sets: 3,
        target_reps: '5-6',
        target_weight: 60,
        rest_seconds: 150,
      },
    ],
  });

  console.log('Created workout program template with 1 session and 3 exercises.');

  // --- Nutrition Plan Template ------------------------------------------------
  await prisma.nutritionPlanTemplate.create({
    data: {
      name: 'Weight Loss Beginner',
      goal: 'WeightLoss',
      meal_guidelines: 'High protein, moderate carbs, low sugar. 4-5 small meals per day.',
      daily_calorie_target: 2200,
      protein_grams: 180,
      carbohydrates_grams: 180,
      fats_grams: 70,
      status: 'Active',
      created_by: trainer.id,
    },
  });

  console.log('Created nutrition plan template.');

  console.log('\n--- Seed complete ---');
  console.log(`All accounts use the password: ${SEED_PASSWORD}\n`);
  console.log('Login accounts:');
  console.log('  SuperAdmin:    superadmin@gymrocksfitness.com');
  console.log('  GymOwner:      owner@gymrocksfitness.com');
  console.log('  Receptionist:  reception@gymrocksfitness.com');
  console.log('  Trainer:       mike.coach@gymrocksfitness.com');
  console.log('  Member (1):    jane.member@gymrocksfitness.com  (assigned to Trainer)');
  console.log('  Member (2):    sam.member@gymrocksfitness.com   (unassigned)');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
