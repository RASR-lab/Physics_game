import { Vec2 } from "./vec2";

/** Standard gravity used everywhere in the game, matching the equation sheet (g = 9.81 m/s²). */
export const G = 9.81;

/** Fixed physics timestep (s). Physics always runs at 240 Hz, independent of frame rate. */
export const DT = 1 / 240;

/**
 * A force acting on a body. Each force knows how to compute itself and how it should be
 * drawn (label + color), so free-body diagrams are generated automatically.
 */
export interface Force {
  id: string;
  /** Short label drawn next to the arrow, e.g. "F_g". Never rely on color alone. */
  label: string;
  color: string;
  compute(body: Body, t: number): Vec2;
}

export interface ForceValue {
  force: Force;
  value: Vec2;
}

export class Body {
  forces: Force[] = [];
  /** Forces evaluated during the most recent step (for drawing arrows). */
  lastForces: ForceValue[] = [];
  acc: Vec2 = Vec2.zero();
  /** When true, the integrator skips this body (it has landed, docked, etc.). */
  frozen = false;

  constructor(
    public mass: number, // kg
    public pos: Vec2, // m
    public vel: Vec2 = Vec2.zero(), // m/s
  ) {}

  netForce(): Vec2 {
    return this.lastForces.reduce((s, f) => s.add(f.value), Vec2.zero());
  }
}

function evaluate(b: Body, t: number) {
  b.lastForces = b.forces.map((f) => ({ force: f, value: f.compute(b, t) }));
  b.acc = b.netForce().scale(1 / b.mass); // Newton's 2nd law: a = ΣF / m
}

/**
 * Advance bodies by one timestep using velocity Verlet:
 *   x ← x + v·dt + ½·a·dt²
 *   a' = ΣF(x', t+dt) / m
 *   v ← v + ½·(a + a')·dt
 * Exact for constant forces (so projectiles match the textbook equations), and
 * symplectic, so springs and orbits don't gain or lose energy over time.
 * Velocity-dependent forces (drag, friction direction) are evaluated with a predicted v.
 */
export function stepBodies(bodies: Body[], t: number, dt = DT): void {
  for (const b of bodies) {
    if (b.frozen) continue;
    if (b.lastForces.length !== b.forces.length) evaluate(b, t);
    const a0 = b.acc;
    const v0 = b.vel;
    b.pos = b.pos.add(v0.scale(dt)).add(a0.scale(0.5 * dt * dt));
    b.vel = v0.add(a0.scale(dt)); // predicted velocity for velocity-dependent forces
    evaluate(b, t + dt);
    b.vel = v0.add(a0.add(b.acc).scale(0.5 * dt));
  }
}

/**
 * Accumulator that turns variable real frame time into a whole number of fixed physics steps.
 * Deterministic: the same inputs always give the same outcome.
 */
export class FixedStepper {
  private acc = 0;
  /** Returns how many fixed steps to run for this frame. */
  advance(realDt: number, speed = 1): number {
    this.acc += Math.min(realDt, 0.1) * speed;
    const n = Math.floor(this.acc / DT);
    this.acc -= n * DT;
    return n;
  }
  reset() {
    this.acc = 0;
  }
}

/** Linear interpolation helper used for exact crossing times (landing, finish lines). */
export function crossFraction(a: number, b: number, target: number): number {
  if (a === b) return 0;
  return (target - a) / (b - a);
}
