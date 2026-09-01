-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Member', 'Trainer', 'Receptionist', 'GymOwner', 'SuperAdmin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "MembershipPlanStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('Pending', 'Active', 'Expired', 'Suspended', 'Cancelled');

-- CreateEnum
CREATE TYPE "MembershipHistoryEventType" AS ENUM ('InitialActivation', 'Renewal');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('Pending', 'Paid', 'Overdue', 'Voided', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('Successful', 'Voided');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('Issued', 'Voided');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'MPesa', 'Card');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Present', 'Voided');

-- CreateEnum
CREATE TYPE "WorkoutProgramCategory" AS ENUM ('Strength', 'Hypertrophy', 'Cardio', 'Rehabilitation');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- CreateEnum
CREATE TYPE "WorkoutProgramTemplateStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "WorkoutProgramAssignmentStatus" AS ENUM ('Active', 'Completed', 'Replaced');

-- CreateEnum
CREATE TYPE "NutritionGoal" AS ENUM ('WeightLoss', 'MuscleGain', 'Maintenance', 'Rehabilitation');

-- CreateEnum
CREATE TYPE "NutritionPlanTemplateStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "NutritionPlanAssignmentStatus" AS ENUM ('Active', 'Completed', 'Replaced');

-- CreateEnum
CREATE TYPE "WorkoutSessionStatus" AS ENUM ('InProgress', 'Finalized');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('Strength', 'Cardio', 'Flexibility', 'Mobility', 'Rehabilitation');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('Weighted', 'Bodyweight', 'Cardio');

-- CreateEnum
CREATE TYPE "ExerciseLibraryStatus" AS ENUM ('Active', 'Inactive');

-- CreateEnum
CREATE TYPE "TrainerAvailabilityStatus" AS ENUM ('Available', 'Unavailable');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Scheduled', 'Completed', 'Cancelled', 'NoShow');

-- CreateEnum
CREATE TYPE "BookingPreviousStatus" AS ENUM ('Completed', 'Cancelled', 'NoShow');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PasswordReset', 'PasswordChanged', 'StaffAccountIssued', 'MemberWelcome', 'MembershipActivated', 'MembershipRenewed', 'MembershipExpiryReminder', 'MembershipExpired', 'PaymentConfirmation', 'ReceiptGenerated', 'BookingConfirmation', 'BookingReminder', 'BookingCancelled', 'BookingRescheduled', 'InquirySubmitted');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('Email');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('Pending', 'Sent', 'Failed', 'Read');

-- CreateEnum
CREATE TYPE "RelatedEntityType" AS ENUM ('User', 'Member', 'Trainer', 'Membership', 'MembershipHistory', 'Invoice', 'PaymentTransaction', 'Receipt', 'Booking', 'Inquiry');

-- CreateEnum
CREATE TYPE "NotificationAttemptStatus" AS ENUM ('Queued', 'Sent', 'Failed');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('New', 'Contacted', 'Closed');

-- CreateEnum
CREATE TYPE "InquiryOutcome" AS ENUM ('Joined', 'NotInterested');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('LoginSucceeded', 'LoginFailed', 'AccountLocked', 'PasswordResetRequested', 'PasswordResetCompleted', 'PasswordChanged', 'UnauthorizedAccessAttempt', 'AccountStatusBlocked', 'CsvExportGenerated', 'NotificationManualResend');

-- CreateEnum
CREATE TYPE "AuditOutcome" AS ENUM ('Success', 'Failure');

-- CreateEnum
CREATE TYPE "AuditRelatedEntityType" AS ENUM ('User', 'Member', 'Trainer', 'Membership', 'Invoice', 'PaymentTransaction', 'Receipt', 'WorkoutProgramTemplate', 'NutritionPlanTemplate', 'WorkoutSession', 'Booking', 'Inquiry', 'Notification');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'Active',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "lockout_until" TIMESTAMP(3),
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "password_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "membership_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address" TEXT,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phone" TEXT NOT NULL,
    "medical_notes" TEXT,
    "profile_photo_url" TEXT,
    "current_trainer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "hire_date" DATE NOT NULL,
    "profile_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "MembershipPlanStatus" NOT NULL DEFAULT 'Active',
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "membership_plan_id" UUID NOT NULL,
    "start_date" DATE,
    "expiry_date" DATE,
    "status" "MembershipStatus" NOT NULL DEFAULT 'Pending',
    "suspended_reason" TEXT,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_history" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "membership_plan_id" UUID NOT NULL,
    "invoice_id" UUID,
    "event_type" "MembershipHistoryEventType" NOT NULL,
    "period_start_date" DATE NOT NULL,
    "period_expiry_date" DATE NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "membership_plan_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'Pending',
    "void_reason" TEXT,
    "issued_by" UUID NOT NULL,
    "replaces_invoice_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "transaction_reference" TEXT,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'Successful',
    "recorded_by" UUID NOT NULL,
    "replaces_payment_id" UUID,
    "void_reason" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "payment_transaction_id" UUID NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "status" "ReceiptStatus" NOT NULL DEFAULT 'Issued',
    "replaces_receipt_id" UUID,
    "void_reason" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "check_in_time" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'Present',
    "created_by" UUID NOT NULL,
    "replaces_attendance_id" UUID,
    "correction_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "WorkoutProgramCategory" NOT NULL,
    "difficulty_level" "DifficultyLevel" NOT NULL,
    "estimated_duration_weeks" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "status" "WorkoutProgramTemplateStatus" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_program_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_sessions" (
    "id" UUID NOT NULL,
    "workout_program_template_id" UUID NOT NULL,
    "session_name" TEXT NOT NULL,
    "description" TEXT,
    "session_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_program_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_exercises" (
    "id" UUID NOT NULL,
    "workout_program_session_id" UUID NOT NULL,
    "exercise_library_entry_id" UUID NOT NULL,
    "exercise_order" INTEGER NOT NULL,
    "target_sets" INTEGER NOT NULL,
    "target_reps" TEXT NOT NULL,
    "target_weight" DECIMAL(6,2),
    "rest_seconds" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_program_assignments" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "workout_program_template_id" UUID NOT NULL,
    "start_date" DATE,
    "assigned_date" DATE NOT NULL,
    "completion_date" DATE,
    "assignment_notes" TEXT,
    "status" "WorkoutProgramAssignmentStatus" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_program_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_assignment_history" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "previous_trainer_id" UUID,
    "new_trainer_id" UUID NOT NULL,
    "reassigned_by" UUID NOT NULL,
    "reassigned_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_assignment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_plan_templates" (
    "id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "goal" "NutritionGoal" NOT NULL,
    "meal_guidelines" TEXT NOT NULL,
    "daily_calorie_target" INTEGER,
    "protein_grams" INTEGER,
    "carbohydrates_grams" INTEGER,
    "fats_grams" INTEGER,
    "status" "NutritionPlanTemplateStatus" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_plan_assignments" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "nutrition_plan_template_id" UUID NOT NULL,
    "assigned_date" DATE NOT NULL,
    "start_date" DATE,
    "completion_date" DATE,
    "status" "NutritionPlanAssignmentStatus" NOT NULL DEFAULT 'Active',
    "assignment_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_plan_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "workout_program_assignment_id" UUID NOT NULL,
    "workout_program_session_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "status" "WorkoutSessionStatus" NOT NULL DEFAULT 'InProgress',
    "finalized_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" UUID NOT NULL,
    "workout_session_id" UUID NOT NULL,
    "template_exercise_id" UUID,
    "exercise_library_entry_id" UUID NOT NULL,
    "performed_sets" INTEGER,
    "performed_reps" INTEGER,
    "performed_weight" DECIMAL(6,2),
    "rest_seconds" INTEGER,
    "duration_seconds" INTEGER,
    "distance" DECIMAL(8,2),
    "perceived_exertion" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_session_reopen_history" (
    "id" UUID NOT NULL,
    "workout_session_id" UUID NOT NULL,
    "reopened_by" UUID NOT NULL,
    "reopened_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_session_reopen_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_measurements" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "recorded_by" UUID NOT NULL,
    "measurement_date" DATE NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "body_fat_percentage" DECIMAL(5,2),
    "chest_cm" DECIMAL(5,2),
    "waist_cm" DECIMAL(5,2),
    "hips_cm" DECIMAL(5,2),
    "left_arm_cm" DECIMAL(5,2),
    "right_arm_cm" DECIMAL(5,2),
    "left_thigh_cm" DECIMAL(5,2),
    "right_thigh_cm" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "exercise_library_entry_id" UUID NOT NULL,
    "workout_exercise_id" UUID NOT NULL,
    "best_weight" DECIMAL(6,2) NOT NULL,
    "achieved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_library_entries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "exercise_type" "ExerciseType" NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "description" TEXT,
    "status" "ExerciseLibraryStatus" NOT NULL DEFAULT 'Active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_library_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_availability" (
    "id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "availability_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "TrainerAvailabilityStatus" NOT NULL DEFAULT 'Available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "trainer_id" UUID NOT NULL,
    "trainer_availability_id" UUID NOT NULL,
    "booking_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'Scheduled',
    "cancellation_reason" TEXT,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reschedule_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "previous_booking_date" DATE NOT NULL,
    "previous_start_time" TIME(6) NOT NULL,
    "previous_end_time" TIME(6) NOT NULL,
    "new_booking_date" DATE NOT NULL,
    "new_start_time" TIME(6) NOT NULL,
    "new_end_time" TIME(6) NOT NULL,
    "rescheduled_by" UUID NOT NULL,
    "rescheduled_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "booking_reschedule_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_reopen_history" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "previous_status" "BookingPreviousStatus" NOT NULL,
    "reopened_by" UUID NOT NULL,
    "reopened_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "booking_reopen_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "recipient_user_id" UUID,
    "recipient_email" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'Email',
    "related_entity_type" "RelatedEntityType" NOT NULL,
    "related_entity_id" UUID NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'Pending',
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attempts" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "NotificationAttemptStatus" NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL,
    "provider_message_id" TEXT,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'New',
    "outcome" "InquiryOutcome",
    "linked_member_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_follow_up_notes" (
    "id" UUID NOT NULL,
    "inquiry_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiry_follow_up_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" "AuditEventType" NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" "AuditOutcome" NOT NULL,
    "related_entity_type" "AuditRelatedEntityType",
    "related_entity_id" UUID,
    "ip_address" inet,
    "user_agent" TEXT,
    "details" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_membership_number_key" ON "members"("membership_number");

-- CreateIndex
CREATE INDEX "members_current_trainer_id_idx" ON "members"("current_trainer_id");

-- CreateIndex
CREATE INDEX "members_created_by_idx" ON "members"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_user_id_key" ON "trainers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_employee_number_key" ON "trainers"("employee_number");

-- CreateIndex
CREATE INDEX "trainers_created_by_idx" ON "trainers"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_name_key" ON "membership_plans"("name");

-- CreateIndex
CREATE INDEX "membership_plans_created_by_idx" ON "membership_plans"("created_by");

-- CreateIndex
CREATE INDEX "membership_plans_updated_by_idx" ON "membership_plans"("updated_by");

-- CreateIndex
CREATE INDEX "memberships_member_id_idx" ON "memberships"("member_id");

-- CreateIndex
CREATE INDEX "memberships_membership_plan_id_idx" ON "memberships"("membership_plan_id");

-- CreateIndex
CREATE INDEX "memberships_created_by_idx" ON "memberships"("created_by");

-- CreateIndex
CREATE INDEX "memberships_updated_by_idx" ON "memberships"("updated_by");

-- CreateIndex
CREATE INDEX "membership_history_membership_id_idx" ON "membership_history"("membership_id");

-- CreateIndex
CREATE INDEX "membership_history_member_id_idx" ON "membership_history"("member_id");

-- CreateIndex
CREATE INDEX "membership_history_membership_plan_id_idx" ON "membership_history"("membership_plan_id");

-- CreateIndex
CREATE INDEX "membership_history_invoice_id_idx" ON "membership_history"("invoice_id");

-- CreateIndex
CREATE INDEX "membership_history_recorded_by_idx" ON "membership_history"("recorded_by");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_membership_id_idx" ON "invoices"("membership_id");

-- CreateIndex
CREATE INDEX "invoices_membership_plan_id_idx" ON "invoices"("membership_plan_id");

-- CreateIndex
CREATE INDEX "invoices_issued_by_idx" ON "invoices"("issued_by");

-- CreateIndex
CREATE INDEX "invoices_replaces_invoice_id_idx" ON "invoices"("replaces_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_invoice_id_key" ON "payment_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "payment_transactions_recorded_by_idx" ON "payment_transactions"("recorded_by");

-- CreateIndex
CREATE INDEX "payment_transactions_replaces_payment_id_idx" ON "payment_transactions"("replaces_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_transaction_id_key" ON "receipts"("payment_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "receipts_replaces_receipt_id_idx" ON "receipts"("replaces_receipt_id");

-- CreateIndex
CREATE INDEX "attendance_member_id_idx" ON "attendance"("member_id");

-- CreateIndex
CREATE INDEX "attendance_membership_id_idx" ON "attendance"("membership_id");

-- CreateIndex
CREATE INDEX "attendance_created_by_idx" ON "attendance"("created_by");

-- CreateIndex
CREATE INDEX "attendance_replaces_attendance_id_idx" ON "attendance"("replaces_attendance_id");

-- CreateIndex
CREATE INDEX "workout_program_templates_created_by_idx" ON "workout_program_templates"("created_by");

-- CreateIndex
CREATE INDEX "workout_program_sessions_workout_program_template_id_idx" ON "workout_program_sessions"("workout_program_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_program_sessions_workout_program_template_id_sessio_key" ON "workout_program_sessions"("workout_program_template_id", "session_order");

-- CreateIndex
CREATE INDEX "template_exercises_workout_program_session_id_idx" ON "template_exercises"("workout_program_session_id");

-- CreateIndex
CREATE INDEX "template_exercises_exercise_library_entry_id_idx" ON "template_exercises"("exercise_library_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_exercises_workout_program_session_id_exercise_orde_key" ON "template_exercises"("workout_program_session_id", "exercise_order");

-- CreateIndex
CREATE INDEX "workout_program_assignments_member_id_idx" ON "workout_program_assignments"("member_id");

-- CreateIndex
CREATE INDEX "workout_program_assignments_trainer_id_idx" ON "workout_program_assignments"("trainer_id");

-- CreateIndex
CREATE INDEX "workout_program_assignments_workout_program_template_id_idx" ON "workout_program_assignments"("workout_program_template_id");

-- CreateIndex
CREATE INDEX "trainer_assignment_history_member_id_idx" ON "trainer_assignment_history"("member_id");

-- CreateIndex
CREATE INDEX "trainer_assignment_history_previous_trainer_id_idx" ON "trainer_assignment_history"("previous_trainer_id");

-- CreateIndex
CREATE INDEX "trainer_assignment_history_new_trainer_id_idx" ON "trainer_assignment_history"("new_trainer_id");

-- CreateIndex
CREATE INDEX "trainer_assignment_history_reassigned_by_idx" ON "trainer_assignment_history"("reassigned_by");

-- CreateIndex
CREATE INDEX "nutrition_plan_templates_created_by_idx" ON "nutrition_plan_templates"("created_by");

-- CreateIndex
CREATE INDEX "nutrition_plan_assignments_member_id_idx" ON "nutrition_plan_assignments"("member_id");

-- CreateIndex
CREATE INDEX "nutrition_plan_assignments_trainer_id_idx" ON "nutrition_plan_assignments"("trainer_id");

-- CreateIndex
CREATE INDEX "nutrition_plan_assignments_nutrition_plan_template_id_idx" ON "nutrition_plan_assignments"("nutrition_plan_template_id");

-- CreateIndex
CREATE INDEX "workout_sessions_member_id_idx" ON "workout_sessions"("member_id");

-- CreateIndex
CREATE INDEX "workout_sessions_workout_program_assignment_id_idx" ON "workout_sessions"("workout_program_assignment_id");

-- CreateIndex
CREATE INDEX "workout_sessions_workout_program_session_id_idx" ON "workout_sessions"("workout_program_session_id");

-- CreateIndex
CREATE INDEX "workout_exercises_workout_session_id_idx" ON "workout_exercises"("workout_session_id");

-- CreateIndex
CREATE INDEX "workout_exercises_template_exercise_id_idx" ON "workout_exercises"("template_exercise_id");

-- CreateIndex
CREATE INDEX "workout_exercises_exercise_library_entry_id_idx" ON "workout_exercises"("exercise_library_entry_id");

-- CreateIndex
CREATE INDEX "workout_session_reopen_history_workout_session_id_idx" ON "workout_session_reopen_history"("workout_session_id");

-- CreateIndex
CREATE INDEX "workout_session_reopen_history_reopened_by_idx" ON "workout_session_reopen_history"("reopened_by");

-- CreateIndex
CREATE INDEX "body_measurements_member_id_idx" ON "body_measurements"("member_id");

-- CreateIndex
CREATE INDEX "body_measurements_recorded_by_idx" ON "body_measurements"("recorded_by");

-- CreateIndex
CREATE INDEX "body_measurements_measurement_date_idx" ON "body_measurements"("measurement_date");

-- CreateIndex
CREATE INDEX "personal_records_member_id_idx" ON "personal_records"("member_id");

-- CreateIndex
CREATE INDEX "personal_records_exercise_library_entry_id_idx" ON "personal_records"("exercise_library_entry_id");

-- CreateIndex
CREATE INDEX "personal_records_workout_exercise_id_idx" ON "personal_records"("workout_exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_records_member_id_exercise_library_entry_id_key" ON "personal_records"("member_id", "exercise_library_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_library_entries_name_key" ON "exercise_library_entries"("name");

-- CreateIndex
CREATE INDEX "exercise_library_entries_created_by_idx" ON "exercise_library_entries"("created_by");

-- CreateIndex
CREATE INDEX "trainer_availability_trainer_id_idx" ON "trainer_availability"("trainer_id");

-- CreateIndex
CREATE INDEX "trainer_availability_availability_date_idx" ON "trainer_availability"("availability_date");

-- CreateIndex
CREATE INDEX "bookings_member_id_idx" ON "bookings"("member_id");

-- CreateIndex
CREATE INDEX "bookings_trainer_id_idx" ON "bookings"("trainer_id");

-- CreateIndex
CREATE INDEX "bookings_trainer_availability_id_idx" ON "bookings"("trainer_availability_id");

-- CreateIndex
CREATE INDEX "bookings_booking_date_idx" ON "bookings"("booking_date");

-- CreateIndex
CREATE INDEX "booking_reschedule_history_booking_id_idx" ON "booking_reschedule_history"("booking_id");

-- CreateIndex
CREATE INDEX "booking_reschedule_history_rescheduled_by_idx" ON "booking_reschedule_history"("rescheduled_by");

-- CreateIndex
CREATE INDEX "booking_reopen_history_booking_id_idx" ON "booking_reopen_history"("booking_id");

-- CreateIndex
CREATE INDEX "booking_reopen_history_reopened_by_idx" ON "booking_reopen_history"("reopened_by");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_idx" ON "notifications"("recipient_user_id");

-- CreateIndex
CREATE INDEX "notifications_notification_type_idx" ON "notifications"("notification_type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notification_attempts_notification_id_idx" ON "notification_attempts"("notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_attempts_notification_id_attempt_number_key" ON "notification_attempts"("notification_id", "attempt_number");

-- CreateIndex
CREATE INDEX "inquiries_status_idx" ON "inquiries"("status");

-- CreateIndex
CREATE INDEX "inquiries_linked_member_id_idx" ON "inquiries"("linked_member_id");

-- CreateIndex
CREATE INDEX "inquiry_follow_up_notes_inquiry_id_idx" ON "inquiry_follow_up_notes"("inquiry_id");

-- CreateIndex
CREATE INDEX "inquiry_follow_up_notes_created_by_idx" ON "inquiry_follow_up_notes"("created_by");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_idx" ON "audit_logs"("event_type");

-- CreateIndex
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_related_entity_type_related_entity_id_idx" ON "audit_logs"("related_entity_type", "related_entity_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_current_trainer_id_fkey" FOREIGN KEY ("current_trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_membership_plan_id_fkey" FOREIGN KEY ("membership_plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_membership_plan_id_fkey" FOREIGN KEY ("membership_plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membership_plan_id_fkey" FOREIGN KEY ("membership_plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_replaces_invoice_id_fkey" FOREIGN KEY ("replaces_invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_replaces_payment_id_fkey" FOREIGN KEY ("replaces_payment_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_replaces_receipt_id_fkey" FOREIGN KEY ("replaces_receipt_id") REFERENCES "receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_replaces_attendance_id_fkey" FOREIGN KEY ("replaces_attendance_id") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_templates" ADD CONSTRAINT "workout_program_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_sessions" ADD CONSTRAINT "workout_program_sessions_workout_program_template_id_fkey" FOREIGN KEY ("workout_program_template_id") REFERENCES "workout_program_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_workout_program_session_id_fkey" FOREIGN KEY ("workout_program_session_id") REFERENCES "workout_program_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_exercise_library_entry_id_fkey" FOREIGN KEY ("exercise_library_entry_id") REFERENCES "exercise_library_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_assignments" ADD CONSTRAINT "workout_program_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_assignments" ADD CONSTRAINT "workout_program_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_program_assignments" ADD CONSTRAINT "workout_program_assignments_workout_program_template_id_fkey" FOREIGN KEY ("workout_program_template_id") REFERENCES "workout_program_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignment_history" ADD CONSTRAINT "trainer_assignment_history_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignment_history" ADD CONSTRAINT "trainer_assignment_history_previous_trainer_id_fkey" FOREIGN KEY ("previous_trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignment_history" ADD CONSTRAINT "trainer_assignment_history_new_trainer_id_fkey" FOREIGN KEY ("new_trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_assignment_history" ADD CONSTRAINT "trainer_assignment_history_reassigned_by_fkey" FOREIGN KEY ("reassigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plan_templates" ADD CONSTRAINT "nutrition_plan_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plan_assignments" ADD CONSTRAINT "nutrition_plan_assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plan_assignments" ADD CONSTRAINT "nutrition_plan_assignments_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_plan_assignments" ADD CONSTRAINT "nutrition_plan_assignments_nutrition_plan_template_id_fkey" FOREIGN KEY ("nutrition_plan_template_id") REFERENCES "nutrition_plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_program_assignment_id_fkey" FOREIGN KEY ("workout_program_assignment_id") REFERENCES "workout_program_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_program_session_id_fkey" FOREIGN KEY ("workout_program_session_id") REFERENCES "workout_program_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_finalized_by_fkey" FOREIGN KEY ("finalized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_template_exercise_id_fkey" FOREIGN KEY ("template_exercise_id") REFERENCES "template_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_library_entry_id_fkey" FOREIGN KEY ("exercise_library_entry_id") REFERENCES "exercise_library_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_session_reopen_history" ADD CONSTRAINT "workout_session_reopen_history_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "workout_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_session_reopen_history" ADD CONSTRAINT "workout_session_reopen_history_reopened_by_fkey" FOREIGN KEY ("reopened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_library_entry_id_fkey" FOREIGN KEY ("exercise_library_entry_id") REFERENCES "exercise_library_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_library_entries" ADD CONSTRAINT "exercise_library_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trainer_availability_id_fkey" FOREIGN KEY ("trainer_availability_id") REFERENCES "trainer_availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedule_history" ADD CONSTRAINT "booking_reschedule_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reschedule_history" ADD CONSTRAINT "booking_reschedule_history_rescheduled_by_fkey" FOREIGN KEY ("rescheduled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reopen_history" ADD CONSTRAINT "booking_reopen_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_reopen_history" ADD CONSTRAINT "booking_reopen_history_reopened_by_fkey" FOREIGN KEY ("reopened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_attempts" ADD CONSTRAINT "notification_attempts_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_linked_member_id_fkey" FOREIGN KEY ("linked_member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_follow_up_notes" ADD CONSTRAINT "inquiry_follow_up_notes_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiry_follow_up_notes" ADD CONSTRAINT "inquiry_follow_up_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
