import { Body, Force, G } from "./core";
import { Vec2 } from "./vec2";

/**
 * Colorblind-safe palette (Okabe–Ito). The same quantity always has the same color
 * across the whole game, and every arrow also carries a text label.
 */
export const COLORS = {
  gravity: "#0072B2", // blue
  normal: "#009E73", // green
  friction: "#E69F00", // orange
  applied: "#CC79A7", // reddish purple
  spring: "#7B4FA0", // violet
  velocity: "#D55E00", // vermillion
  acceleration: "#56B4E9", // sky blue
  current: "#3B8EA5", // teal (water current)
  ink: "#1d2433",
};

export function gravity(g = G): Force {
  return {
    id: "gravity",
    label: "F_g",
    color: COLORS.gravity,
    compute: (b: Body) => new Vec2(0, -b.mass * g),
  };
}

/** A constant applied force that can be switched on for a time window [t0, t1). */
export function applied(F: Vec2, t0 = 0, t1 = Infinity, label = "F_app"): Force {
  return {
    id: "applied",
    label,
    color: COLORS.applied,
    compute: (_b, t) => (t >= t0 && t < t1 ? F : Vec2.zero()),
  };
}

/** Hooke's law spring attached to a fixed anchor: F = −k (L − L0) along the spring. */
export function spring(anchor: Vec2, k: number, restLength: number): Force {
  return {
    id: "spring",
    label: "F_s",
    color: COLORS.spring,
    compute: (b) => {
      const d = b.pos.sub(anchor);
      const L = d.len();
      if (L === 0) return Vec2.zero();
      return d.norm().scale(-k * (L - restLength));
    },
  };
}

/** Linear damping F = −b·v (a gentle stand-in for air resistance). */
export function damping(bCoef: number): Force {
  return {
    id: "damping",
    label: "F_air",
    color: COLORS.friction,
    compute: (b) => b.vel.scale(-bCoef),
  };
}
