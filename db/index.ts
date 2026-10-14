import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

type Database = ReturnType<typeof createDatabase>;

/**
 * Accepts both the generic name (`DATABASE_URL`) and the one injected by the
 * Vercel/Neon integration (`POSTGRES_URL`).
 */
function resolveUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/** Whether a PostgreSQL connection string is configured. */
export function hasDatabaseUrl(): boolean {
  return Boolean(resolveUrl());
}

function createDatabase() {
  const url = resolveUrl();
  if (!url) {
    throw new Error(
      "Falta configurar DATABASE_URL (la cadena de conexión de PostgreSQL).",
    );
  }
  // `prepare: false` keeps compatibility with transaction poolers (Neon/PgBouncer).
  const client = postgres(url, { prepare: false, max: 1, idle_timeout: 20 });
  return drizzle(client, { schema });
}

function getDatabase(): Database {
  const globalForDb = globalThis as unknown as { __miCatalogoDb?: Database };
  if (!globalForDb.__miCatalogoDb) {
    globalForDb.__miCatalogoDb = createDatabase();
  }
  return globalForDb.__miCatalogoDb;
}

/**
 * Lazily created Drizzle client. Created on first access so importing this
 * module (e.g. during `next build`) never throws when the connection string is
 * missing; the error only surfaces when the database is actually used.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDatabase() as object, property, receiver);
  },
});

export type DB = Database;
