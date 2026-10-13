"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { posterUrl } from "@/lib/tmdb/images";
import { setEpisodeProgress } from "@/app/actions";
import { useToast } from "@/components/ui/toast-provider";
import type { ContinueWatchingItem } from "@/lib/library-types";

export function ContinueWatching({ items }: { items: ContinueWatchingItem[] }) {
  const { showToast } = useToast();
  const [pending, setPending] = useState<number | null>(null);

  const handleWatched = async (item: ContinueWatchingItem) => {
    setPending(item.episodeId);
    const result = await setEpisodeProgress(item.episodeId, { watched: true });
    setPending(null);
    if (!result.ok) showToast(result.error ?? "No se pudo marcar como visto");
  };

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const poster = posterUrl(item.posterPath, "w185");
        return (
          <li
            key={item.titleId}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2.5 dark:border-zinc-800"
          >
            <Link
              href={`/serie/${item.tmdbId}`}
              className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
            >
              {poster ? (
                <Image src={poster} alt={item.title} fill sizes="56px" className="object-cover" />
              ) : null}
            </Link>
            <div className="flex flex-1 flex-col gap-0.5">
              <Link href={`/serie/${item.tmdbId}`} className="text-sm font-semibold hover:underline">
                {item.title}
              </Link>
              <span className="text-xs text-zinc-500">
                T{item.seasonNumber} · E{item.episodeNumber}
                {item.episodeName ? ` — ${item.episodeName}` : ""}
              </span>
              <span className="text-[11px] text-zinc-400">
                {item.watched} / {item.aired} episodios vistos
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleWatched(item)}
              disabled={pending === item.episodeId}
              className="h-9 shrink-0 rounded-md bg-teal-600 px-3 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-70"
            >
              {pending === item.episodeId ? "Guardando..." : "Marcar visto"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
