const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/** Image sizes used across the app: grillas use w342, fichas use w780. */
export type TmdbImageSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

export function tmdbImageUrl(path: string | null | undefined, size: TmdbImageSize): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Poster URL for grids (w342) or detail pages (w780). */
export const posterUrl = (path: string | null | undefined, size: TmdbImageSize = "w342"): string | null =>
  tmdbImageUrl(path, size);

/** Backdrop URL for detail headers. */
export const backdropUrl = (path: string | null | undefined, size: TmdbImageSize = "w780"): string | null =>
  tmdbImageUrl(path, size);

/** Episode still URL for episode cards. */
export const stillUrl = (path: string | null | undefined, size: TmdbImageSize = "w342"): string | null =>
  tmdbImageUrl(path, size);

/** Placeholder used when no image path is available. */
export const posterPlaceholder = (mediaType: "movie" | "tv"): string =>
  `/placeholder-${mediaType}.svg`;