import { describe, expect, it } from "vitest";
import { DT } from "../src/physics/core";
import { ALL_LEVELS } from "../src/levels";
import type { Level } from "../src/levels/types";

function run(level: Level, params: Record<string, number>) {
  const sim = level.create(params);
  let steps = 0;
  while (!sim.isDone() && steps < 120 / DT) {
    sim.step(DT);
    steps++;
  }
  expect(sim.isDone()).toBe(true);
  // Every readout/equation must be renderable at the end state.
  expect(sim.readouts().length).toBeGreaterThan(0);
  expect(sim.equation()).not.toContain("NaN");
  return sim.outcome();
}

describe.each(ALL_LEVELS.map((l) => [l.id, l] as const))("level %s", (_id, level) => {
  it("is solvable with its reference solution", () => {
    const o = run(level, level.solution);
    expect(o.success, o.message).toBe(true);
  });

  it("fails with a known wrong answer", () => {
    const o = run(level, level.wrong);
    expect(o.success, o.message).toBe(false);
  });

  it("fails with the default slider values (no free wins)", () => {
    const defaults = Object.fromEntries(level.controls.map((c) => [c.key, c.value]));
    expect(run(level, defaults).success).toBe(false);
  });

  it("has well-formed questions and in-range solution values", () => {
    for (const q of [level.predict, level.explain]) {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
    }
    for (const c of level.controls) {
      const v = level.solution[c.key];
      expect(v).toBeGreaterThanOrEqual(c.min);
      expect(v).toBeLessThanOrEqual(c.max);
      // solution lies on the slider's step grid
      const k = (v - c.min) / c.step;
      expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6);
    }
    expect(level.hints.length).toBe(3);
  });
});
