CREATE TABLE `episode_progress` (
	`episode_id` integer PRIMARY KEY NOT NULL,
	`watched` integer DEFAULT false NOT NULL,
	`watched_at` integer,
	`rating` integer,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "episode_rating_check" CHECK("episode_progress"."rating" IS NULL OR ("episode_progress"."rating" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` integer NOT NULL,
	`season_id` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`name` text,
	`overview` text,
	`air_date` text,
	`runtime` integer,
	`still_path` text,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_tmdb_unique` ON `episodes` (`tmdb_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_title_season_number_unique` ON `episodes` (`title_id`,`season_number`,`episode_number`);--> statement-breakpoint
CREATE INDEX `episodes_title_idx` ON `episodes` (`title_id`);--> statement-breakpoint
CREATE INDEX `episodes_season_idx` ON `episodes` (`season_id`);--> statement-breakpoint
CREATE TABLE `library_entries` (
	`title_id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'wishlist' NOT NULL,
	`rating` integer,
	`watched_at` integer,
	`added_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "library_rating_check" CHECK("library_entries"."rating" IS NULL OR ("library_entries"."rating" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE INDEX `library_status_idx` ON `library_entries` (`status`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`name` text,
	`episode_count` integer,
	`air_date` text,
	`poster_path` text,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_title_season_unique` ON `seasons` (`title_id`,`season_number`);--> statement-breakpoint
CREATE TABLE `titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`first_air_date` text,
	`genres` text,
	`runtime` integer,
	`tmdb_status` text,
	`number_of_seasons` integer,
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `titles_tmdb_type_unique` ON `titles` (`tmdb_id`,`media_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `titles_tmdb_unique` ON `titles` (`tmdb_id`);