import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryEntries, titles } from "@/db/schema";
import { MovieDetail } from "@/components/movie/movie-detail";
import { fetchMovieDraft } from "@/lib/tmdb/api";

export const instant = false;

export default async function PeliculaPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return notFound();

  // Try to find existing title
  let title = await db.query.titles.findFirst({
    where: and(eq(titles.tmdbId, id), eq(titles.mediaType, "movie")),
  });

  // If not cached, fetch and cache (with minimal seasons/episodes not needed for movie)
  if (!title) {
    try {
      const draft = await fetchMovieDraft(id);
      const now = new Date();
      const inserted = await db
        .insert(titles)
        .values({ ...draft, lastSyncedAt: now })
        .returning();
      title = inserted[0];
    } catch (e) {
      console.error(e);
      return notFound();
    }
  }

  const entry = await db.query.libraryEntries.findFirst({
    where: eq(libraryEntries.titleId, title.id),
  });

  return <MovieDetail title={title} entry={entry ?? null} />;
}