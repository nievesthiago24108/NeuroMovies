"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { posterUrl } from "@/lib/tmdb/images";
import { buildPageList, clampPage, pageCount } from "@/lib/pagination";
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

/** How many titles fit on one page before a new page is created. */
const PAGE_SIZE = 24;

const PAGER_BUTTON_CLASS =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-control border border-line px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40";

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Paginación de la biblioteca"
      className="flex flex-wrap items-center justify-center gap-1.5 pt-1"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${PAGER_BUTTON_CLASS} text-muted hover:bg-surface-2 hover:text-foreground`}
      >
        ← Anterior
      </button>

      {buildPageList(currentPage, totalPages).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-label={`Ir a la página ${entry}`}
            aria-current={entry === currentPage ? "page" : undefined}
            className={`${PAGER_BUTTON_CLASS} ${
              entry === currentPage
                ? "border-accent bg-accent text-accent-ink"
                : "text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${PAGER_BUTTON_CLASS} text-muted hover:bg-surface-2 hover:text-foreground`}
      >
        Siguiente →
      </button>
    </nav>
  );
}

function StarGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-rating">
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
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors hover:border-accent/50"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-2">
        {poster ? (
          <Image
            src={poster}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Sin póster
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-control bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
          {item.mediaType === "movie" ? "Película" : "Serie"}
        </span>
        {item.upToDate ? (
          <span className="absolute right-2 top-2 rounded-control bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-ink">
            Al día
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.title}
          {item.year ? <span className="text-muted"> ({item.year})</span> : null}
        </h3>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="rounded-control bg-surface-2 px-2 py-0.5 font-medium text-muted">
            {STATUS_LABEL[item.status]}
          </span>
          {item.rating != null ? (
            <span className="inline-flex items-center gap-0.5 font-semibold">
              <StarGlyph />
              {item.rating.toFixed(item.mediaType === "movie" ? 0 : 1)}
            </span>
          ) : (
            <span className="text-muted">Sin puntuar</span>
          )}
        </div>

        {item.progress && item.progress.total > 0 ? (
          <div className="mt-0.5 flex flex-col gap-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-[11px] text-muted">
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

  const totalPages = pageCount(filtered.length, PAGE_SIZE);
  const [page, setPage] = useState(1);
  const currentPage = clampPage(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const resultsRef = useRef<HTMLParagraphElement>(null);

  // Every filter/sort/search change goes back to the first page.
  function resetToFirstPage() {
    setPage(1);
  }

  function goToPage(next: number) {
    const target = clampPage(next, totalPages);
    if (target === currentPage) return;
    setPage(target);
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    resultsRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeTo = pageStart + visibleItems.length;

  const fieldClass =
    "h-9 rounded-control border border-line bg-surface px-2 text-sm text-foreground";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Filtrar por tipo"
            className="flex rounded-control border border-line p-0.5"
          >
            {MEDIA_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={media === option.value}
                onClick={() => {
                  setMedia(option.value);
                  resetToFirstPage();
                }}
                className={`rounded-[4px] px-3 py-1 text-sm font-medium transition-colors ${
                  media === option.value
                    ? "bg-accent text-accent-ink"
                    : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetToFirstPage();
            }}
            placeholder="Buscar en mi biblioteca"
            aria-label="Buscar en mi biblioteca"
            className="h-9 min-w-[12rem] flex-1 rounded-control border border-line bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            Estado
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as LibraryStatusFilter);
                resetToFirstPage();
              }}
              className={fieldClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-muted">
            Puntuación
            <select
              value={minRating ?? ""}
              onChange={(event) => {
                setMinRating(event.target.value === "" ? null : Number(event.target.value));
                resetToFirstPage();
              }}
              className={fieldClass}
            >
              {MIN_RATING_OPTIONS.map((value) => (
                <option key={value ?? "any"} value={value ?? ""}>
                  {value == null ? "Cualquiera" : `${value}★ o más`}
                </option>
              ))}
            </select>
          </label>

          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Ordenar por
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as LibrarySort);
                resetToFirstPage();
              }}
              className={fieldClass}
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

      <p ref={resultsRef} className="scroll-mt-20 text-xs text-muted">
        {filtered.length === 0
          ? "Sin resultados"
          : `Mostrando ${rangeFrom}–${rangeTo} de ${filtered.length} ${
              filtered.length === 1 ? "título" : "títulos"
            }${filtered.length !== items.length ? ` · ${items.length} en la biblioteca` : ""}`}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay títulos que coincidan"
          description="Probá cambiar los filtros o la búsqueda."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleItems.map((item) => (
              <LibraryCard key={item.titleId} item={item} />
            ))}
          </div>

          {totalPages > 1 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
