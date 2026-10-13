import { MAX_RATING, MIN_RATING } from "@/db/schema";

export class RatingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RatingValidationError";
  }
}

/**
 * Parse a rating value coming from the client or a form.
 *
 * Accepts:
 *   - null, undefined, ""   -> null (clears the rating)
 *   - integer 1..5          -> the number itself
 *
 * Throws RatingValidationError for anything else (0, 6, 1.5, "abc", NaN...).
 * Mirrors the CHECK constraints enforced by the database.
 */
export function parseRating(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < MIN_RATING || numeric > MAX_RATING) {
    throw new RatingValidationError(
      `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`,
    );
  }
  return numeric;
}