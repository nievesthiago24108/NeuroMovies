import type {
  EpisodeDraft,
  SearchEntry,
  SeasonDraft,
  TitleDraft,
  TmdbMovieDetail,
  TmdbSearchResult,
  TmdbTvDetail,
} from "@/lib/tmdb/types";

const fallbackToNull = (value: string | null | undefined): string | null =>
  value == null || value === "" ? null : value;

/**
 * Normalize a /search/multi result into a SearchEntry.
 * Person results return null and are discarded by callers.
 */
export function toSearchEntry(result: TmdbSearchResult): SearchEntry | null {
  if (result.media_type === "person") return null;
  const title = result.title ?? result.name ?? "";
  if (title === "") return null;
  return {
    tmdbId: result.id,
    mediaType: result.media_type,
    title,
    releaseDate: fallbackToNull(result.release_date ?? result.first_air_date),
    posterPath: fallbackToNull(result.poster_path),
    overview: result.overview ?? "",
  };
}

/** Map a movie detail response to a TitleDraft. */
export function movieToTitle(detail: TmdbMovieDetail): TitleDraft {
  return {
    tmdbId: detail.id,
    mediaType: "movie",
    title: detail.title,
    originalTitle: fallbackToNull(detail.original_title),
    overview: fallbackToNull(detail.overview),
    posterPath: fallbackToNull(detail.poster_path),
    backdropPath: fallbackToNull(detail.backdrop_path),
    releaseDate: fallbackToNull(detail.release_date),
    firstAirDate: null,
    genres: detail.genres.length > 0 ? detail.genres : null,
    runtime: detail.runtime ?? null,
    tmdbStatus: fallbackToNull(detail.status),
    numberOfSeasons: null,
  };
}

/** Map a TV series detail response to a TitleDraft. */
export function tvToTitle(detail: TmdbTvDetail): TitleDraft {
  return {
    tmdbId: detail.id,
    mediaType: "tv",
    title: detail.name,
    originalTitle: fallbackToNull(detail.original_name),
    overview: fallbackToNull(detail.overview),
    posterPath: fallbackToNull(detail.poster_path),
    backdropPath: fallbackToNull(detail.backdrop_path),
    releaseDate: null,
    firstAirDate: fallbackToNull(detail.first_air_date),
    genres: detail.genres.length > 0 ? detail.genres : null,
    runtime: detail.episode_run_time[0] ?? null,
    tmdbStatus: fallbackToNull(detail.status),
    numberOfSeasons: detail.number_of_seasons,
  };
}

/** Map the seasons array of a TV detail response to SeasonDraft rows. */
export function tvToSeasons(detail: TmdbTvDetail): SeasonDraft[] {
  if (!detail.seasons) return [];
  return detail.seasons.map((season) => ({
    tmdbId: season.id,
    seasonNumber: season.season_number,
    name: fallbackToNull(season.name),
    episodeCount: season.episode_count,
    airDate: fallbackToNull(season.air_date),
    posterPath: fallbackToNull(season.poster_path),
  }));
}

/** Map a single season's episodes to EpisodeDraft rows. */
export function seasonToEpisodes(
  detail: { season_number: number; episodes: { id: number; name: string; overview: string; episode_number: number; air_date: string | null; runtime: number | null; still_path: string | null }[] },
): EpisodeDraft[] {
  return detail.episodes.map((episode) => ({
    tmdbId: episode.id,
    seasonNumber: detail.season_number,
    episodeNumber: episode.episode_number,
    name: fallbackToNull(episode.name),
    overview: fallbackToNull(episode.overview),
    airDate: fallbackToNull(episode.air_date),
    runtime: episode.runtime ?? null,
    stillPath: fallbackToNull(episode.still_path),
  }));
}

/**
 * Merge two localized payloads: any field listed in `fields` that is falsy in
 * the primary payload is taken from the fallback payload. Used to fill missing
 * Spanish titles/synopses with English values from TMDB.
 */
export function fillMissing<T extends object>(
  primary: T,
  fallback: T,
  fields: readonly (keyof T)[],
): T {
  const merged = { ...primary };
  for (const field of fields) {
    const current = merged[field];
    if (current === "" || current == null) {
      merged[field] = fallback[field];
    }
  }
  return merged;
}