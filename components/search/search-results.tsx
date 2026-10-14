"use client";

import Image from "next/image";
import Link from "next/link";
import { posterUrl } from "@/lib/tmdb/images";
import type { SearchEntry } from "@/lib/tmdb/types";
import { addToLibrary } from "@/app/actions";
import { useToast } from "@/components/ui/toast-provider";
import { useState } from "react";

export function SearchResults({
  results,
  loading,
}: {
  results: SearchEntry[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-card bg-surface-2" />
        ))}
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <p className="text-sm text-muted">Sin resultados. Probá con otro término.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
      {results.map((r) => (
        <SearchCard key={`${r.mediaType}-${r.tmdbId}`} entry={r} />
      ))}
    </div>
  );
}

function SearchCard({ entry }: { entry: SearchEntry }) {
  const poster = posterUrl(entry.posterPath, "w342");
  const href = entry.mediaType === "movie" ? `/pelicula/${entry.tmdbId}` : `/serie/${entry.tmdbId}`;
  const year = entry.releaseDate?.slice(0, 4) ?? "";
  const { showToast } = useToast();
  const [pending, setPending] = useState<"wishlist" | "watching" | null>(null);

  const handleAdd = async (status: "wishlist" | "watching") => {
    setPending(status);
    try {
      const res = await addToLibrary(entry.tmdbId, entry.mediaType, status);
      if (res.ok) {
        showToast(
          status === "wishlist"
            ? "Agregado a 'Quiero ver'"
            : "Agregado a 'Viendo'",
        );
      } else {
        showToast("No se pudo agregar");
      }
    } catch {
      showToast("No se pudo agregar");
    } finally {
      setPending(null);
    }
  };

  return (
    <article className="flex flex-col gap-2">
      <Link
        href={href}
        className="group relative block aspect-[2/3] overflow-hidden rounded-card border border-line bg-surface-2"
      >
        {poster ? (
          <Image
            src={poster}
            alt={entry.title}
            fill
            sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            Sin póster
          </div>
        )}
      </Link>
      <div className="flex flex-col gap-1">
        <Link href={href} className="line-clamp-2 text-sm font-medium transition-colors hover:text-accent">
          {entry.title}
          {year ? ` (${year})` : ""}
        </Link>
        <p className="text-[11px] uppercase tracking-wide text-muted">
          {entry.mediaType === "movie" ? "Película" : "Serie"}
        </p>
        <p className="line-clamp-2 text-xs text-muted">{entry.overview}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => handleAdd("wishlist")}
            disabled={pending !== null}
            className="rounded-control border border-line bg-surface-2 px-2 py-1 text-xs font-medium transition hover:border-accent/50 hover:text-accent disabled:opacity-70"
          >
            {pending === "wishlist" ? "Agregando..." : "Quiero ver"}
          </button>
          <button
            type="button"
            onClick={() => handleAdd("watching")}
            disabled={pending !== null}
            className="rounded-control bg-accent px-2 py-1 text-xs font-medium text-accent-ink transition hover:bg-accent-strong disabled:opacity-70"
          >
            {pending === "watching" ? "Agregando..." : "Viendo"}
          </button>
        </div>
      </div>
    </article>
  );
}
