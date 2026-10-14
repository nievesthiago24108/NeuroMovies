/**
 * Minimal single-user authentication.
 *
 * A password (`APP_PASSWORD`) is exchanged for a stateless, signed cookie. The
 * token is `"<expiresAt>.<hmac>"`, signed with `AUTH_SECRET` (falling back to
 * `APP_PASSWORD`). No server-side session store is needed.
 *
 * This module is deliberately free of `server-only` and of `next/headers`
 * imports so it can also run inside `proxy.ts`.
 */

/** Name of the session cookie. */
export const SESSION_COOKIE = "mc_session";

/** How long a login stays valid. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

/** Authentication is only enforced when a password is configured. */
export function isAuthEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

function getSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(mac));
}

/** Constant-time-ish string comparison (length is not secret here). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Compare the submitted password against `APP_PASSWORD`. */
export async function verifyPassword(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true;
  return safeEqual(input, expected);
}

/** Create a signed session token that expires in `SESSION_TTL_MS`. */
export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("AUTH_SECRET/APP_PASSWORD no está configurado.");
  const expiresAt = String(now + SESSION_TTL_MS);
  const signature = await sign(secret, expiresAt);
  return `${expiresAt}.${signature}`;
}

/** Validate a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined | null,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const separator = token.indexOf(".");
  if (separator <= 0) return false;
  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) < now) return false;

  const expected = await sign(secret, expiresAt);
  return safeEqual(signature, expected);
}

/** Only allow same-site relative redirects (no open redirects). */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
