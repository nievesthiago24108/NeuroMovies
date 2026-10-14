#!/usr/bin/env node
/**
 * One-off importer: local SQLite database (data/app.db) -> PostgreSQL.
 *
 * Reads the old SQLite file with the built-in `node:sqlite` module and copies
 * everything into the PostgreSQL database pointed at by DATABASE_URL.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/migrate-sqlite-to-pg.mjs
 *   DATABASE_URL="postgresql://..." node scripts/migrate-sqlite-to-pg.mjs --force
 *
 * It refuses to run if the destination already has titles, unless --force is
 * passed (which truncates the destination tables first).
 *
 * Uses the direct (unpooled) connection when available: the transaction pooler
 * isn't meant to carry this kind of multi-statement transaction.
 */
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { Client } from "pg";

// Load `.env` so `npm run db:import-sqlite` works without extra flags.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on the real environment
}

const sqlitePath = process.env.DATABASE_FILE || "data/app.db";
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;
const force = process.argv.includes("--force");

if (!url) {
  console.error("✖ Falta DATABASE_URL (o POSTGRES_URL).");
  process.exit(1);
}
if (!existsSync(sqlitePath)) {
  console.error(`✖ No existe el archivo SQLite: ${sqlitePath}`);
  process.exit(1);
}

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const client = new Client({ connectionString: url });
await client.connect();

const toDate = (ms) =>
  ms === null || ms === undefined ? null : new Date(Number(ms));
const toBool = (v) => v === 1 || v === true;
const toJson = (text) => {
  if (text === null || text === undefined) return null;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const read = (table) =>
  sqlite.prepare(`select * from ${table} order by rowid`).all();

const titles = read("titles");
const seasons = read("seasons");
const episodes = read("episodes");
const libraryEntries = read("library_entries");
const episodeProgress = read("episode_progress");

const {
  rows: [{ count }],
} = await client.query("select count(*)::int as count from titles");
if (count > 0 && !force) {
  console.error(
    `✖ La base destino ya tiene ${count} título(s). Usá --force para vaciarla y reimportar.`,
  );
  await client.end();
  process.exit(1);
}

console.log(
  `Importando: ${titles.length} títulos, ${seasons.length} temporadas, ${episodes.length} episodios, ` +
    `${libraryEntries.length} en biblioteca, ${episodeProgress.length} progresos…`,
);

try {
  await client.query("begin");
  await client.query(
    "truncate table episode_progress, episodes, seasons, library_entries, titles restart identity cascade",
  );

  for (const t of titles) {
    await client.query(
      `insert into titles (
        id, tmdb_id, media_type, title, original_title, overview, poster_path,
        backdrop_path, release_date, first_air_date, genres, runtime, tmdb_status,
        number_of_seasons, last_synced_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        t.id,
        t.tmdb_id,
        t.media_type,
        t.title,
        t.original_title,
        t.overview,
        t.poster_path,
        t.backdrop_path,
        t.release_date,
        t.first_air_date,
        JSON.stringify(toJson(t.genres)),
        t.runtime,
        t.tmdb_status,
        t.number_of_seasons,
        toDate(t.last_synced_at),
      ],
    );
  }

  for (const s of seasons) {
    await client.query(
      `insert into seasons (
        id, title_id, season_number, name, episode_count, air_date, poster_path
      ) values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        s.id,
        s.title_id,
        s.season_number,
        s.name,
        s.episode_count,
        s.air_date,
        s.poster_path,
      ],
    );
  }

  for (const e of episodes) {
    await client.query(
      `insert into episodes (
        id, title_id, season_id, tmdb_id, season_number, episode_number, name,
        overview, air_date, runtime, still_path
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        e.id,
        e.title_id,
        e.season_id,
        e.tmdb_id,
        e.season_number,
        e.episode_number,
        e.name,
        e.overview,
        e.air_date,
        e.runtime,
        e.still_path,
      ],
    );
  }

  for (const entry of libraryEntries) {
    await client.query(
      `insert into library_entries (
        title_id, status, rating, watched_at, added_at, notes
      ) values ($1,$2,$3,$4,$5,$6)`,
      [
        entry.title_id,
        entry.status,
        entry.rating,
        toDate(entry.watched_at),
        toDate(entry.added_at),
        entry.notes,
      ],
    );
  }

  for (const p of episodeProgress) {
    await client.query(
      `insert into episode_progress (
        episode_id, watched, watched_at, rating
      ) values ($1,$2,$3,$4)`,
      [p.episode_id, toBool(p.watched), toDate(p.watched_at), p.rating],
    );
  }

  // Realign the serial sequences with the imported ids.
  for (const table of ["titles", "seasons", "episodes"]) {
    await client.query(
      `select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${table}), 1))`,
    );
  }

  await client.query("commit");
} catch (error) {
  await client.query("rollback");
  throw error;
}

console.log("✔ Importación completa.");
await client.end();
sqlite.close();
