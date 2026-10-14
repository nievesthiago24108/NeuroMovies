import type { Metadata } from "next";
import { connection } from "next/server";
import { SetupGuide } from "@/components/tmdb/setup-guide";
import { hasTmdbToken } from "@/lib/tmdb/client";
import { hasDatabaseUrl } from "@/db";

export const metadata: Metadata = {
  title: "Configuración",
};

// Read env at request time so the page reflects the running deployment.
export const instant = false;

export default async function SetupPage() {
  await connection();
  const configured = hasTmdbToken();
  const databaseReady = hasDatabaseUrl();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Configuración</h1>
        <p className="text-sm text-muted">
          Para usar la app necesitás un token de la TMDB API y una base de datos
          PostgreSQL.
        </p>
      </header>

      <StatusRow
        ok={databaseReady}
        okText="Base de datos configurada (DATABASE_URL)."
        pendingText="Falta configurar DATABASE_URL en el archivo .env"
      />
      <StatusRow
        ok={configured}
        okText="Token de TMDB configurado. Todo listo."
        pendingText="Falta configurar TMDB_ACCESS_TOKEN en el archivo .env"
      />

      {!configured ? <SetupGuidePanel /> : null}
    </div>
  );
}

function StatusRow({
  ok,
  okText,
  pendingText,
}: {
  ok: boolean;
  okText: string;
  pendingText: string;
}) {
  return (
    <div
      className={
        "flex items-center gap-2 rounded-card border p-3 text-sm " +
        (ok
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400")
      }
    >
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
      {ok ? okText : pendingText}
    </div>
  );
}

function SetupGuidePanel() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold tracking-tight">Cómo configurarlo</h2>
      <SetupGuide />
    </section>
  );
}
