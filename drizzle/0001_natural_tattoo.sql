CREATE TABLE `distance_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_key` text NOT NULL,
	`period_type` text NOT NULL,
	`period` text NOT NULL,
	`miles` real NOT NULL,
	`source` text NOT NULL,
	`observed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `distance_owner_period_idx` ON `distance_summaries` (`owner_key`,`period_type`,`period`);--> statement-breakpoint
CREATE TABLE `seed_state` (
	`owner_key` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
