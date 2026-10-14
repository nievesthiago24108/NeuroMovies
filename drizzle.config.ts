import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't load `.env` by itself; Node can.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on the real environment
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    // Migrations run against the direct (unpooled) connection: the transaction
    // pooler isn't meant to carry DDL/session state. Falls back to the pooled
    // URL and then to the Vercel/Neon integration name.
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "",
  },
  strict: true,
  verbose: true,
});
