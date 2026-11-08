import { describe, expect, it } from "vitest";
import { DT } from "../src/physics/core";
import { ALL_LEVELS } from "../src/levels";
import type { Level } from "../src/levels/types";
import { Vary } from "../src/levels/util";
import { EQUATIONS, PICK_EQUATION } from "../src/levels/equations";

/** Every level is checked with its textbook numbers and with this many random versions. */
const SEEDS = Array.from({ length: 30 }, (_, i) => 1 + i * 7919);
const variants = (seedList = SEEDS) => [["textbook", Vary.fixed()] as const, ...seedList.map((s) => [`seed ${s}`, Vary.seeded(s)] as const)];

function run(level: Level, params: Record<string, number>) {
  const sim = level.create(params);
  let steps = 0;
  while (!sim.isDone() && steps < 120 / DT) {
    sim.step(DT);
    steps++;
  }
  expect(sim.isDone(), `${level.id} never finished`).toBe(true);
  // Every readout/equation must be renderable at the end state.
  expect(sim.readouts().length).toBeGreaterThan(0);
  expect(sim.equation()).not.toMatch(/NaN|undefined|Infinity/);
  for (const r of sim.readouts()) expect(r.value, r.label).not.toMatch(/NaN|undefined/);
  return sim.outcome();
}

const describeLabel = (lv: Level, name: string, p: Record<string, number>) => `${lv.id} ${name} ${JSON.stringify(p)}`;

describe.each(ALL_LEVELS.map((d) => [d.id, d] as const))("level %s", (_id, def) => {
  it.each(variants())("%s: solvable with its reference solution", (name, v) => {
    const lv = def.make(v);
    const o = run(lv, lv.solution);
    expect(o.success, `${describeLabel(lv, name, lv.solution)}: ${o.message}`).toBe(true);
  });

  it.each(variants())("%s: fails with a known wrong answer and with the default sliders", (name, v) => {
    const lv = def.make(v);
    const o = run(lv, lv.wrong);
    expect(o.success, `${describeLabel(lv, name, lv.wrong)}: ${o.message}`).toBe(false);
    const defaults = Object.fromEntries(lv.controls.map((c) => [c.key, c.value]));
    expect(run(lv, defaults).success, `${describeLabel(lv, name, defaults)} (defaults)`).toBe(false);
  });

  it.each(variants())("%s: well-formed questions, text, and in-range answers", (name, v) => {
    const lv = def.make(v);
    const base = def.make(Vary.fixed());
    for (const [q, q0] of [
      [lv.predict, base.predict],
      [lv.explain, base.explain],
    ] as const) {
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThan(q.options.length);
      // shuffling keeps the same set of options (text may differ only through the numbers)
      expect(q.options.length).toBe(q0.options.length);
      expect(new Set(q.options).size, `duplicate options in ${lv.id} ${name}: ${q.options}`).toBe(q.options.length);
    }
    const text = [lv.hook, lv.goal, ...lv.hints, lv.predict.prompt, ...lv.predict.options, lv.predict.why, lv.explain.prompt, ...lv.explain.options, lv.explain.why];
    for (const t of text) expect(t, `${lv.id} ${name}`).not.toMatch(/NaN|undefined|Infinity/);
    for (const c of lv.controls) {
      for (const [what, set] of [
        ["solution", lv.solution],
        ["wrong", lv.wrong],
      ] as const) {
        const val = set[c.key];
        expect(val, `${lv.id} ${name} ${what}.${c.key}`).toBeGreaterThanOrEqual(c.min);
        expect(val, `${lv.id} ${name} ${what}.${c.key}`).toBeLessThanOrEqual(c.max);
        // lies on the slider's step grid, so a student can actually set it
        const k = (val - c.min) / c.step;
        expect(Math.abs(k - Math.round(k)), `${lv.id} ${name} ${what}.${c.key}=${val} off-grid`).toBeLessThan(1e-6);
      }
      expect(c.value).toBeGreaterThanOrEqual(c.min);
      expect(c.value).toBeLessThanOrEqual(c.max);
    }
    expect(lv.hints.length).toBe(3);
  });

  it.each(variants(SEEDS.slice(0, 10)))("%s: has a 4-option 'Pick the equation' step from the sheet", (name, v) => {
    const lv = def.make(v);
    const q = lv.pickEq!;
    expect(q, `${lv.id} ${name}`).toBeDefined();
    expect(q.options.length).toBe(4);
    expect(new Set(q.options).size, `${lv.id}: repeated equation`).toBe(4);
    for (const id of q.options) expect(EQUATIONS, `${lv.id}: unknown equation ${id}`).toHaveProperty(id);
    expect(q.options[q.correct]).toBe(PICK_EQUATION[lv.id].correct);
    expect(q.why.length).toBeGreaterThan(20);
  });
});

describe("Pick the equation", () => {
  it("every level has exactly one entry, and nothing extra", () => {
    expect(Object.keys(PICK_EQUATION).sort()).toEqual(ALL_LEVELS.map((d) => d.id).sort());
  });

  it("the right answer moves around between plays", () => {
    const positions = new Set(SEEDS.map((s) => ALL_LEVELS[0].make(Vary.seeded(s)).pickEq!.correct));
    expect(positions.size).toBeGreaterThan(2);
  });

  it("across all levels, the right answer isn't always in the same slot (textbook version)", () => {
    const counts = [0, 0, 0, 0];
    for (const d of ALL_LEVELS) counts[d.make(Vary.fixed()).pickEq!.correct]++;
    expect(Math.max(...counts)).toBeLessThan(ALL_LEVELS.length * 0.6);
  });
});

describe("randomization", () => {
  it("different seeds give different numbers and option orders", () => {
    const def = ALL_LEVELS[0];
    const hooks = new Set(SEEDS.map((s) => def.make(Vary.seeded(s)).hook));
    expect(hooks.size).toBeGreaterThan(5);
    const firstOptions = new Set(SEEDS.map((s) => def.make(Vary.seeded(s)).predict.options[0]));
    expect(firstOptions.size).toBeGreaterThan(1);
  });

  it("stays within ±20% of the textbook value", () => {
    for (let s = 1; s < 500; s++) {
      const x = Vary.seeded(s).num(50, 3);
      expect(x).toBeGreaterThanOrEqual(40);
      expect(x).toBeLessThanOrEqual(60);
    }
  });

  it("the textbook version is unchanged and unshuffled", () => {
    const v = Vary.fixed();
    expect(v.num(20)).toBe(20);
    const q = { prompt: "", options: ["a", "b", "c"], correct: 1, why: "" };
    expect(v.shuffle(q)).toEqual(q);
  });
});
