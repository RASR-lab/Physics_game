import { describe, expect, it } from "vitest";
import { ALL_LEVELS, CHAPTERS, VISIBLE_CHAPTERS, VISIBLE_LEVELS, findVisibleLevel, isChapterVisible, nextLevel } from "../src/levels";

describe("hidden chapters", () => {
  it("the webpage shows only chapters 10–13", () => {
    expect(VISIBLE_CHAPTERS.map((c) => c.number)).toEqual([10, 11, 12, 13]);
  });

  it("chapters 2, 3, 5 and 6 are hidden, not deleted", () => {
    expect(CHAPTERS.filter((c) => c.hidden).map((c) => c.number)).toEqual([2, 3, 5, 6]);
    for (const n of [2, 3, 5, 6]) {
      expect(isChapterVisible(n)).toBe(false);
      expect(ALL_LEVELS.some((l) => l.id.startsWith(`${n}-`))).toBe(true);
    }
  });

  it("hidden levels cannot be opened and Next never leads into them", () => {
    for (const lv of ALL_LEVELS) {
      const visible = VISIBLE_LEVELS.includes(lv);
      expect(findVisibleLevel(lv.id) !== undefined).toBe(visible);
      const nxt = nextLevel(lv.id);
      if (nxt) expect(VISIBLE_LEVELS).toContain(nxt);
    }
  });
});
