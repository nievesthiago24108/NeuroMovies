import "server-only";

const BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_LANGUAGE = "es-MX";
const MAX_RETRIES = 3;
const MAX_CONCURRENCY = 4;
const BASE_BACKOFF_MS = 500;

export class TmdbMissingTokenError extends Error {
  constructor() {
    super("TMDB_ACCESS_TOKEN is not configured");
    this.name = "TmdbMissingTokenError";
  }
}

export class TmdbHttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "TmdbHttpError";
  }
}

export class TmdbNetworkError extends Error {
  constructor(cause: unknown) {
    super("TMDB network request failed", { cause });
    this.name = "TmdbNetworkError";
  }
}

/** True when a runtime request should abort because the token is missing. */
export function hasTmdbToken(): boolean {
  return Boolean(process.env.TMDB_ACCESS_TOKEN);
}

export function getTmdbLanguage(): string {
  return process.env.TMDB_LANGUAGE || DEFAULT_LANGUAGE;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter, capped at 8 seconds. */
function backoffMs(attempt: number): number {
  const exp = BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.random() * BASE_BACKOFF_MS;
  return Math.min(exp + jitter, 8_000);
}

// Simple semaphore to cap concurrent requests to TMDB.
let inFlight = 0;
const waiters: Array<() => void> = [];

function acquire(): Promise<void> {
  if (inFlight < MAX_CONCURRENCY) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  inFlight -= 1;
  const next = waiters.shift();
  if (next) next();
}

/**
 * GET a JSON endpoint from TMDB API v3 using the Read Access Token.
 * - Retries with exponential backoff on HTTP 429 and 5xx
 * - Honors the Retry-After header on 429 responses
 * - Retries transient network failures
 * - Caps concurrent in-flight requests
 * Server-only: the token never leaves this module.
 */
export async function tmdbFetch<T>(
  path: string,
  options: { params?: Record<string, string> } = {},
): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new TmdbMissingTokenError();

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(options.params ?? {})) {
    url.searchParams.set(key, value);
  }

  await acquire();
  try {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        });
      } catch (cause) {
        if (attempt >= MAX_RETRIES) throw new TmdbNetworkError(cause);
        await sleep(backoffMs(attempt));
        continue;
      }

      if (response.status === 429) {
        if (attempt >= MAX_RETRIES) {
          throw new TmdbHttpError(429, "TMDB rate limit exceeded (HTTP 429)");
        }
        const retryAfter = Number(response.headers.get("retry-after")) || 1;
        await sleep(retryAfter * 1000 + backoffMs(attempt));
        continue;
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt));
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new TmdbHttpError(
          response.status,
          `TMDB responded with HTTP ${response.status} for ${path}` +
            (body ? `: ${body.slice(0, 200)}` : ""),
        );
      }

      return (await response.json()) as T;
    }
  } finally {
    release();
  }
}