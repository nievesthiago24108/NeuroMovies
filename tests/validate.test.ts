import { describe, expect, it } from "vitest";
import { RatingValidationError, parseRating } from "@/lib/validate";

describe("parseRating", () => {
  it("returns null when clearing the rating", () => {
    expect(parseRating(null)).toBeNull();
    expect(parseRating(undefined)).toBeNull();
    expect(parseRating("")).toBeNull();
  });

  it("accepts every valid integer from 1 to 5", () => {
    for (const value of [1, 2, 3, 4, 5]) {
      expect(parseRating(value)).toBe(value);
    }
  });

  it("accepts numeric strings", () => {
    expect(parseRating("4")).toBe(4);
  });

  it("rejects ratings out of range", () => {
    expect(() => parseRating(0)).toThrow(RatingValidationError);
    expect(() => parseRating(6)).toThrow(RatingValidationError);
    expect(() => parseRating(-1)).toThrow(RatingValidationError);
  });

  it("rejects non-integers and garbage", () => {
    expect(() => parseRating(2.5)).toThrow(RatingValidationError);
    expect(() => parseRating(1.0 + 0.0000001)).toThrow(RatingValidationError);
    expect(() => parseRating("abc")).toThrow(RatingValidationError);
    expect(() => parseRating(NaN)).toThrow(RatingValidationError);
    expect(() => parseRating(Infinity)).toThrow(RatingValidationError);
    expect(() => parseRating({})).toThrow(RatingValidationError);
  });
});