"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { episodeProgress, episodes, libraryEntries, titles } from "@/db/schema";
import { parseRating } from "@/lib/validate";
import type { LibraryStatus, MediaType } from "@/db/schema";
import { ensureTitle } from "@/lib/library";
import { isReturningSeries } from "@/lib/progress";

export async function setMovieRating(
  titleId: number,
  ratingValue: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rating = parseRating(ratingValue);
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title || title.mediaType !== "movie") {
    return { ok: false, error: "Ese título no es una película." };
  }
  const now = new Date();
  const set = rating === null ? { rating: null } : { rating, status: "watched" as const, watchedAt: now };
  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: now, ...set })
    .onConflictDoUpdate({ target: libraryEntries.titleId, set });
  revalidatePath("/");
  revalidatePath("/biblioteca");
  revalidatePath(`/pelicula/${title.tmdbId}`);
  return { ok: true };
}

export async function updateLibraryStatus(
  titleId: number,
  status: LibraryStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!existing) return { ok: false, error: "Título no encontrado." };
  const now = new Date();
  await db
    .insert(libraryEntries)
    .values({ titleId, status, addedAt: now })
    .onConflictDoUpdate({ target: libraryEntries.titleId, set: { status } });
  revalidatePath("/");
  revalidatePath("/biblioteca");
  if (existing.mediaType === "movie") revalidatePath(`/pelicula/${existing.tmdbId}`);
  else revalidatePath(`/serie/${existing.tmdbId}`);
  return { ok: true };
}

export async function updateLibraryNotes(
  titleId: number,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!existing) return { ok: false, error: "Título no encontrado." };
  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: new Date(), notes: notes ?? null })
    .onConflictDoUpdate({ target: libraryEntries.titleId, set: { notes: notes ?? null } });
  if (existing.mediaType === "movie") revalidatePath(`/pelicula/${existing.tmdbId}`);
  else revalidatePath(`/serie/${existing.tmdbId}`);
  return { ok: true };
}

export async function setMovieWatchedAt(
  titleId: number,
  watchedAt: Date | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title || title.mediaType !== "movie") return { ok: false, error: "Película no encontrada." };
  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: new Date(), watchedAt })
    .onConflictDoUpdate({ target: libraryEntries.titleId, set: { watchedAt } });
  revalidatePath(`/pelicula/${title.tmdbId}`);
  return { ok: true };
}

export async function addToLibrary(
  tmdbId: number,
  mediaType: MediaType,
  status: "wishlist" | "watching",
): Promise<{ ok: true; titleId: number } | { ok: false; error: string }> {
  try {
    const title = await ensureTitle(tmdbId, mediaType);
    const now = new Date();
    await db
      .insert(libraryEntries)
      .values({ titleId: title.id, status, addedAt: now })
      .onConflictDoUpdate({ target: libraryEntries.titleId, set: { status } });
    revalidatePath("/");
    revalidatePath("/biblioteca");
    revalidatePath("/buscar");
    return { ok: true, titleId: title.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "add-to-library-failed";
    return { ok: false, error: message };
  }
}


// ---------------------------------------------------------------------------
// Episode progress and series status transitions
// ---------------------------------------------------------------------------

function isAiredDate(airDate: string | null | undefined): boolean {
  if (!airDate) return false;
  const d = new Date(airDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) {
    const d2 = new Date(airDate);
    if (Number.isNaN(d2.getTime())) return false;
    d.setTime(d2.getTime());
  }
  const t = new Date();
  t.setUTCHours(23, 59, 59, 999);
  return d <= t;
}

/** Make sure a library entry exists and reflects that the user started the show. */
async function ensureStartedEntry(titleId: number): Promise<void> {
  const entry = await db.query.libraryEntries.findFirst({
    where: eq(libraryEntries.titleId, titleId),
  });
  if (!entry) {
    await db
      .insert(libraryEntries)
      .values({ titleId, status: "watching", addedAt: new Date() });
    return;
  }
  if (entry.status === "wishlist" || entry.status === "abandoned") {
    await db
      .update(libraryEntries)
      .set({ status: "watching" })
      .where(eq(libraryEntries.titleId, titleId));
  }
}

/**
 * Recompute the series status from its aired episodes:
 * - all aired watched + show ended -> watched
 * - all aired watched + still airing -> watching (shown as "Al día")
 * - some watched -> watching
 */
async function recomputeSeriesStatus(titleId: number): Promise<void> {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title || title.mediaType !== "tv") return;

  const entry = await db.query.libraryEntries.findFirst({
    where: eq(libraryEntries.titleId, titleId),
  });
  if (!entry) return;

  const airedIds = (
    await db.query.episodes.findMany({
      where: eq(episodes.titleId, titleId),
      columns: { id: true, airDate: true, seasonNumber: true },
    })
  )
    .filter((e) => e.seasonNumber !== 0 && isAiredDate(e.airDate))
    .map((e) => e.id);

  if (airedIds.length === 0) return;

  const watchedAiredCount = (
    await db.query.episodeProgress.findMany({
      where: inArray(episodeProgress.episodeId, airedIds),
      columns: { episodeId: true, watched: true },
    })
  ).filter((p) => p.watched).length;

  const isComplete = watchedAiredCount === airedIds.length;

  if (isComplete && !isReturningSeries(title.tmdbStatus)) {
    await db
      .update(libraryEntries)
      .set({ status: "watched", watchedAt: entry.watchedAt ?? new Date() })
      .where(eq(libraryEntries.titleId, titleId));
    return;
  }

  if (isComplete && isReturningSeries(title.tmdbStatus)) {
    await db
      .update(libraryEntries)
      .set({ status: "watching" })
      .where(eq(libraryEntries.titleId, titleId));
    return;
  }

  if (watchedAiredCount > 0 && entry.status !== "watching") {
    await db
      .update(libraryEntries)
      .set({ status: "watching" })
      .where(eq(libraryEntries.titleId, titleId));
  }
}

/**
 * Update a single episode's progress.
 *
 * Invariant: a rating implies the episode is watched. Setting a rating marks the
 * episode watched; clearing watched clears the rating.
 */
export async function setEpisodeProgress(
  episodeId: number,
  patch: { watched?: boolean; rating?: number | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const episode = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
  if (!episode) return { ok: false, error: "Episodio no encontrado." };

  const existing = await db.query.episodeProgress.findFirst({
    where: eq(episodeProgress.episodeId, episodeId),
  });
  let watched = existing?.watched ?? false;
  let rating = existing?.rating ?? null;

  if (patch.rating !== undefined) {
    rating = parseRating(patch.rating);
    if (rating !== null) watched = true;
  }
  if (patch.watched !== undefined) {
    watched = patch.watched;
  }
  if (!watched) rating = null;

  if (watched && !isAiredDate(episode.airDate)) {
    return { ok: false, error: "Ese episodio todavía no se ha emitido." };
  }

  const now = new Date();
  const watchedAt = watched ? (existing?.watchedAt ?? now) : null;
  await db
    .insert(episodeProgress)
    .values({ episodeId, watched, watchedAt, rating })
    .onConflictDoUpdate({
      target: episodeProgress.episodeId,
      set: { watched, watchedAt, rating },
    });

  if (watched) await ensureStartedEntry(episode.titleId);
  await recomputeSeriesStatus(episode.titleId);

  const title = await db.query.titles.findFirst({ where: eq(titles.id, episode.titleId) });
  if (title) revalidatePath(`/serie/${title.tmdbId}`);
  revalidatePath("/");
  revalidatePath("/biblioteca");
  return { ok: true };
}

export async function setSeasonWatched(
  titleId: number,
  seasonNumber: number,
  watched: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title) return { ok: false, error: "Serie no encontrada." };

  const aired = (
    await db.query.episodes.findMany({
      where: and(eq(episodes.titleId, titleId), eq(episodes.seasonNumber, seasonNumber)),
      columns: { id: true, airDate: true },
    })
  ).filter((e) => isAiredDate(e.airDate));
  if (aired.length === 0) return { ok: true };

  const ids = aired.map((e) => e.id);
  const now = new Date();
  if (watched) {
    for (const id of ids) {
      await db
        .insert(episodeProgress)
        .values({ episodeId: id, watched: true, watchedAt: now })
        .onConflictDoUpdate({
          target: episodeProgress.episodeId,
          set: { watched: true, watchedAt: now },
        });
    }
    await ensureStartedEntry(titleId);
  } else {
    await db
      .update(episodeProgress)
      .set({ watched: false, watchedAt: null, rating: null })
      .where(inArray(episodeProgress.episodeId, ids));
  }

  await recomputeSeriesStatus(titleId);
  revalidatePath(`/serie/${title.tmdbId}`);
  revalidatePath("/");
  revalidatePath("/biblioteca");
  return { ok: true };
}

export async function markUpToEpisodeWatched(
  episodeId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
  if (!target) return { ok: false, error: "Episodio no encontrado." };
  if (!isAiredDate(target.airDate)) {
    return { ok: false, error: "Ese episodio todavía no se ha emitido." };
  }

  const aired = (
    await db.query.episodes.findMany({
      where: and(
        eq(episodes.titleId, target.titleId),
        eq(episodes.seasonNumber, target.seasonNumber),
      ),
      columns: { id: true, episodeNumber: true, airDate: true },
    })
  )
    .filter((e) => isAiredDate(e.airDate) && e.episodeNumber <= target.episodeNumber)
    .map((e) => e.id);

  if (aired.length === 0) return { ok: true };

  const now = new Date();
  for (const id of aired) {
    await db
      .insert(episodeProgress)
      .values({ episodeId: id, watched: true, watchedAt: now })
      .onConflictDoUpdate({
        target: episodeProgress.episodeId,
        set: { watched: true, watchedAt: now },
      });
  }

  await ensureStartedEntry(target.titleId);
  await recomputeSeriesStatus(target.titleId);

  const title = await db.query.titles.findFirst({ where: eq(titles.id, target.titleId) });
  if (title) revalidatePath(`/serie/${title.tmdbId}`);
  revalidatePath("/");
  revalidatePath("/biblioteca");
  return { ok: true };
}
