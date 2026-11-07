/**
 * Exact textbook solutions (from the PHYS 211 equation sheet). Used for prediction ghosts,
 * hints, and unit tests that keep the simulation honest.
 */
import { G } from "./core";
import { rad } from "./vec2";

/** v² = v0² + 2aΔx  →  Δx = v0² / (2a) for braking to rest. */
export const stoppingDistance = (v0: number, a: number) => (v0 * v0) / (2 * a);

/** Δy = ½ g t²  →  t = √(2h/g). */
export const fallTime = (h: number, g = G) => Math.sqrt((2 * h) / g);
export const fallHeight = (t: number, g = G) => 0.5 * g * t * t;

/** Range on level ground: R = v² sin(2θ) / g. */
export const projectileRange = (v: number, angleDeg: number, g = G) =>
  (v * v * Math.sin(2 * rad(angleDeg))) / g;
export const timeOfFlight = (v: number, angleDeg: number, g = G) =>
  (2 * v * Math.sin(rad(angleDeg))) / g;
export const maxHeight = (v: number, angleDeg: number, g = G) => {
  const vy = v * Math.sin(rad(angleDeg));
  return (vy * vy) / (2 * g);
};

/** Vector components (angle measured from the +x axis). */
export const components = (mag: number, angleDeg: number) => ({
  x: mag * Math.cos(rad(angleDeg)),
  y: mag * Math.sin(rad(angleDeg)),
});

/** Angle where a block just starts to slide: tan θ = μs. */
export const slideAngleDeg = (muS: number) => (Math.atan(muS) * 180) / Math.PI;

/** Hanging mass at rest on a spring: kΔx = mg. */
export const springStretch = (m: number, k: number, g = G) => (m * g) / k;

/** Flat curve: f_s,max = μs m g = m v²/r  →  v_max = √(μs g r). */
export const maxCurveSpeed = (muS: number, r: number, g = G) => Math.sqrt(muS * g * r);

/** Apparent weight in an elevator accelerating upward at a: N = m(g + a). */
export const apparentWeight = (m: number, a: number, g = G) => m * (g + a);
