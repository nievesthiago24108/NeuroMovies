import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { episodeProgress, episodes, libraryEntries, seasons } from "@/db/schema";
import { SerieDetail } from "@/components/series/serie-detail";
import { ensureTitle, refreshTitleIfStale } from "@/lib/library";

export const instant = false;

export default async function SeriePage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return notFound();

  // Data comes from PostgreSQL and the current time, so render this route per
  // request instead of during prerendering.
  await connection();

  let title;
  try {
    title = await ensureTitle(id, "tv");
  } catch (error) {
    console.error(error);
    return notFound();
  }

  const entry = await db.query.libraryEntries.findFirst({
    where: eq(libraryEntries.titleId, title.id),
  });

  // Series being watched resync after 24h; others after 30 days.
  title = await refreshTitleIfStale(title, entry?.status);

  const [seasonRows, episodeRows] = await Promise.all([
    db.query.seasons.findMany({
      where: eq(seasons.titleId, title.id),
      orderBy: [asc(seasons.seasonNumber)],
    }),
    db.query.episodes.findMany({
      where: eq(episodes.titleId, title.id),
      orderBy: [asc(episodes.seasonNumber), asc(episodes.episodeNumber)],
    }),
  ]);

  const progressRows =
    episodeRows.length > 0
      ? await db.query.episodeProgress.findMany({
          where: inArray(
            episodeProgress.episodeId,
            episodeRows.map((episode) => episode.id),
          ),
        })
      : [];

  const progress: Record<number, { watched: boolean; rating: number | null }> = {};
  for (const row of progressRows) {
    progress[row.episodeId] = { watched: row.watched, rating: row.rating };
  }

  return (
    <SerieDetail
      title={title}
      entry={entry ?? null}
      seasons={seasonRows}
      episodes={episodeRows}
      progress={progress}
    />
  );
}
