import type { ControlDef, Level, LevelDef, MCQ } from "./types";
import { DEFAULT_EQ_PROMPT, PICK_EQUATION } from "./equations";
import { Vec2 } from "../physics/vec2";

/** Format a number with fixed decimals (and a real minus sign for display). */
export const f = (v: number, d = 1) => {
  const s = (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
  return s.replace("-", "−");
};
/** Number for KaTeX (plain hyphen minus is fine there). */
export const n = (v: number, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);

/** Records positions at a fixed time interval (for "ghost" strobe snapshots). */
export class Strobe {
  pts: Vec2[] = [];
  private next = 0;
  constructor(private every: number) {}
  record(t: number, p: Vec2) {
    if (t + 1e-9 >= this.next) {
      this.pts.push(p);
      this.next += this.every;
    }
  }
}

/** Deterministic pseudo-random numbers (stars, decorations). */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/* Randomized problems                                                 */
/* ------------------------------------------------------------------ */

/** Round to `dec` decimals (negative dec rounds to tens, hundreds…), without float noise. */
export function roundTo(x: number, dec: number): number {
  const p = 10 ** dec;
  const r = Math.round(x * p) / p;
  return Number(r.toFixed(Math.max(0, dec)));
}

/**
 * Supplies the numbers for one play-through of a level.
 * Vary.fixed() returns the textbook numbers unchanged (used by tutorials);
 * a seeded Vary moves each number by up to ±20% and shuffles answer options.
 */
export class Vary {
  private constructor(private rnd: (() => number) | null) {}
  static fixed() {
    return new Vary(null);
  }
  static seeded(seed: number) {
    const r = seeded(Math.max(1, Math.floor(seed) % 2147483646));
    r(); // discard the first value (it is strongly tied to the seed)
    return new Vary(r);
  }
  static random() {
    return Vary.seeded(1 + Math.floor(Math.random() * 2147483000));
  }
  get isFixed() {
    return this.rnd === null;
  }
  /** base × (1 ± spread), rounded to `dec` decimals. Default spread is 20%. */
  num(base: number, dec = 0, spread = 0.2): number {
    if (!this.rnd) return base;
    return roundTo(base * (1 + spread * (2 * this.rnd() - 1)), dec);
  }
  /** base × (1 ± spread), rounded to the nearest multiple of `step`. */
  step(base: number, step: number, spread = 0.2): number {
    if (!this.rnd) return base;
    const x = base * (1 + spread * (2 * this.rnd() - 1));
    const dec = Math.max(0, Math.ceil(-Math.log10(step)) + 1);
    return roundTo(Math.round(x / step) * step, dec);
  }
  /** Shuffle a multiple-choice question's options, keeping track of the right answer. */
  shuffle(q: MCQ, always = false): MCQ {
    if (!this.rnd && !always) return q;
    // the textbook version shuffles with a fixed seed, so it is the same every time
    const rnd = this.rnd ?? seeded(q.options.join("").length * 7919 + 13);
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return { ...q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.correct) };
  }
}

/** Snap a value onto a slider's grid (and range). mode: nearest, or the grid point at/below/above. */
export function snap(c: Pick<ControlDef, "min" | "max" | "step">, v: number, mode: "near" | "down" | "up" = "near"): number {
  const k = (v - c.min) / c.step;
  const i = mode === "down" ? Math.floor(k + 1e-9) : mode === "up" ? Math.ceil(k - 1e-9) : Math.round(k);
  const x = Math.min(c.max, Math.max(c.min, c.min + i * c.step));
  return roundTo(x, 6);
}

/** The slider grid value that makes err(x) smallest (for answers that have no neat inverse). */
export function bestOnGrid(c: Pick<ControlDef, "min" | "max" | "step">, err: (x: number) => number): number {
  let best = c.min,
    bestE = Infinity;
  const n = Math.round((c.max - c.min) / c.step);
  for (let i = 0; i <= n; i++) {
    const x = roundTo(c.min + i * c.step, 6);
    const e = Math.abs(err(x));
    if (e < bestE) (bestE = e), (best = x);
  }
  return best;
}

/**
 * Wrap a level recipe. build(v) is called for every play with fresh numbers; the answer options
 * are then shuffled. The id, title and journal entry are read from the textbook version.
 */
export function defineLevel(build: (v: Vary) => Level): LevelDef {
  const base = build(Vary.fixed());
  const pe = PICK_EQUATION[base.id];
  if (!pe) throw new Error(`Level ${base.id} has no "Pick the equation" entry in equations.ts`);
  const pickEq: MCQ = { prompt: pe.prompt ?? DEFAULT_EQ_PROMPT, options: [pe.correct, ...pe.distractors], correct: 0, why: pe.why };
  return {
    id: base.id,
    chapter: base.chapter,
    title: base.title,
    journal: base.journal,
    make(v: Vary): Level {
      const b = build(v);
      // the right equation is listed first in the data, so always shuffle (even the textbook version)
      return { ...b, predict: v.shuffle(b.predict), explain: v.shuffle(b.explain), pickEq: v.shuffle(pickEq, true) };
    },
  };
}
