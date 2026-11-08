import { describe, expect, it } from "vitest";
import { DT } from "../src/physics/core";
import { CHAPTERS, findLevel } from "../src/levels";
import { TUTORIALS, TOUR_TARGETS } from "../src/tutorials";
import { Vary } from "../src/levels/util";

describe("chapter tutorials", () => {
  it("every chapter has a tutorial", () => {
    for (const ch of CHAPTERS) expect(TUTORIALS[ch.number], `chapter ${ch.number}`).toBeDefined();
  });

  describe.each(Object.values(TUTORIALS).map((t) => [t.chapter, t] as const))("chapter %d", (_n, tut) => {
    it("runs inside the first level of its chapter", () => {
      const ch = CHAPTERS.find((c) => c.number === tut.chapter)!;
      expect(tut.levelId).toBe(ch.levels[0].id);
    });

    it("only spotlights parts of the screen that exist", () => {
      for (const s of tut.steps) if (s.target) expect(TOUR_TARGETS).toContain(s.target);
    });

    it("demo attempt really misses, so 'learn from a miss' is true", () => {
      // tutorials always use the textbook numbers
      const lv = findLevel(tut.levelId)!.make(Vary.fixed());
      for (const c of lv.controls) {
        const v = tut.demo[c.key];
        expect(v, c.key).toBeGreaterThanOrEqual(c.min);
        expect(v, c.key).toBeLessThanOrEqual(c.max);
      }
      const sim = lv.create({ ...Object.fromEntries(lv.controls.map((c) => [c.key, c.value])), ...tut.demo });
      let n = 0;
      while (!sim.isDone() && n++ < 120 / DT) sim.step(DT);
      expect(sim.outcome().success).toBe(false);
    });

    it("includes the Pick-the-equation step right after the prediction", () => {
      const i = tut.steps.findIndex((s) => s.target === "predict");
      expect(tut.steps[i + 1].target).toBe("equation");
      expect(tut.steps[i + 1].think?.length).toBeGreaterThanOrEqual(2);
    });

    it("ends with a thinking checklist", () => {
      const last = tut.steps[tut.steps.length - 1];
      expect(last.think?.length).toBeGreaterThanOrEqual(3);
    });
  });
});
