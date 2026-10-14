import { describe, expect, it } from "vitest";
import { buildPageList, clampPage, pageCount } from "@/lib/pagination";

describe("pageCount", () => {
  it("rounds up the number of pages", () => {
    expect(pageCount(64, 24)).toBe(3);
    expect(pageCount(25, 24)).toBe(2);
    expect(pageCount(24, 24)).toBe(1);
    expect(pageCount(1, 24)).toBe(1);
  });

  it("never returns fewer than one page", () => {
    expect(pageCount(0, 24)).toBe(1);
  });

  it("guards against a non-positive page size", () => {
    expect(pageCount(50, 0)).toBe(1);
  });
});

describe("clampPage", () => {
  it("keeps pages inside the valid range", () => {
    expect(clampPage(1, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(3, 3)).toBe(3);
    expect(clampPage(4, 3)).toBe(3);
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(-5, 3)).toBe(1);
  });

  it("falls back to page 1 when there are no pages", () => {
    expect(clampPage(2, 0)).toBe(1);
  });
});

describe("buildPageList", () => {
  it("lists every page when there are seven or fewer", () => {
    expect(buildPageList(1, 1)).toEqual([1]);
    expect(buildPageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageList(7, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses far-apart pages into ellipses", () => {
    expect(buildPageList(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
    expect(buildPageList(12, 12)).toEqual([1, "gap", 11, 12]);
  });

  it("keeps the current page visible at the edges", () => {
    expect(buildPageList(1, 12)).toEqual([1, 2, "gap", 12]);
    expect(buildPageList(2, 12)).toEqual([1, 2, 3, "gap", 12]);
    expect(buildPageList(11, 12)).toEqual([1, "gap", 10, 11, 12]);
  });
});
