import type { LibraryStatus, MediaType } from "@/db/schema";

export const STATUS_LABEL: Record<LibraryStatus, string> = {
  wishlist: "Quiero ver",
  watching: "Viendo",
  watched: "Vista",
  abandoned: "Abandonada",
};

export interface TvProgress {
  watched: number;
  aired: number;
  total: number;
}

/** A library entry joined with the data the grid/filters need. */
export interface LibraryItem {
  titleId: number;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  /** Movie release year or series first-air year. */
  year: string | null;
  status: LibraryStatus;
  /** Movie rating (1–5) or the series episode-rating average (fractional). */
  rating: number | null;
  /** How many episode ratings back a series average (0 for movies). */
  ratingCount: number;
  addedAt: string;
  watchedAt: string | null;
  /** Only set for series. */
  progress: TvProgress | null;
  /** Series that finished all aired episodes while still airing. */
  upToDate: boolean;
}

export type LibraryMediaFilter = "all" | MediaType;
export type LibraryStatusFilter = "all" | LibraryStatus;

/** A series being watched and the next aired episode to watch. */
export interface ContinueWatchingItem {
  titleId: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  seasonNumber: number;
  episodeNumber: number;
  episodeId: number;
  episodeName: string | null;
  watched: number;
  aired: number;
}

export type LibrarySort =
  | "added-desc"
  | "added-asc"
  | "title-asc"
  | "title-desc"
  | "rating-desc"
  | "rating-asc";

export const LIBRARY_SORT_LABEL: Record<LibrarySort, string> = {
  "added-desc": "Agregado (recientes primero)",
  "added-asc": "Agregado (antiguos primero)",
  "title-asc": "Título (A–Z)",
  "title-desc": "Título (Z–A)",
  "rating-desc": "Puntuación (mayor primero)",
  "rating-asc": "Puntuación (menor primero)",
};
