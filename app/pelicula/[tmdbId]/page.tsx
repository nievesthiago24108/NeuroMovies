import { notFound } from "next/navigation";

export const instant = false;

export default async function PeliculaPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;
  const id = Number(tmdbId);
  if (!Number.isFinite(id)) return notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Película (tmdbId: {id})</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Ficha con estado, fecha vista, puntuación y nota (próximamente).
      </p>
    </div>
  );
}