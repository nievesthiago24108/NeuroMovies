import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createSessionToken,
  isAuthEnabled,
  safeNextPath,
  SESSION_TTL_MS,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

const ENV_KEYS = ["APP_PASSWORD", "AUTH_SECRET"] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) original[key] = process.env[key];
  process.env.APP_PASSWORD = "correct horse";
  delete process.env.AUTH_SECRET;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("isAuthEnabled", () => {
  it("is false without APP_PASSWORD", () => {
    delete process.env.APP_PASSWORD;
    expect(isAuthEnabled()).toBe(false);
  });

  it("is true with APP_PASSWORD", () => {
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("accepts the configured password", async () => {
    expect(await verifyPassword("correct horse")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await verifyPassword("battery staple")).toBe(false);
    expect(await verifyPassword("")).toBe(false);
  });

  it("allows anything when auth is disabled", async () => {
    delete process.env.APP_PASSWORD;
    expect(await verifyPassword("whatever")).toBe(true);
  });
});

describe("session tokens", () => {
  it("round-trips a freshly created token", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("rejects an expired token", async () => {
    const now = Date.now();
    const token = await createSessionToken(now - SESSION_TTL_MS - 1);
    expect(await verifySessionToken(token, now)).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const token = await createSessionToken();
    const [expiry] = token.split(".");
    expect(await verifySessionToken(`${expiry}.deadbeef`)).toBe(false);
  });

  it("rejects malformed and empty tokens", async () => {
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken(null)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken("no-dot")).toBe(false);
    expect(await verifySessionToken("not-a-number.signature")).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    process.env.AUTH_SECRET = "another secret";
    expect(await verifySessionToken(token)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/biblioteca")).toBe("/biblioteca");
    expect(safeNextPath("/pelicula/123?x=1")).toBe("/pelicula/123?x=1");
  });

  it("falls back to home for unsafe or empty values", () => {
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("relative/path")).toBe("/");
  });
});
