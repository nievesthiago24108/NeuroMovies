"use client";

import { useCallback, useEffect, useState } from "react";
import type { SearchEntry } from "@/lib/tmdb/types";
import { SearchBox } from "@/components/search/search-box";
import { SearchResults } from "@/components/search/search-results";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}&limit=18`);
      const json = await res.json();
      if (res.status === 400 && json?.error === "missing-token") {
        setError("Falta configurar TMDB_ACCESS_TOKEN. Andá a /configuracion.");
        setResults([]);
      } else if (!res.ok) {
        setError("No se pudo buscar en TMDB.");
        setResults([]);
      } else {
        setResults(json.results ?? []);
        setError(null);
      }
    } catch {
      setError("Ocurrió un error al buscar.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce on input change (live search)
  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Buscar</h1>
        <p className="text-sm text-muted">
          Buscá películas y series para agregar a tu catálogo.
        </p>
      </header>
      <SearchBox value={query} onChange={setQuery} onSubmit={search} />
      {error ? (
        <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
      ) : null}
      {query.trim().length >= 2 ? (
        <SearchResults results={results} loading={loading} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
          {/* Decorative SVG art: plain <img> avoids the image optimizer for vectors. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/projector.svg"
            alt="Ilustración de un proyector de cine encendido"
            width={220}
            height={145}
            className="opacity-85"
          />
          <p className="text-sm text-muted">
            Escribí al menos 2 letras para buscar películas y series.
          </p>
        </div>
      )}
    </div>
  );
}