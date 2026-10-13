import { EmptyState } from "@/components/ui/empty-state";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Mi Catálogo</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tu seguimiento personal de películas y series.
        </p>
      </header>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Descubrí</h2>
        <EmptyState
          title="Todo listo para empezar"
          description="Próximamente: Continuar viendo, Quiero ver, Vistas recientes y tendencias de TMDB."
        />
      </div>
    </div>
  );
}