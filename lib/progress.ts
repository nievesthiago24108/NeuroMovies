const SPECIAL_SEASON = 0;

/**
 * Return true if the episode has already aired (airDate <= today).
 * If airDate is missing or invalid, treat it as not aired yet.
 */
export function isAired(airDate: string | null | undefined, today: Date = new Date()): boolean {
  if (!airDate) return false;
  const d = new Date(airDate + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) {
    const d2 = new Date(airDate);
    if (Number.isNaN(d2.getTime())) return false;
    d.setTime(d2.getTime());
  }
  const t = new Date(today);
  t.setUTCHours(23, 59, 59, 999);
  return d <= t;
}

/** Calculate progress over aired episodes: watched aired / aired (integer counts). */
export function calculateProgress({
  totalEpisodes,
  watchedCount,
  airedCount,
}: {
  totalEpisodes: number;
  watchedCount: number;
  airedCount: number;
}) {
  const effectiveAired = Math.max(0, Math.min(airedCount, totalEpisodes));
  const effectiveWatched = Math.max(0, Math.min(watchedCount, effectiveAired));
  const percentage = effectiveAired === 0 ? 0 : Math.round((effectiveWatched / effectiveAired) * 100);
  return {
    watchedAired: effectiveWatched,
    airedCount: effectiveAired,
    totalEpisodes,
    percentage,
    isComplete: effectiveAired > 0 && effectiveWatched === effectiveAired,
  };
}

/** Compute season average rating from episode ratings (non-null). Returns number or null. */
export function averageSeasonRating(ratings: Array<number | null | undefined>): number | null {
  const values = ratings.filter((r): r is number => r !== null && r !== undefined && Number.isInteger(r) && r >= 1 && r <= 5);
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/** Series average from all episode ratings (non-null). */
export function averageSeriesRating(ratings: Array<number | null | undefined>): number | null {
  return averageSeasonRating(ratings);
}

/**
 * Determine whether season 0 (specials) should be hidden by default and whether it counts toward progress.
 * Always true/false per requirement: hide specials by default, do NOT count for progress.
 */
export function shouldHideSpecials(): boolean {
  return true;
}

export function countsTowardProgress(seasonNumber: number): boolean {
  return seasonNumber !== SPECIAL_SEASON;
}

/**
 * Whether a TMDB status means the show may still air new episodes
 * (so finishing the aired ones keeps it as "watching" rather than "watched").
 */
export function isReturningSeries(status: string | null | undefined): boolean {
  if (!status) return true;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("returning") ||
    normalized.includes("in production") ||
    normalized.includes("ongoing") ||
    normalized.includes("airing")
  );
}