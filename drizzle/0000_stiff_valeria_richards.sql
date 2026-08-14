CREATE TABLE `recovery_months` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`month` text NOT NULL,
	`cardio_recovery` real,
	`resting_hr` real,
	`resting_hr_rest` real,
	`hrv` real,
	`hrv_rest` real,
	`walking_hr` real,
	`vo2_max` real,
	`lean_mass_kg` real,
	`lean_mass_rest_kg` real,
	`body_fat` real,
	`body_fat_rest` real,
	`weight_kg` real,
	`weight_rest_kg` real
);
--> statement-breakpoint
CREATE INDEX `recovery_owner_month_idx` ON `recovery_months` (`owner_key`,`month`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`date` text NOT NULL,
	`distance` real NOT NULL,
	`route` text,
	`moving_seconds` real,
	`elapsed_seconds` real,
	`elevation_gain` real,
	`pace` real,
	`avg_hr` real,
	`end_hr` real,
	`hr_2min` real,
	`cardio_recovery` real,
	`effort` real,
	`shoe_id` text,
	`notes` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `runs_owner_date_idx` ON `runs` (`owner_key`,`date`);--> statement-breakpoint
CREATE INDEX `runs_shoe_idx` ON `runs` (`shoe_id`);--> statement-breakpoint
CREATE TABLE `shoes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`nickname` text,
	`color` text DEFAULT '#46c9a8' NOT NULL,
	`start_date` text,
	`initial_miles` real DEFAULT 0 NOT NULL,
	`retirement_threshold` real DEFAULT 400 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shoes_owner_idx` ON `shoes` (`owner_key`);