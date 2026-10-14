import { describe, expect, it } from "vitest";
import { pickRandomIndex } from "@/lib/roulette";

describe("pickRandomIndex", () => {
  it("returns -1 when there is nothing to pick", () => {
    expect(pickRandomIndex(0)).toBe(-1);
    expect(pickRandomIndex(-3)).toBe(-1);
  });

  it("returns 0 when there is a single option", () => {
    expect(pickRandomIndex(1)).toBe(0);
    expect(pickRandomIndex(1, 0)).toBe(0);
  });

  it("always stays within range", () => {
    for (const r of [0, 0.0001, 0.5, 0.9999, 1]) {
      const index = pickRandomIndex(5, undefined, () => r);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(5);
    }
  });

  it("floors the random value to an index", () => {
    // 0.4 * 5 = 2 -> index 2
    expect(pickRandomIndex(5, null, () => 0.4)).toBe(2);
    // 0.1 * 5 = 0.5 -> index 0
    expect(pickRandomIndex(5, null, () => 0.1)).toBe(0);
  });

  it("never repeats the avoided index when there is more than one option", () => {
    // Would otherwise land on 2 (the avoided one), so it shifts to 3.
    expect(pickRandomIndex(5, 2, () => 0.4)).toBe(3);
    // Wraps around when the avoided index is the last one.
    expect(pickRandomIndex(5, 4, () => 0.99)).toBe(0);
    // A value that does not collide is returned untouched.
    expect(pickRandomIndex(5, 2, () => 0.1)).toBe(0);
  });

  it("ignores an out-of-range avoid index", () => {
    expect(pickRandomIndex(3, 9, () => 0)).toBe(0);
  });

  it("clamps an out-of-range random value", () => {
    expect(pickRandomIndex(5, null, () => 1)).toBe(4);
    expect(pickRandomIndex(5, null, () => 2)).toBe(4);
  });
});
