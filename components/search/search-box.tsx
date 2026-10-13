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
        className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-base shadow-sm outline-none ring-teal-500 transition focus:border-teal-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
        aria-label="Buscar"
      />
      <button
        type="submit"
        className="h-11 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-70 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        disabled={local.trim().length < 2}
      >
        Buscar
      </button>
    </form>
  );
}