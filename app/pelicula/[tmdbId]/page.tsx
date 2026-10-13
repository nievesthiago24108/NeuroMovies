import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryEntries } from "@/db/schema";
import { MovieDetail } from "@/components/movie/movie-detail";
import { ensureTitle, refreshTitleIfStale } from "@/lib/library";

export const instant = false;

export default async function PeliculaPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return notFound();

  // Data comes from a synchronous SQLite driver and the current time, so render
  // this route per request instead of during prerendering.
  await connection();

  let title;
  try {
    title = await ensureTitle(id, "movie");
  } catch (error) {
    console.error(error);
    return notFound();
  }

  const entry = await db.query.libraryEntries.findFirst({
    where: eq(libraryEntries.titleId, title.id),
  });

  // Resync from TMDB when the cached data is past its 30-day window.
  title = await refreshTitleIfStale(title, entry?.status);

  return <MovieDetail title={title} entry={entry ?? null} />;
}
