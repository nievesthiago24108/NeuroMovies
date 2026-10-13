import "server-only";

import { getTmdbLanguage, tmdbFetch } from "@/lib/tmdb/client";
import { fillMissing, movieToTitle, seasonToEpisodes, toSearchEntry, tvToSeasons, tvToTitle } from "@/lib/tmdb/transform";
import type {
  EpisodeDraft,
  SearchEntry,
  SeasonDraft,
  TitleDraft,
  TmdbListResponse,
  TmdbMovieDetail,
  TmdbSearchResult,
  TmdbSeasonDetail,
  TmdbTvDetail,
} from "@/lib/tmdb/types";

const languageParams = (extra: Record<string, string> = {}): Record<string, string> => ({
  language: getTmdbLanguage(),
  ...extra,
});

/**
 * Fetch an endpoint in the primary language; re-fetch in en-US when any of the
 * given fields comes back empty and merge the missing fields. Keeps the number
 * of requests minimal for full details (titles/synopses almost always exist in
 * both languages).
 */
async function localize<T extends object>(
  path: string,
  fields: readonly (keyof T)[],
): Promise<T> {
  const primary = await tmdbFetch<T>(path, { params: languageParams() });
  const needsFallback = fields.some((field) => !primary[field]);
  if (!needsFallback) return primary;
  const fallback = await tmdbFetch<T>(path, { params: { language: "en-US" } });
  return fillMissing(primary, fallback, fields);
}

// ---------------------------------------------------------------------------
// Discovery and search (list endpoints, primary language only)
// ---------------------------------------------------------------------------

export async function searchMulti(query: string): Promise<SearchEntry[]> {
  const trimmed = query.trim();
  if (trimmed === "") return [];
  const data = await tmdbFetch<TmdbListResponse<TmdbSearchResult>>("/search/multi", {
    params: { query: trimmed, include_adult: "false", ...languageParams() },
  });
  return data.results
    .map(toSearchEntry)
    .filter((entry): entry is SearchEntry => entry !== null);
}

export async function getTrending(period: "day" | "week" = "week"): Promise<SearchEntry[]> {
  const data = await tmdbFetch<TmdbListResponse<TmdbSearchResult>>(`/trending/all/${period}`, {
    params: languageParams(),
  });
  return data.results
    .map(toSearchEntry)
    .filter((entry): entry is SearchEntry => entry !== null);
}

export async function getPopular(mediaType: "movie" | "tv"): Promise<SearchEntry[]> {
  const endpoint = mediaType === "movie" ? "/movie/popular" : "/tv/popular";
  const data = await tmdbFetch<TmdbListResponse<TmdbSearchResult>>(endpoint, {
    params: languageParams(),
  });
  return data.results
    .map(toSearchEntry)
    .filter((entry): entry is SearchEntry => entry !== null);
}

// ---------------------------------------------------------------------------
// Details (with en-US fallback for missing title/overview)
// ---------------------------------------------------------------------------

export async function getMovieDetail(id: number): Promise<TmdbMovieDetail> {
  return localize<TmdbMovieDetail>(`/movie/${id}`, ["title", "overview"]);
}

export async function getTvDetail(id: number): Promise<TmdbTvDetail> {
  // The detail response already embeds the full seasons list, avoiding a
  // separate /tv/{id}/season request for the overview.
  return localize<TmdbTvDetail>(`/tv/${id}`, ["name", "overview"]);
}

export async function getSeasonDetail(tvId: number, seasonNumber: number): Promise<TmdbSeasonDetail> {
  return localize<TmdbSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`, ["name"]);
}

// ---------------------------------------------------------------------------
// Draft builders used by the persistence layer
// ---------------------------------------------------------------------------

export async function fetchMovieDraft(id: number): Promise<TitleDraft> {
  return movieToTitle(await getMovieDetail(id));
}

export async function fetchTvBundle(id: number): Promise<{ title: TitleDraft; seasons: SeasonDraft[] }> {
  const detail = await getTvDetail(id);
  return { title: tvToTitle(detail), seasons: tvToSeasons(detail) };
}

export async function fetchSeasonEpisodes(tvId: number, seasonNumber: number): Promise<EpisodeDraft[]> {
  const detail = await getSeasonDetail(tvId, seasonNumber);
  return seasonToEpisodes(detail);
}