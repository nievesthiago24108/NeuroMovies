import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** Media type of a title (movie or TV series). */
export const MEDIA_TYPES = ["movie", "tv"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** Library status of an entry. */
export const LIBRARY_STATUSES = ["wishlist", "watching", "watched", "abandoned"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

/** Rating range accepted everywhere ratings are stored. */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

// ---------------------------------------------------------------------------
// titles
// ---------------------------------------------------------------------------

export const titles = sqliteTable(
  "titles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tmdbId: integer("tmdb_id").notNull(),
    mediaType: text("media_type", { enum: MEDIA_TYPES }).notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    overview: text("overview"),
    posterPath: text("poster_path"),
    backdropPath: text("backdrop_path"),
    /** Release date for movies (YYYY-MM-DD). */
    releaseDate: text("release_date"),
    /** First air date for TV series (YYYY-MM-DD). */
    firstAirDate: text("first_air_date"),
    /** Array of { id, name } genre objects, stored as JSON. */
    genres: text("genres", { mode: "json" }).$type<{ id: number; name: string }[]>(),
    /** Runtime in minutes (movie) or average episode runtime (TV, from TMDB). */
    runtime: integer("runtime"),
    /** TMDB status, e.g. "Released", "Returning Series", "Ended". */
    tmdbStatus: text("tmdb_status"),
    numberOfSeasons: integer("number_of_seasons"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("titles_tmdb_type_unique").on(t.tmdbId, t.mediaType),
    uniqueIndex("titles_tmdb_unique").on(t.tmdbId),
  ],
);

// ---------------------------------------------------------------------------
// seasons
// ---------------------------------------------------------------------------

export const seasons = sqliteTable(
  "seasons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number").notNull(),
    name: text("name"),
    episodeCount: integer("episode_count"),
    airDate: text("air_date"),
    posterPath: text("poster_path"),
  },
  (t) => [uniqueIndex("seasons_title_season_unique").on(t.titleId, t.seasonNumber)],
);

// ---------------------------------------------------------------------------
// episodes
// ---------------------------------------------------------------------------

export const episodes = sqliteTable(
  "episodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    titleId: integer("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    seasonId: integer("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    seasonNumber: integer("season_number").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    name: text("name"),
    overview: text("overview"),
    airDate: text("air_date"),
    runtime: integer("runtime"),
    stillPath: text("still_path"),
  },
  (t) => [
    uniqueIndex("episodes_tmdb_unique").on(t.tmdbId),
    uniqueIndex("episodes_title_season_number_unique").on(
      t.titleId,
      t.seasonNumber,
      t.episodeNumber,
    ),
    index("episodes_title_idx").on(t.titleId),
    index("episodes_season_idx").on(t.seasonId),
  ],
);

// ---------------------------------------------------------------------------
// library_entries
// ---------------------------------------------------------------------------

export const libraryEntries = sqliteTable(
  "library_entries",
  {
    titleId: integer("title_id")
      .primaryKey()
      .references(() => titles.id, { onDelete: "cascade" }),
    status: text("status", { enum: LIBRARY_STATUSES }).notNull().default("wishlist"),
    /** 1–5 stars. Only meaningful for movies. NULL clears the rating. */
    rating: integer("rating"),
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }),
    addedAt: integer("added_at", { mode: "timestamp_ms" }).notNull(),
    notes: text("notes"),
  },
  (t) => [
    index("library_status_idx").on(t.status),
    check(
      "library_rating_check",
      sql`${t.rating} IS NULL OR (${t.rating} BETWEEN 1 AND 5)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// episode_progress
// ---------------------------------------------------------------------------

export const episodeProgress = sqliteTable(
  "episode_progress",
  {
    episodeId: integer("episode_id")
      .primaryKey()
      .references(() => episodes.id, { onDelete: "cascade" }),
    watched: integer("watched", { mode: "boolean" }).notNull().default(false),
    watchedAt: integer("watched_at", { mode: "timestamp_ms" }),
    rating: integer("rating"),
  },
  (t) => [
    check(
      "episode_rating_check",
      sql`${t.rating} IS NULL OR (${t.rating} BETWEEN 1 AND 5)`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Type helpers exported for convenience
// ---------------------------------------------------------------------------

export type Title = typeof titles.$inferSelect;
export type NewTitle = typeof titles.$inferInsert;
export type Season = typeof seasons.$inferSelect;
export type NewSeason = typeof seasons.$inferInsert;
export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
export type LibraryEntry = typeof libraryEntries.$inferSelect;
export type NewLibraryEntry = typeof libraryEntries.$inferInsert;
export type EpisodeProgress = typeof episodeProgress.$inferSelect;
export type NewEpisodeProgress = typeof episodeProgress.$inferInsert;