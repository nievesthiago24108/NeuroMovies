import "server-only";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { episodeProgress, episodes, libraryEntries, seasons, titles } from "@/db/schema";
import type { LibraryStatus, MediaType, Season, Title } from "@/db/schema";
import { fetchMovieDraft, fetchSeasonEpisodes, fetchTvBundle } from "@/lib/tmdb/api";
import type { SeasonDraft } from "@/lib/tmdb/types";
import { isAired, isReturningSeries } from "@/lib/progress";
import { isStale } from "@/lib/refresh";
import type { ContinueWatchingItem, LibraryItem, TvProgress } from "@/lib/library-types";

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

/**
 * Load every library entry with the derived data the library grid needs:
 * movie rating or series episode-rating average, and series progress.
 */
export async function getLibraryItems(): Promise<LibraryItem[]> {
  const rows = await db
    .select({ entry: libraryEntries, title: titles })
    .from(libraryEntries)
    .innerJoin(titles, eq(libraryEntries.titleId, titles.id))
    .orderBy(desc(libraryEntries.addedAt));

  const titleById = new Map(rows.map((row) => [row.title.id, row.title]));
  const tvTitleIds = rows
    .filter((row) => row.title.mediaType === "tv")
    .map((row) => row.title.id);

  const tvStats = new Map<
    number,
    { rating: number | null; ratingCount: number; progress: TvProgress; upToDate: boolean }
  >();

  if (tvTitleIds.length > 0) {
    const episodeRows = await db
      .select({
        id: episodes.id,
        titleId: episodes.titleId,
        airDate: episodes.airDate,
        seasonNumber: episodes.seasonNumber,
      })
      .from(episodes)
      .where(inArray(episodes.titleId, tvTitleIds));

    const episodeIds = episodeRows.map((episode) => episode.id);
    const progressRows =
      episodeIds.length > 0
        ? await db
            .select({
              episodeId: episodeProgress.episodeId,
              watched: episodeProgress.watched,
              rating: episodeProgress.rating,
            })
            .from(episodeProgress)
            .where(inArray(episodeProgress.episodeId, episodeIds))
        : [];
    const progressMap = new Map(progressRows.map((row) => [row.episodeId, row]));

    const grouped = new Map<number, typeof episodeRows>();
    for (const episode of episodeRows) {
      const list = grouped.get(episode.titleId);
      if (list) list.push(episode);
      else grouped.set(episode.titleId, [episode]);
    }

    for (const titleId of tvTitleIds) {
      const list = grouped.get(titleId) ?? [];
      let ratingSum = 0;
      let ratingCount = 0;
      let watched = 0;
      let aired = 0;
      let total = 0;

      for (const episode of list) {
        const progress = progressMap.get(episode.id);
        if (progress?.rating != null) {
          ratingSum += progress.rating;
          ratingCount += 1;
        }
        if (episode.seasonNumber === 0) continue; // specials excluded from progress
        total += 1;
        if (isAired(episode.airDate)) {
          aired += 1;
          if (progress?.watched) watched += 1;
        }
      }

      const complete = aired > 0 && watched === aired;
      tvStats.set(titleId, {
        rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
        ratingCount,
        progress: { watched, aired, total },
        upToDate: complete && isReturningSeries(titleById.get(titleId)?.tmdbStatus),
      });
    }
  }

  return rows.map(({ entry, title }) => {
    const stats = title.mediaType === "tv" ? tvStats.get(title.id) : undefined;
    return {
      titleId: title.id,
      tmdbId: title.tmdbId,
      mediaType: title.mediaType,
      title: title.title,
      posterPath: title.posterPath,
      year: (title.releaseDate ?? title.firstAirDate)?.slice(0, 4) ?? null,
      status: entry.status,
      rating: title.mediaType === "movie" ? entry.rating : (stats?.rating ?? null),
      ratingCount:
        title.mediaType === "movie" ? (entry.rating != null ? 1 : 0) : (stats?.ratingCount ?? 0),
      addedAt: entry.addedAt.toISOString(),
      watchedAt: entry.watchedAt ? entry.watchedAt.toISOString() : null,
      progress: stats?.progress ?? null,
      upToDate: stats?.upToDate ?? false,
    } satisfies LibraryItem;
  });
}

/**
 * Series in "watching" with their next aired-but-unwatched episode.
 * Specials are ignored, and series all caught up are left out.
 */
export async function getContinueWatching(): Promise<ContinueWatchingItem[]> {
  const rows = await db
    .select({ entry: libraryEntries, title: titles })
    .from(libraryEntries)
    .innerJoin(titles, eq(libraryEntries.titleId, titles.id))
    .where(and(eq(titles.mediaType, "tv"), eq(libraryEntries.status, "watching")))
    .orderBy(desc(libraryEntries.addedAt));

  if (rows.length === 0) return [];

  const titleIds = rows.map((row) => row.title.id);
  const episodeRows = await db
    .select({
      id: episodes.id,
      titleId: episodes.titleId,
      airDate: episodes.airDate,
      seasonNumber: episodes.seasonNumber,
      episodeNumber: episodes.episodeNumber,
      name: episodes.name,
    })
    .from(episodes)
    .where(inArray(episodes.titleId, titleIds))
    .orderBy(asc(episodes.seasonNumber), asc(episodes.episodeNumber));

  const episodeIds = episodeRows.map((episode) => episode.id);
  const progressRows =
    episodeIds.length > 0
      ? await db
          .select({
            episodeId: episodeProgress.episodeId,
            watched: episodeProgress.watched,
          })
          .from(episodeProgress)
          .where(inArray(episodeProgress.episodeId, episodeIds))
      : [];
  const watchedSet = new Set(
    progressRows.filter((row) => row.watched).map((row) => row.episodeId),
  );

  const items: ContinueWatchingItem[] = [];
  for (const { title } of rows) {
    const episodesForTitle = episodeRows.filter(
      (episode) => episode.titleId === title.id && episode.seasonNumber !== 0,
    );
    let watched = 0;
    let aired = 0;
    let next: (typeof episodeRows)[number] | null = null;

    for (const episode of episodesForTitle) {
      if (!isAired(episode.airDate)) continue;
      aired += 1;
      if (watchedSet.has(episode.id)) {
        watched += 1;
      } else if (!next) {
        next = episode;
      }
    }

    if (!next) continue;
    items.push({
      titleId: title.id,
      tmdbId: title.tmdbId,
      title: title.title,
      posterPath: title.posterPath,
      seasonNumber: next.seasonNumber,
      episodeNumber: next.episodeNumber,
      episodeId: next.id,
      episodeName: next.name,
      watched,
      aired,
    });
  }

  return items;
}
