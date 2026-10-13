import type { LibraryStatus } from "@/db/schema";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Refresh windows: series being watched are resynced often; everything else
 * waits longer. TMDB's terms ask for data to be refreshed within six months.
 */
export const REFRESH_WATCHING_MS = 24 * HOUR_MS;
export const REFRESH_DEFAULT_MS = 30 * 24 * HOUR_MS;

/** True when cached data is older than the window for the given status. */
export function isStale(
  lastSyncedAt: Date | null | undefined,
  status: LibraryStatus | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastSyncedAt) return true;
  const threshold = status === "watching" ? REFRESH_WATCHING_MS : REFRESH_DEFAULT_MS;
  return now.getTime() - new Date(lastSyncedAt).getTime() > threshold;
}
