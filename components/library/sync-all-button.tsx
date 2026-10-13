"use client";

import { useState } from "react";
import { syncAllSeries } from "@/app/actions";
import { useToast } from "@/components/ui/toast-provider";

export function SyncAllButton() {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);

  const handleSync = async () => {
    setPending(true);
    try {
      const result = await syncAllSeries();
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      if (result.totalSeries === 0) {
        showToast("No hay series para sincronizar.");
        return;
      }
      if (result.failedSeries > 0) {
        showToast(
          `Sincronizadas ${result.syncedSeries} de ${result.totalSeries} series (${result.failedSeries} con error).`,
        );
        return;
      }
      const episodes =
        result.newEpisodes === 1 ? "1 episodio nuevo" : `${result.newEpisodes} episodios nuevos`;
      showToast(`Listo: ${result.syncedSeries} series al día, ${episodes}.`);
    } catch {
      showToast("No se pudo sincronizar. Intentá de nuevo.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={pending}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Sincronizando…
        </>
      ) : (
        "Sincronizar todo"
      )}
    </button>
  );
}
