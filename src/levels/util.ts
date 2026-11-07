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
