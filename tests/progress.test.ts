import { describe, expect, it } from "vitest";
import {
  averageSeasonRating,
  averageSeriesRating,
  calculateProgress,
  countsTowardProgress,
  isAired,
  isReturningSeries,
  shouldHideSpecials,
} from "@/lib/progress";

describe("isAired", () => {
  it("returns true when air date is today or in the past", () => {
    const today = new Date("2026-10-13T08:00:00Z");
    expect(isAired("2026-10-13", today)).toBe(true);
    expect(isAired("2026-10-12", today)).toBe(true);
    expect(isAired("2026-10-01", today)).toBe(true);
  });

  it("returns false when air date is in the future", () => {
    const today = new Date("2026-10-13T08:00:00Z");
    expect(isAired("2026-10-14", today)).toBe(false);
    expect(isAired("2027-01-01", today)).toBe(false);
  });

  it("returns false for missing or invalid dates", () => {
    const today = new Date("2026-10-13T08:00:00Z");
    expect(isAired(null, today)).toBe(false);
    expect(isAired(undefined, today)).toBe(false);
    expect(isAired("", today)).toBe(false);
    expect(isAired("not-a-date", today)).toBe(false);
  });
});

describe("calculateProgress", () => {
  it("computes progress over aired episodes only", () => {
    const p = calculateProgress({ totalEpisodes: 10, watchedCount: 5, airedCount: 8 });
    expect(p).toEqual({
      watchedAired: 5,
      airedCount: 8,
      totalEpisodes: 10,
      percentage: 63,
      isComplete: false,
    });
  });

  it("rounds percentage correctly", () => {
    expect(calculateProgress({ totalEpisodes: 3, watchedCount: 1, airedCount: 3 }).percentage).toBe(33);
    expect(calculateProgress({ totalEpisodes: 3, watchedCount: 2, airedCount: 3 }).percentage).toBe(67);
    expect(calculateProgress({ totalEpisodes: 3, watchedCount: 3, airedCount: 3 }).percentage).toBe(100);
  });

  it("returns 0 and not complete when no episodes have aired", () => {
    const p = calculateProgress({ totalEpisodes: 10, watchedCount: 0, airedCount: 0 });
    expect(p.percentage).toBe(0);
    expect(p.isComplete).toBe(false);
    expect(p.watchedAired).toBe(0);
  });

  it("marks as complete when all aired episodes are watched", () => {
    const p = calculateProgress({ totalEpisodes: 24, watchedCount: 10, airedCount: 10 });
    expect(p.isComplete).toBe(true);
    expect(p.percentage).toBe(100);
  });

  it("clamps counts to aired/total bounds", () => {
    const p = calculateProgress({ totalEpisodes: 5, watchedCount: 10, airedCount: 20 });
    expect(p.watchedAired).toBe(5);
    expect(p.airedCount).toBe(5);
  });
});

describe("average ratings", () => {
  it("computes average season rating (one decimal rounded)", () => {
    expect(averageSeasonRating([5, 4, 3])).toBe(4.0);
    expect(averageSeasonRating([5, 4])).toBe(4.5);
    expect(averageSeasonRating([5, 5, 4])).toBe(4.7);
  });

  it("ignores null/undefined/invalid values", () => {
    expect(averageSeasonRating([5, null, 3, undefined, 6, 2.5])).toBe(4.0);
  });

  it("returns null when no valid ratings exist", () => {
    expect(averageSeasonRating([])).toBeNull();
    expect(averageSeasonRating([null, undefined])).toBeNull();
  });

  it("series average delegates to season average", () => {
    expect(averageSeriesRating([5, 5, 4])).toBe(4.7);
    expect(averageSeriesRating([])).toBeNull();
  });
});

describe("specials handling", () => {
  it("hides specials by default and does not count toward progress", () => {
    expect(shouldHideSpecials()).toBe(true);
    expect(countsTowardProgress(0)).toBe(false);
    expect(countsTowardProgress(1)).toBe(true);
    expect(countsTowardProgress(2)).toBe(true);
  });
});

describe("isReturningSeries", () => {
  it("is true for shows that may still air episodes", () => {
    expect(isReturningSeries("Returning Series")).toBe(true);
    expect(isReturningSeries("In Production")).toBe(true);
    expect(isReturningSeries("Ongoing")).toBe(true);
    expect(isReturningSeries("Currently Airing")).toBe(true);
  });

  it("is false for finished shows", () => {
    expect(isReturningSeries("Ended")).toBe(false);
    expect(isReturningSeries("Canceled")).toBe(false);
    expect(isReturningSeries("Released")).toBe(false);
  });

  it("defaults to true when the status is unknown", () => {
    expect(isReturningSeries(null)).toBe(true);
    expect(isReturningSeries(undefined)).toBe(true);
    expect(isReturningSeries("")).toBe(true);
  });
});