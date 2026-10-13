"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SearchEntry } from "@/lib/tmdb/types";
import { SearchResults } from "@/components/search/search-results";

type TrendingState =
  | { status: "loading" }
  | { status: "ready"; results: SearchEntry[] }
  | { status: "missing-token" }
  | { status: "error" };

export function TrendingSection() {
  const [state, setState] = useState<TrendingState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/tmdb/trending?period=week&limit=12");
        const json = await response.json();
        if (!active) return;
        if (response.status === 400 && json?.error === "missing-token") {
          setState({ status: "missing-token" });
          return;
        }
        if (!response.ok) {
          setState({ status: "error" });
          return;
        }
        setState({ status: "ready", results: json.results ?? [] });
      } catch {
        if (active) setState({ status: "error" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <SearchResults results={[]} loading />;
  }

  if (state.status === "missing-token") {
    return (
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Falta configurar <code>TMDB_ACCESS_TOKEN</code>.{" "}
        <Link href="/configuracion" className="underline">
          Ver pasos de configuración
        </Link>
        .
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No se pudieron cargar las tendencias de TMDB. Intentá más tarde.
      </p>
    );
  }

  if (state.results.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay tendencias para mostrar ahora mismo.
      </p>
    );
  }

  return <SearchResults results={state.results} loading={false} />;
}
