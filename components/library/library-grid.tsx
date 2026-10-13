"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { posterUrl } from "@/lib/tmdb/images";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LIBRARY_SORT_LABEL,
  STATUS_LABEL,
  type LibraryItem,
  type LibraryMediaFilter,
  type LibrarySort,
  type LibraryStatusFilter,
} from "@/lib/library-types";

const MEDIA_OPTIONS: Array<{ value: LibraryMediaFilter; label: string }> = [
  { value: "all", label: "Todo" },
  { value: "movie", label: "Películas" },
  { value: "tv", label: "Series" },
];

const STATUS_OPTIONS: Array<{ value: LibraryStatusFilter; label: string }> = [
  { value: "all", label: "Todos los estados" },
  { value: "wishlist", label: STATUS_LABEL.wishlist },
  { value: "watching", label: STATUS_LABEL.watching },
  { value: "watched", label: STATUS_LABEL.watched },
  { value: "abandoned", label: STATUS_LABEL.abandoned },
];

const MIN_RATING_OPTIONS = [null, 1, 2, 3, 4, 5] as const;

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400">
      <path d="M12 2.5l2.84 5.75 6.35.93-4.6 4.48 1.09 6.33L12 17.02l-5.68 2.97 1.09-6.33-4.6-4.48 6.35-.93L12 2.5z" />
    </svg>
  );
}

function compareItems(a: LibraryItem, b: LibraryItem, sort: LibrarySort): number {
  switch (sort) {
    case "added-asc":
      return a.addedAt.localeCompare(b.addedAt);
    case "title-asc":
      return a.title.localeCompare(b.title, "es");
    case "title-desc":
      return b.title.localeCompare(a.title, "es");
    case "rating-desc":
      return (b.rating ?? -1) - (a.rating ?? -1);
    case "rating-asc":
      return (a.rating ?? 999) - (b.rating ?? 999);
    case "added-desc":
    default:
      return b.addedAt.localeCompare(a.addedAt);
  }
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const poster = posterUrl(item.posterPath, "w342");
  const href =
    item.mediaType === "movie" ? `/pelicula/${item.tmdbId}` : `/serie/${item.tmdbId}`;
  const percentage =
    item.progress && item.progress.aired > 0
      ? Math.round((item.progress.watched / item.progress.aired) * 100)
      : 0;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {poster ? (
          <Image
            src={poster}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            Sin póster
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {item.mediaType === "movie" ? "Película" : "Serie"}
        </span>
        {item.upToDate ? (
          <span className="absolute right-2 top-2 rounded bg-teal-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
            Al día
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.title}
          {item.year ? <span className="text-zinc-400"> ({item.year})</span> : null}
        </h3>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {STATUS_LABEL[item.status]}
          </span>
          {item.rating != null ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-zinc-700 dark:text-zinc-200">
              <StarGlyph />
              {item.rating.toFixed(item.mediaType === "movie" ? 0 : 1)}
            </span>
          ) : (
            <span className="text-zinc-400">Sin puntuar</span>
          )}
        </div>

        {item.progress && item.progress.total > 0 ? (
          <div className="mt-0.5 flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500">
              {item.progress.watched} / {item.progress.aired} episodios vistos
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function LibraryGrid({ items }: { items: LibraryItem[] }) {
  const [media, setMedia] = useState<LibraryMediaFilter>("all");
  const [status, setStatus] = useState<LibraryStatusFilter>("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("added-desc");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (media !== "all" && item.mediaType !== media) return false;
      if (status !== "all" && item.status !== status) return false;
      if (minRating != null && (item.rating ?? 0) < minRating) return false;
      if (needle && !item.title.toLowerCase().includes(needle)) return false;
      return true;
    });
    return [...list].sort((a, b) => compareItems(a, b, sort));
  }, [items, media, status, minRating, query, sort]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700">
            {MEDIA_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMedia(option.value)}
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  media === option.value
                    ? "bg-teal-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en mi biblioteca"
            aria-label="Buscar en mi biblioteca"
            className="h-9 min-w-[12rem] flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as LibraryStatusFilter)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Puntuación
            <select
              value={minRating ?? ""}
              onChange={(event) =>
                setMinRating(event.target.value === "" ? null : Number(event.target.value))
              }
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {MIN_RATING_OPTIONS.map((value) => (
                <option key={value ?? "any"} value={value ?? ""}>
                  {value == null ? "Cualquiera" : `${value}★ o más`}
                </option>
              ))}
            </select>
          </label>

          <label className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as LibrarySort)}
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {Object.entries(LIBRARY_SORT_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        {filtered.length} de {items.length} títulos
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay títulos que coincidan"
          description="Probá cambiar los filtros o la búsqueda."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <LibraryCard key={item.titleId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
