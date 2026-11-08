/** Small shared helpers for the illustrated art style. Cosmetic only. */
import type { Renderer } from "../renderer";

export const reduceMotion =
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Seconds since page load; use for purely decorative motion (clouds, twinkles, ripples). */
export const clock = () => (typeof performance !== "undefined" ? performance.now() / 1000 : 0);

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  if ((c as any).roundRect) (c as any).roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
}

/** Run `fn` with the canvas in world meters (y up). `px` = one screen pixel in meters. */
export function inWorld(r: Renderer, fn: (c: CanvasRenderingContext2D, px: number) => void) {
  const c = r.ctx;
  c.save();
  c.translate(r.sx(0), r.sy(0));
  c.scale(r.scale, -r.scale);
  fn(c, 1 / r.scale);
  c.restore();
}

const HEX = /^#([0-9a-f]{6})$/i;
export const isHex = (s: string) => HEX.test(s);

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. Non-hex colours pass through. */
export function shade(hex: string, amt: number) {
  if (!isHex(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

export const smoothstep = (t: number) => {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
};

/** Cached noise texture, for asphalt, concrete, ice, grass, etc. */
const patterns = new Map<string, CanvasPattern>();
export function noisePattern(
  ctx: CanvasRenderingContext2D,
  base: string,
  opts: { size?: number; dots?: number; light?: number; dark?: number; seed?: number } = {},
) {
  const key = `${base}|${JSON.stringify(opts)}`;
  const hit = patterns.get(key);
  if (hit) return hit;
  const S = opts.size ?? 96;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  const rnd = mulberry32(opts.seed ?? 7);
  const n = opts.dots ?? 900;
  for (let i = 0; i < n; i++) {
    g.fillStyle =
      rnd() > 0.5
        ? `rgba(255,255,255,${(opts.light ?? 0.06) * (0.6 + rnd())})`
        : `rgba(0,0,0,${(opts.dark ?? 0.09) * (0.6 + rnd())})`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const p = ctx.createPattern(cv, "repeat")!;
  patterns.set(key, p);
  return p;
}

/** Fill a world-space rectangle with a cached pattern (pattern is screen-anchored). */
export function patternRect(r: Renderer, x: number, y: number, w: number, h: number, pat: CanvasPattern) {
  const c = r.ctx;
  c.fillStyle = pat;
  const X = r.sx(x),
    Y = r.sy(y + h);
  c.fillRect(X, Y, w * r.scale, h * r.scale);
}
