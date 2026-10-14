"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { posterUrl } from "@/lib/tmdb/images";
import { pickRandomIndex } from "@/lib/roulette";
import type { LibraryItem } from "@/lib/library-types";

/** How fast the posters cycle while spinning. */
const TICK_MS = 90;
/** How long the spin lasts before landing on the chosen movie. */
const SPIN_MS = 1100;

type Phase = "idle" | "spinning" | "result";

export function WishlistRoulette({ items }: { items: LibraryItem[] }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayIndex, setDisplayIndex] = useState(0);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Stop any in-flight animation if the component unmounts.
  useEffect(() => clearTimers, []);

  const spin = () => {
    if (phase === "spinning" || items.length === 0) return;
    const target = pickRandomIndex(items.length, chosenIndex);
    setChosenIndex(null);
    setPhase("spinning");

    intervalRef.current = setInterval(() => {
      setDisplayIndex((prev) => (items.length <= 1 ? 0 : (prev + 1) % items.length));
    }, TICK_MS);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setDisplayIndex(target);
      setChosenIndex(target);
      setPhase("result");
    }, SPIN_MS);
  };

  const shownIndex = phase === "result" && chosenIndex !== null ? chosenIndex : displayIndex;
  const shown = items[shownIndex];
  const poster = shown ? posterUrl(shown.posterPath, "w342") : null;
  const chosen = phase === "result" && chosenIndex !== null ? items[chosenIndex] : null;

  return (
    <section
      aria-label="Ruleta para elegir una película"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-center"
    >
      <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-control bg-surface-2">
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="96px"
            className={`object-cover ${phase === "spinning" ? "opacity-75" : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[11px] text-muted">
            Sin póster
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h2 className="font-display text-base font-semibold tracking-tight">¿No sabés qué ver?</h2>

        <div aria-live="polite" className="min-h-[3.25rem]">
          {chosen ? (
            <>
              <p className="font-display text-lg font-semibold leading-tight">
                {chosen.title}
                {chosen.year ? (
                  <span className="font-normal text-muted"> ({chosen.year})</span>
                ) : null}
              </p>
              <p className="text-sm text-muted">La ruleta eligió esta. ¡A verla!</p>
            </>
          ) : phase === "spinning" ? (
            <p className="text-sm text-muted">Girando…</p>
          ) : (
            <p className="text-sm text-muted">
              Dejá que la ruleta elija una película de tu lista &ldquo;Quiero ver&rdquo;.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={spin}
            disabled={phase === "spinning"}
            className="h-9 rounded-control bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-strong disabled:opacity-70"
          >
            {phase === "spinning"
              ? "Girando…"
              : phase === "result"
                ? "Girar de nuevo"
                : "Elegir al azar"}
          </button>
          {chosen ? (
            <Link
              href={`/pelicula/${chosen.tmdbId}`}
              className="inline-flex h-9 items-center rounded-control border border-line px-3 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              Ver ficha
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
