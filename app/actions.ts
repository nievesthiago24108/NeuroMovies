"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { episodes, libraryEntries, seasons, titles } from "@/db/schema";
import { parseRating } from "@/lib/validate";
import type { LibraryStatus, MediaType } from "@/db/schema";
import { fetchMovieDraft, fetchSeasonEpisodes, fetchTvBundle } from "@/lib/tmdb/api";

/**
 * Set (or clear) the personal rating for a movie.
 */
export async function setMovieRating(
  titleId: number,
  ratingValue: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rating = parseRating(ratingValue);

  const title = await db.query.titles.findFirst({
    where: eq(titles.id, titleId),
  });
  if (!title || title.mediaType !== "movie") {
    return { ok: false, error: "Ese título no es una película." };
  }

  const now = new Date();
  const set = rating === null
    ? { rating: null }
    : { rating, status: "watched" as const, watchedAt: now };

  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: now, ...set })
    .onConflictDoUpdate({
      target: libraryEntries.titleId,
      set,
    });

  revalidatePath("/");
  revalidatePath("/biblioteca");
  revalidatePath(`/pelicula/${title.tmdbId}`);
  return { ok: true };
}

/** Update status for any title in library. */
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
    .onConflictDoUpdate({
      target: libraryEntries.titleId,
      set: { status },
    });
  revalidatePath("/");
  revalidatePath("/biblioteca");
  if (existing.mediaType === "movie") revalidatePath(`/pelicula/${existing.tmdbId}`);
  else revalidatePath(`/serie/${existing.tmdbId}`);
  return { ok: true };
}

/** Update notes for a library entry. */
export async function updateLibraryNotes(
  titleId: number,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!existing) return { ok: false, error: "Título no encontrado." };
  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: new Date(), notes: notes ?? null })
    .onConflictDoUpdate({
      target: libraryEntries.titleId,
      set: { notes: notes ?? null },
    });
  if (existing.mediaType === "movie") revalidatePath(`/pelicula/${existing.tmdbId}`);
  else revalidatePath(`/serie/${existing.tmdbId}`);
  return { ok: true };
}

/** Update watched date (movie). */
export async function setMovieWatchedAt(
  titleId: number,
  watchedAt: Date | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title || title.mediaType !== "movie") return { ok: false, error: "Película no encontrada." };
  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: new Date(), watchedAt })
    .onConflictDoUpdate({
      target: libraryEntries.titleId,
      set: { watchedAt },
    });
  revalidatePath(`/pelicula/${title.tmdbId}`);
  return { ok: true };
}

async function ensureTitleForTmdb(tmdbId: number, mediaType: MediaType) {
  const existing = await db.query.titles.findFirst({
    where: and(eq(titles.tmdbId, tmdbId), eq(titles.mediaType, mediaType)),
  });
  if (existing) return existing;

  const now = new Date();
  if (mediaType === "movie") {
    const draft = await fetchMovieDraft(tmdbId);
    const [inserted] = await db.insert(titles).values({ ...draft, lastSyncedAt: now }).returning();
    return inserted;
  }

  const bundle = await fetchTvBundle(tmdbId);
  const [inserted] = await db.insert(titles).values({ ...bundle.title, lastSyncedAt: now }).returning();

  for (const seasonDraft of bundle.seasons) {
    await db
      .insert(seasons)
      .values({ titleId: inserted.id, ...seasonDraft })
      .onConflictDoUpdate({
        target: [seasons.titleId, seasons.seasonNumber],
        set: {
          name: seasonDraft.name,
          episodeCount: seasonDraft.episodeCount,
          airDate: seasonDraft.airDate,
          posterPath: seasonDraft.posterPath,
        },
      });
  }

  const allSeasons = await db.query.seasons.findMany({
    where: eq(seasons.titleId, inserted.id),
  });
  for (const s of allSeasons) {
    try {
      const eps = await fetchSeasonEpisodes(tmdbId, s.seasonNumber);
      for (const e of eps) {
        await db
          .insert(episodes)
          .values({ titleId: inserted.id, seasonId: s.id, ...e })
          .onConflictDoUpdate({
            target: [episodes.tmdbId],
            set: {
              name: e.name,
              overview: e.overview,
              airDate: e.airDate,
              runtime: e.runtime,
              stillPath: e.stillPath,
            },
          });
      }
    } catch (err) {
      console.error(`Failed to fetch episodes for season ${s.seasonNumber}`, err);
    }
  }
  return inserted;
}

export async function addToLibrary(
  tmdbId: number,
  mediaType: MediaType,
  status: "wishlist" | "watching",
): Promise<{ ok: true; titleId: number } | { ok: false; error: string }> {
  try {
    const title = await ensureTitleForTmdb(tmdbId, mediaType);
    const now = new Date();
    await db
      .insert(libraryEntries)
      .values({ titleId: title.id, status, addedAt: now })
      .onConflictDoUpdate({
        target: libraryEntries.titleId,
        set: { status },
      });
    revalidatePath("/");
    revalidatePath("/biblioteca");
    revalidatePath("/buscar");
    return { ok: true, titleId: title.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "add-to-library-failed";
    return { ok: false, error: message };
  }
}