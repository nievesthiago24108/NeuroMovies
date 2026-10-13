import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

const DATABASE_FILE = process.env.DATABASE_FILE ?? "./data/app.db";

function createDatabase() {
  const resolvedPath = path.resolve(process.cwd(), DATABASE_FILE);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const sqlite = new Database(resolvedPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

// Keep a single connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __miCatalogoDb?: ReturnType<typeof createDatabase> };

export const db = globalForDb.__miCatalogoDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__miCatalogoDb = db;
}

export type DB = typeof db;