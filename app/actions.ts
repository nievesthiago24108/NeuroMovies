"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryEntries, titles } from "@/db/schema";
import { parseRating } from "@/lib/validate";

/**
 * Set (or clear) the personal rating for a movie.
 *
 * Rating an integer 1–5 sets the entry to "watched" (with watched_at).
 * Passing null clears the rating without changing the status.
 * The value is validated on the server; the DB CHECK constraint backs it up.
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
  const set = rating === null ? { rating: null } : { rating, status: "watched" as const, watchedAt: now };

  await db
    .insert(libraryEntries)
    .values({ titleId, addedAt: now, ...set })
    .onConflictDoUpdate({
      target: libraryEntries.titleId,
      set,
    });

  revalidatePath("/");
  return { ok: true };
}