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

const fieldClass =
  "h-9 rounded-control border border-line bg-surface px-2 text-sm text-foreground";

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
        <div className="grain relative -mx-4 h-56 overflow-hidden sm:-mx-6 sm:h-72 md:h-80">
          <Image src={backdrop} alt="" fill sizes="100vw" className="object-cover opacity-70" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        </div>
      ) : null}
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="relative mx-auto aspect-[2/3] w-44 shrink-0 overflow-hidden rounded-card border border-line bg-surface-2 md:mx-0 md:w-56">
          {poster ? (
            <Image src={poster} alt={title.title} fill sizes="224px" className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">Sin póster</div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <header className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {title.title}
              {year ? <span className="text-muted"> ({year})</span> : null}
            </h1>
            {title.originalTitle && title.originalTitle !== title.title ? (
              <p className="text-sm text-muted">{title.originalTitle}</p>
            ) : null}
            <div className="perf" aria-hidden="true" />
          </header>
          {title.overview ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted">{title.overview}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Puntuación</span>
              <StarRating value={entry?.rating ?? null} onChange={handleRatingChange} size="lg" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Estado</span>
              <select
                value={entry?.status ?? "wishlist"}
                onChange={handleStatusChange}
                disabled={pendingStatus}
                className={fieldClass}
              >
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted">Fecha en que la vi</span>
              <input
                type="date"
                value={watchedAtStr}
                onChange={handleDateChange}
                disabled={pendingDate}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="nota" className="text-xs uppercase tracking-wide text-muted">
              Nota personal (opcional)
            </label>
            <textarea
              id="nota"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full max-w-2xl rounded-control border border-line bg-surface p-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            <div>
              <button
                type="button"
                onClick={handleNotesSave}
                disabled={pendingNotes}
                className="h-9 rounded-control bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-70"
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
