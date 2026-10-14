/** A page number, or an ellipsis standing in for the pages that were skipped. */
export type PageEntry = number | "gap";

/** Total pages needed to fit `totalItems` when each page holds `pageSize`. */
export function pageCount(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/** Clamps a 1-based page number into the valid `[1, total]` range. */
export function clampPage(page: number, total: number): number {
  const last = Math.max(1, total);
  return Math.min(Math.max(1, page), last);
}

/**
 * Windowed page numbers for a pager, e.g. `1 … 4 5 6 … 12`.
 * The first and last page are always reachable, and the current page is kept
 * in the window even at the edges.
 */
export function buildPageList(current: number, total: number): PageEntry[] {
  if (total <= 7) {
    return Array.from({ length: Math.max(1, total) }, (_, index) => index + 1);
  }

  const pages: PageEntry[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("gap");
  for (let value = start; value <= end; value += 1) pages.push(value);
  if (end < total - 1) pages.push("gap");
  pages.push(total);
  return pages;
}
