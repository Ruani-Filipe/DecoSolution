CREATE TABLE `passengers` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`passport_number` text,
	`nationality` text,
	`date_of_birth` text,
	`seat_number` text,
	`flight_number` text NOT NULL,
	`departure_city` text NOT NULL,
	`arrival_city` text NOT NULL,
	`departure_date` text NOT NULL,
	`ticket_class` text,
	`price` text,
	`status` text DEFAULT 'confirmed',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
