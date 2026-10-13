import { describe, expect, it } from "vitest";
import { isStale, REFRESH_DEFAULT_MS, REFRESH_WATCHING_MS } from "@/lib/refresh";

const NOW = new Date("2026-10-13T12:00:00Z");

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe("refresh windows", () => {
  it("uses 24h for series being watched and 30 days otherwise", () => {
    expect(REFRESH_WATCHING_MS).toBe(24 * 60 * 60 * 1000);
    expect(REFRESH_DEFAULT_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("isStale", () => {
  it("treats missing sync dates as stale", () => {
    expect(isStale(null, "watched", NOW)).toBe(true);
    expect(isStale(undefined, null, NOW)).toBe(true);
  });

  it("keeps fresh watching data (under 24h)", () => {
    expect(isStale(ago(60 * 60 * 1000), "watching", NOW)).toBe(false);
  });

  it("marks watching data older than 24h as stale", () => {
    expect(isStale(ago(25 * 60 * 60 * 1000), "watching", NOW)).toBe(true);
  });

  it("keeps non-watching data fresh for up to 30 days", () => {
    expect(isStale(ago(10 * 24 * 60 * 60 * 1000), "watched", NOW)).toBe(false);
    expect(isStale(ago(10 * 24 * 60 * 60 * 1000), null, NOW)).toBe(false);
  });

  it("marks non-watching data older than 30 days as stale", () => {
    expect(isStale(ago(31 * 24 * 60 * 60 * 1000), "wishlist", NOW)).toBe(true);
  });
});
