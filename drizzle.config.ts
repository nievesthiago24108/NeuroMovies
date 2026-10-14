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
    // DATABASE_URL (generic) or POSTGRES_URL (Vercel/Neon integration).
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || "",
  },
  strict: true,
  verbose: true,
});
