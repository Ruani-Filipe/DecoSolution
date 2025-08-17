PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_passengers` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text,
	`last_name` text,
	`email` text,
	`phone` text,
	`nationality` text,
	`date_of_birth` text,
	`flight_number` text,
	`departure_city` text,
	`arrival_city` text,
	`departure_date` text,
	`price` text,
	`status` text,
	`distance` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
INSERT INTO `__new_passengers`("id", "first_name", "last_name", "email", "phone", "nationality", "date_of_birth", "flight_number", "departure_city", "arrival_city", "departure_date", "price", "status", "distance", "created_at") SELECT "id", "first_name", "last_name", "email", "phone", "nationality", "date_of_birth", "flight_number", "departure_city", "arrival_city", "departure_date", "price", "status", "distance", "created_at" FROM `passengers`;--> statement-breakpoint
DROP TABLE `passengers`;--> statement-breakpoint
ALTER TABLE `__new_passengers` RENAME TO `passengers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;