/**
 * Pick a random index in [0, length). Returns -1 when there is nothing to pick.
 *
 * When more than one option exists the result is guaranteed to differ from
 * `avoidIndex`, so a re-spin never lands on the same item twice in a row.
 * `random` is injectable to keep the function pure and testable.
 */
export function pickRandomIndex(
  length: number,
  avoidIndex?: number | null,
  random: () => number = Math.random,
): number {
  if (!Number.isFinite(length) || length <= 0) return -1;
  const size = Math.floor(length);
  const raw = Math.floor(random() * size);
  const index = Math.min(Math.max(raw, 0), size - 1);
  if (size > 1 && avoidIndex != null && index === avoidIndex) {
    return (index + 1) % size;
  }
  return index;
}
