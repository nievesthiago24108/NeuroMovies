"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { episodeProgress, episodes, libraryEntries, seasons, titles } from "@/db/schema";
import { parseRating } from "@/lib/validate";
import type { LibraryStatus, MediaType } from "@/db/schema";
import { fetchMovieDraft, fetchSeasonEpisodes, fetchTvBundle } from "@/lib/tmdb/api";

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

  const allSeasons = await db.query.seasons.findMany({ where: eq(seasons.titleId, inserted.id) });
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


async function recomputeSeriesStatus(titleId: number) {
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (!title || title.mediaType !== "tv") return;
  const entry = await db.query.libraryEntries.findFirst({ where: eq(libraryEntries.titleId, titleId) });
  if (!entry) return;
  if (entry.status !== "watching" && entry.status !== "watched") return;

  const allEps = (await db.query.episodes.findMany({
    where: eq(episodes.titleId, titleId),
    columns: { id: true, airDate: true, seasonNumber: true },
  })).filter((e) => e.seasonNumber !== 0 && isAiredDate(e.airDate));
  if (allEps.length === 0) return;
  const airedIds = allEps.map((e) => e.id);
  const prog = await db.query.episodeProgress.findMany({
    where: inArray(episodeProgress.episodeId, airedIds),
    columns: { episodeId: true, watched: true },
  });
  const watchedAiredCount = prog.filter((p) => p.watched).length;
  const isComplete = watchedAiredCount === airedIds.length;

  // If ended/complete and all aired watched -> watched
  if (isComplete && !isReturningSeries(title.tmdbStatus)) {
    await db
      .update(libraryEntries)
      .set({ status: "watched", watchedAt: new Date() })
      .where(eq(libraryEntries.titleId, titleId));
    revalidatePath(`/serie/${title.tmdbId}`);
    return;
  }
  // if still in emission and complete -> keep watching? requirement says "quedará en 'Viendo' con la etiqueta 'Al día'"
  if (isComplete && isReturningSeries(title.tmdbStatus)) {
    await db
      .update(libraryEntries)
      .set({ status: "watching" })
      .where(eq(libraryEntries.titleId, titleId));
    revalidatePath(`/serie/${title.tmdbId}`);
    return;
  }
  // ensure watching if started
  if (watchedAiredCount > 0 && entry.status !== "watching") {
    await db
      .update(libraryEntries)
      .set({ status: "watching" })
      .where(eq(libraryEntries.titleId, titleId));
    revalidatePath(`/serie/${title.tmdbId}`);
  }
}

function isReturningSeries(status: string | null | undefined): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s.includes("returning") || s.includes("in production") || s.includes("ongoing") || s.includes("airing");
}

export async function markEpisodeWatched(
  episodeId: number,
  watched: boolean,
  rating?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ep = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
  if (!ep) return { ok: false, error: "Episodio no encontrado." };
  if (!watched && rating !== undefined && rating !== null && rating !== "") {
    // don't allow rating if not watched? but spec says "Puntuar cada episodio... al puntuarlo se marca como visto"
  }
  const now = new Date();
  let finalWatched = watched;
  let finalRating: number | null = null;
  if (rating !== undefined) {
    finalRating = parseRating(rating);
    finalWatched = true; // al puntuarlo se marca como visto
  } else {
    finalRating = null;
    finalWatched = watched;
  }
  // prevent marking future episodes as watched? check aired
  if (finalWatched && !isAiredDate(ep.airDate)) {
    return { ok: false, error: "No se puede marcar como visto un episodio que aún no salió." };
  }
  await db
    .insert(episodeProgress)
    .values({
      episodeId: ep.id,
      watched: finalWatched,
      watchedAt: finalWatched ? now : null,
      rating: finalRating,
    })
    .onConflictDoUpdate({
      target: episodeProgress.episodeId,
      set: {
        watched: finalWatched,
        watchedAt: finalWatched ? now : null,
        rating: finalRating,
      },
    });
  // ensure library entry exists/watching if started
  const le = await db.query.libraryEntries.findFirst({ where: eq(libraryEntries.titleId, ep.titleId) });
  if (!le) {
    await db.insert(libraryEntries).values({ titleId: ep.titleId, status: "watching", addedAt: now });
  } else if (finalWatched && le.status === "wishlist") {
    await db.update(libraryEntries).set({ status: "watching" }).where(eq(libraryEntries.titleId, ep.titleId));
  }
  await recomputeSeriesStatus(ep.titleId);
  revalidatePath(`/serie/${(await db.query.titles.findFirst({ where: eq(titles.id, ep.titleId) }))?.tmdbId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function markSeasonWatched(
  titleId: number,
  seasonNumber: number,
  watched: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (seasonNumber === 0) return { ok: false, error: "No se cuenta la temporada especial para progreso." };
  const aired = (await db.query.episodes.findMany({
    where: and(eq(episodes.titleId, titleId), eq(episodes.seasonNumber, seasonNumber)),
    columns: { id: true, airDate: true },
  })).filter((e) => isAiredDate(e.airDate));
  if (aired.length === 0) return { ok: true };
  const ids = aired.map((e) => e.id);
  const now = new Date();
  if (watched) {
    for (const id of ids) {
      await db
        .insert(episodeProgress)
        .values({ episodeId: id, watched: true, watchedAt: now, rating: null })
        .onConflictDoUpdate({
          target: episodeProgress.episodeId,
          set: { watched: true, watchedAt: now },
        });
    }
  } else {
    await db
      .update(episodeProgress)
      .set({ watched: false, watchedAt: null })
      .where(inArray(episodeProgress.episodeId, ids));
  }
  await recomputeSeriesStatus(titleId);
  const title = await db.query.titles.findFirst({ where: eq(titles.id, titleId) });
  if (title) revalidatePath(`/serie/${title.tmdbId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function markUpToEpisodeWatched(
  episodeId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const target = await db.query.episodes.findFirst({ where: eq(episodes.id, episodeId) });
  if (!target) return { ok: false, error: "Episodio no encontrado." };
  if (!isAiredDate(target.airDate)) return { ok: false, error: "El episodio aún no salió." };
  const epsList = await db.query.episodes.findMany({
    where: and(eq(episodes.titleId, target.titleId), eq(episodes.seasonNumber, target.seasonNumber)),
    columns: { id: true, episodeNumber: true, airDate: true },
  });
  const aired = epsList
    .filter((e) => isAiredDate(e.airDate) && e.episodeNumber <= target.episodeNumber)
    .map((e) => e.id);
  if (aired.length === 0) return { ok: true };
  const now = new Date();
  for (const id of aired) {
    await db
      .insert(episodeProgress)
      .values({ episodeId: id, watched: true, watchedAt: now, rating: null })
      .onConflictDoUpdate({ target: episodeProgress.episodeId, set: { watched: true, watchedAt: now } });
  }
  await recomputeSeriesStatus(target.titleId);
  const title = await db.query.titles.findFirst({ where: eq(titles.id, target.titleId) });
  if (title) revalidatePath(`/serie/${title.tmdbId}`);
  revalidatePath("/");
  return { ok: true };
}
