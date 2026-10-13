import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Buscar",
};

export default function SearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Buscar</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Buscá películas y series para agregar a tu catálogo.
        </p>
      </header>
      <EmptyState
        title="Búsqueda en camino"
        description="El buscador en vivo con datos de TMDB llega en el próximo hito."
      />
    </div>
  );
}