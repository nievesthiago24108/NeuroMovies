CREATE TABLE "episode_progress" (
	"episode_id" integer PRIMARY KEY NOT NULL,
	"watched" boolean DEFAULT false NOT NULL,
	"watched_at" timestamp with time zone,
	"rating" integer,
	CONSTRAINT "episode_rating_check" CHECK ("episode_progress"."rating" IS NULL OR ("episode_progress"."rating" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"tmdb_id" integer NOT NULL,
	"season_number" integer NOT NULL,
	"episode_number" integer NOT NULL,
	"name" text,
	"overview" text,
	"air_date" text,
	"runtime" integer,
	"still_path" text
);
--> statement-breakpoint
CREATE TABLE "library_entries" (
	"title_id" integer PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'wishlist' NOT NULL,
	"rating" integer,
	"watched_at" timestamp with time zone,
	"added_at" timestamp with time zone NOT NULL,
	"notes" text,
	CONSTRAINT "library_rating_check" CHECK ("library_entries"."rating" IS NULL OR ("library_entries"."rating" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"title_id" integer NOT NULL,
	"season_number" integer NOT NULL,
	"name" text,
	"episode_count" integer,
	"air_date" text,
	"poster_path" text
);
--> statement-breakpoint
CREATE TABLE "titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"tmdb_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"overview" text,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" text,
	"first_air_date" text,
	"genres" jsonb,
	"runtime" integer,
	"tmdb_status" text,
	"number_of_seasons" integer,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "episode_progress" ADD CONSTRAINT "episode_progress_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_title_id_titles_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."titles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_tmdb_unique" ON "episodes" USING btree ("tmdb_id");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_title_season_number_unique" ON "episodes" USING btree ("title_id","season_number","episode_number");--> statement-breakpoint
CREATE INDEX "episodes_title_idx" ON "episodes" USING btree ("title_id");--> statement-breakpoint
CREATE INDEX "episodes_season_idx" ON "episodes" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "library_status_idx" ON "library_entries" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_title_season_unique" ON "seasons" USING btree ("title_id","season_number");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_tmdb_type_unique" ON "titles" USING btree ("tmdb_id","media_type");--> statement-breakpoint
CREATE UNIQUE INDEX "titles_tmdb_unique" ON "titles" USING btree ("tmdb_id");