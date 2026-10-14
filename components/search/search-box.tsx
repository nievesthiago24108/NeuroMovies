"use client";

import { useState } from "react";

export function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(local);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        placeholder="Buscar películas o series (en español)..."
        className="h-11 w-full rounded-control border border-line bg-surface px-4 text-base shadow-sm outline-none ring-accent/30 transition focus:border-accent focus:ring-2"
        aria-label="Buscar"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-accent-ink transition hover:bg-accent-strong disabled:opacity-70"
        disabled={local.trim().length < 2}
      >
        Buscar
      </button>
    </form>
  );
}