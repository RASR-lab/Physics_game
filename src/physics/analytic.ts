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

/* ---------------- Ch 10 · Rotational kinematics ---------------- */

/** ω² = ω0² + 2αΔθ  →  Δθ = ω0² / (2α) for spinning down to rest (rad). */
export const spinDownAngle = (w0: number, alpha: number) => (w0 * w0) / (2 * alpha);

/** Tangential speed of a point at radius r: v_t = rω. */
export const tangentialSpeed = (r: number, w: number) => r * w;

/**
 * Rolling without slipping down a height h, starting from rest.
 * mgh = ½mv² + ½Iω², v = rω, I = c·m r²  →  v = √(2gh / (1 + c)).
 * c = ½ cylinder, 1 hoop, 2/5 sphere, 0 sliding block (no friction).
 */
export const rollingSpeed = (h: number, c: number, g = G) => Math.sqrt((2 * g * h) / (1 + c));

/* ---------------- Ch 11 · Rotational dynamics ---------------- */

/** τ = rF sin θ (θ between the lever arm and the force). */
export const torque = (r: number, F: number, angleDeg: number) => r * F * Math.sin(rad(angleDeg));

/** Seesaw balance: m1 r1 = m2 r2  →  r2 = m1 r1 / m2. */
export const balanceDistance = (m1: number, r1: number, m2: number) => (m1 * r1) / m2;

/** Angular momentum conservation: I0 ω0 = I ω  →  ω = I0 ω0 / I. */
export const spinAfter = (I0: number, w0: number, I: number) => (I0 * w0) / I;

/* ---------------- Ch 12 · Gravity ---------------- */

/** Newton's gravitational constant (N·m²/kg²), from the equation sheet. */
export const G_N = 6.67e-11;
export const R_EARTH = 6.371e6; // m
export const M_EARTH = 5.97e24; // kg
export const M_MOON = M_EARTH / 81.3; // kg
export const EARTH_MOON = 3.844e8; // m
/** GM for Earth, chosen so that g at the surface is exactly the game's 9.81 m/s². */
export const GM_EARTH = G * R_EARTH * R_EARTH;

/** a_g = GM / (R + h)². */
export const gAtAltitude = (h: number) => GM_EARTH / ((R_EARTH + h) * (R_EARTH + h));

/** Circular orbit: GMm/r² = mv²/r  →  v = √(GM/r). */
export const circularOrbitSpeed = (r: number, GM = GM_EARTH) => Math.sqrt(GM / r);

/** Point between two masses where the pulls cancel, measured from mass M: d = D / (1 + √(m/M)). */
export const neutralPoint = (M: number, m: number, D: number) => D / (1 + Math.sqrt(m / M));

/* ---------------- Ch 13 · Oscillations ---------------- */

/** Simple pendulum (small swings): T = 2π√(L/g). */
export const pendulumPeriod = (L: number, g = G) => 2 * Math.PI * Math.sqrt(L / g);

/** Mass on a spring: T = 2π√(m/k), f = 1/T. */
export const springPeriod = (m: number, k: number) => 2 * Math.PI * Math.sqrt(m / k);
export const springFrequency = (m: number, k: number) => 1 / springPeriod(m, k);
