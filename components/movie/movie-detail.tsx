"use client";

import Image from "next/image";
import { useState } from "react";
import { backdropUrl, posterUrl } from "@/lib/tmdb/images";
import type { LibraryEntry, Title } from "@/db/schema";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/components/ui/toast-provider";
import { setMovieRating, setMovieWatchedAt, updateLibraryNotes, updateLibraryStatus } from "@/app/actions";

const STATUS_LABEL: Record<string, string> = {
  wishlist: "Quiero ver",
  watching: "Viendo",
  watched: "Vista",
  abandoned: "Abandonada",
};

export function MovieDetail({ title, entry }: { title: Title; entry: LibraryEntry | null }) {
  const poster = posterUrl(title.posterPath, "w780");
  const backdrop = backdropUrl(title.backdropPath, "w780");
  const year = title.releaseDate?.slice(0, 4) ?? "";
  const { showToast } = useToast();
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [pendingNotes, setPendingNotes] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(false);
  const [pendingDate, setPendingDate] = useState(false);

  const watchedAtStr = entry?.watchedAt ? new Date(entry.watchedAt).toISOString().slice(0, 10) : "";

  const handleRatingChange = async (next: number | null) => {
    const res = await setMovieRating(title.id, next);
    if (!res.ok) showToast("No se pudo guardar la puntuación");
    else showToast(next === null ? "Puntuación quitada" : `Puntuación: ${next} estrellas`);
  };
  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as "wishlist" | "watching" | "watched" | "abandoned";
    setPendingStatus(true);
    const res = await updateLibraryStatus(title.id, status);
    if (!res.ok) showToast("No se pudo cambiar el estado");
    setPendingStatus(false);
  };
  const handleNotesSave = async () => {
    setPendingNotes(true);
    const res = await updateLibraryNotes(title.id, notes.trim() === "" ? null : notes);
    if (!res.ok) showToast("No se pudieron guardar las notas");
    else showToast("Notas guardadas");
    setPendingNotes(false);
  };
  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const d = v ? new Date(v + "T00:00:00") : null;
    setPendingDate(true);
    const res = await setMovieWatchedAt(title.id, d);
    if (!res.ok) showToast("No se pudo guardar la fecha");
    setPendingDate(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {backdrop ? (
        <div className="relative -mx-4 h-48 overflow-hidden rounded-b-xl sm:-mx-6 sm:h-64 md:h-72">
          <Image src={backdrop} alt="" fill className="object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
        </div>
      ) : null}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="relative mx-auto h-64 w-44 shrink-0 overflow-hidden rounded-lg shadow md:mx-0 md:h-80 md:w-56">
          {poster ? (
            <Image src={poster} alt={title.title} fill className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center bg-zinc-200 text-sm text-zinc-500">Sin póster</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {title.title}
              {year ? ` (${year})` : ""}
            </h1>
            {title.originalTitle && title.originalTitle !== title.title ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{title.originalTitle}</p>
            ) : null}
          </header>
          {title.overview ? <p className="max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{title.overview}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Puntuación</span>
              <StarRating value={entry?.rating ?? null} onChange={handleRatingChange} size="lg" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Estado</span>
              <select
                value={entry?.status ?? "wishlist"}
                onChange={handleStatusChange}
                disabled={pendingStatus}
                className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-zinc-400">Fecha en que la vi</span>
              <input
                type="date"
                value={watchedAtStr}
                onChange={handleDateChange}
                disabled={pendingDate}
                className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-zinc-400">Nota personal (opcional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full max-w-2xl rounded-md border border-zinc-300 bg-white p-2 text-sm outline-none focus:border-teal-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <div>
              <button
                type="button"
                onClick={handleNotesSave}
                disabled={pendingNotes}
                className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {pendingNotes ? "Guardando..." : "Guardar nota"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}