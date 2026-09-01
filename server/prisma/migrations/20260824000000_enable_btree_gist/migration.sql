-- Required for a GiST exclusion constraint combining an equality column
-- (trainer_id) with a range overlap check.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
	EXCLUDE USING gist (
		trainer_id WITH =,
		tsrange(booking_date + start_time, booking_date + end_time) WITH &&
	) WHERE (status = 'Scheduled');