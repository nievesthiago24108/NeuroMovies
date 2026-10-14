import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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
  // Standard Postgres TCP driver (node-postgres) with a connection pool. This is
  // the recommended setup on Vercel Fluid compute: the pool is reused across
  // requests and stays warm, skipping the connection handshake. `sslmode=require`
  // (present in the Neon URL) is honored by node-postgres.
  const pool = new Pool({
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  // Lets Vercel close idle connections gracefully before the function suspends.
  // A no-op outside of Vercel (e.g. local dev).
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
}

function getDatabase(): Database {
  const globalForDb = globalThis as unknown as { __neuroMoviesDb?: Database };
  if (!globalForDb.__neuroMoviesDb) {
    globalForDb.__neuroMoviesDb = createDatabase();
  }
  return globalForDb.__neuroMoviesDb;
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
