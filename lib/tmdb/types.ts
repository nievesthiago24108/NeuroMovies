import type { MediaType } from "@/db/schema";

// ---------------------------------------------------------------------------
// Raw TMDB API response shapes (only the fields we use)
// ---------------------------------------------------------------------------

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  genres: TmdbGenre[];
  runtime: number | null;
  status: string;
}

export interface TmdbSeasonSummary {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  genres: TmdbGenre[];
  episode_run_time: number[];
  status: string;
  number_of_seasons: number;
  seasons: TmdbSeasonSummary[];
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  runtime: number | null;
  still_path: string | null;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export type TmdbSearchMediaType = "movie" | "tv" | "person";

export interface TmdbSearchResult {
  id: number;
  media_type: TmdbSearchMediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
}

export interface TmdbListResponse<T> {
  results: T[];
}

// ---------------------------------------------------------------------------
// Domain drafts produced by the transform module
// ---------------------------------------------------------------------------

/** Normalized search hit (people are excluded). */
export interface SearchEntry {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
  overview: string;
}

/** Fields used to upsert a row into the `titles` table. */
export interface TitleDraft {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  firstAirDate: string | null;
  genres: TmdbGenre[] | null;
  runtime: number | null;
  tmdbStatus: string | null;
  numberOfSeasons: number | null;
}

/** Fields used to upsert a row into the `seasons` table. */
export interface SeasonDraft {
  tmdbId: number;
  seasonNumber: number;
  name: string | null;
  episodeCount: number | null;
  airDate: string | null;
  posterPath: string | null;
}

/** Fields used to upsert a row into the `episodes` table. */
export interface EpisodeDraft {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
  overview: string | null;
  airDate: string | null;
  runtime: number | null;
  stillPath: string | null;
}