import "server-only";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, seasons, titles } from "@/db/schema";
import type { LibraryStatus, MediaType, Season, Title } from "@/db/schema";
import { fetchMovieDraft, fetchSeasonEpisodes, fetchTvBundle } from "@/lib/tmdb/api";
import type { SeasonDraft } from "@/lib/tmdb/types";
import { isStale } from "@/lib/refresh";

export { REFRESH_DEFAULT_MS, REFRESH_WATCHING_MS, isStale } from "@/lib/refresh";

export async function getCachedTitle(
  tmdbId: number,
  mediaType: MediaType,
): Promise<Title | undefined> {
  return db.query.titles.findFirst({
    where: and(eq(titles.tmdbId, tmdbId), eq(titles.mediaType, mediaType)),
  });
}

async function upsertSeasons(titleId: number, drafts: SeasonDraft[]): Promise<void> {
  for (const draft of drafts) {
    await db
      .insert(seasons)
      .values({
        titleId,
        seasonNumber: draft.seasonNumber,
        name: draft.name,
        episodeCount: draft.episodeCount,
        airDate: draft.airDate,
        posterPath: draft.posterPath,
      })
      .onConflictDoUpdate({
        target: [seasons.titleId, seasons.seasonNumber],
        set: {
          name: draft.name,
          episodeCount: draft.episodeCount,
          airDate: draft.airDate,
          posterPath: draft.posterPath,
        },
      });
  }
}

async function upsertSeasonEpisodes(
  titleId: number,
  season: Season,
  tvId: number,
): Promise<void> {
  const drafts = await fetchSeasonEpisodes(tvId, season.seasonNumber);
  for (const draft of drafts) {
    await db
      .insert(episodes)
      .values({
        titleId,
        seasonId: season.id,
        tmdbId: draft.tmdbId,
        seasonNumber: draft.seasonNumber,
        episodeNumber: draft.episodeNumber,
        name: draft.name,
        overview: draft.overview,
        airDate: draft.airDate,
        runtime: draft.runtime,
        stillPath: draft.stillPath,
      })
      .onConflictDoUpdate({
        target: episodes.tmdbId,
        set: {
          seasonNumber: draft.seasonNumber,
          episodeNumber: draft.episodeNumber,
          name: draft.name,
          overview: draft.overview,
          airDate: draft.airDate,
          runtime: draft.runtime,
          stillPath: draft.stillPath,
        },
      });
  }
}

async function storedEpisodeCounts(titleId: number): Promise<Map<number, number>> {
  const rows = await db
    .select({ seasonId: episodes.seasonId, total: count() })
    .from(episodes)
    .where(eq(episodes.titleId, titleId))
    .groupBy(episodes.seasonId);
  return new Map(rows.map((row) => [row.seasonId, Number(row.total)]));
}

/** Fetch and persist the TV seasons/episodes whose episode count changed. */
async function syncTvChildren(titleId: number, tvId: number, drafts: SeasonDraft[]): Promise<void> {
  await upsertSeasons(titleId, drafts);
  const stored = await db.query.seasons.findMany({ where: eq(seasons.titleId, titleId) });
  const counts = await storedEpisodeCounts(titleId);
  const expected = new Map(drafts.map((draft) => [draft.seasonNumber, draft.episodeCount ?? 0]));

  const targets = stored.filter((season) => {
    const expectedCount = expected.get(season.seasonNumber) ?? 0;
    if (expectedCount === 0) return false;
    return (counts.get(season.id) ?? 0) !== expectedCount;
  });

  await Promise.all(
    targets.map((season) =>
      upsertSeasonEpisodes(titleId, season, tvId).catch((error) => {
        console.error(`Failed to sync episodes for season ${season.seasonNumber}`, error);
      }),
    ),
  );
}

/** Fetch a title from TMDB and persist it (with its children for TV). */
export async function cacheTitleFromTmdb(
  tmdbId: number,
  mediaType: MediaType,
): Promise<Title> {
  const now = new Date();
  if (mediaType === "movie") {
    const draft = await fetchMovieDraft(tmdbId);
    const [inserted] = await db
      .insert(titles)
      .values({ ...draft, lastSyncedAt: now })
      .returning();
    return inserted;
  }

  const bundle = await fetchTvBundle(tmdbId);
  const [inserted] = await db
    .insert(titles)
    .values({ ...bundle.title, lastSyncedAt: now })
    .returning();
  await syncTvChildren(inserted.id, tmdbId, bundle.seasons);
  return inserted;
}

/** Return the cached title, fetching it from TMDB on first use. */
export async function ensureTitle(tmdbId: number, mediaType: MediaType): Promise<Title> {
  const existing = await getCachedTitle(tmdbId, mediaType);
  if (existing) return existing;
  try {
    return await cacheTitleFromTmdb(tmdbId, mediaType);
  } catch (error) {
    // A concurrent request may have inserted the row first (unique index).
    const raced = await getCachedTitle(tmdbId, mediaType);
    if (raced) return raced;
    throw error;
  }
}

/**
 * Refresh a cached title when it is past its window. Never throws: on a TMDB
 * failure we keep serving the cached data.
 */
export async function refreshTitleIfStale(
  title: Title,
  status: LibraryStatus | null | undefined,
): Promise<Title> {
  if (!isStale(title.lastSyncedAt, status)) return title;
  try {
    const now = new Date();
    if (title.mediaType === "movie") {
      const draft = await fetchMovieDraft(title.tmdbId);
      const [updated] = await db
        .update(titles)
        .set({ ...draft, lastSyncedAt: now })
        .where(eq(titles.id, title.id))
        .returning();
      return updated;
    }

    const bundle = await fetchTvBundle(title.tmdbId);
    const [updated] = await db
      .update(titles)
      .set({ ...bundle.title, lastSyncedAt: now })
      .where(eq(titles.id, title.id))
      .returning();
    await syncTvChildren(title.id, title.tmdbId, bundle.seasons);
    return updated;
  } catch (error) {
    console.error(`Failed to refresh title ${title.tmdbId}`, error);
    return title;
  }
}
