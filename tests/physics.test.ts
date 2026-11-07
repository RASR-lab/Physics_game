import { describe, expect, it } from "vitest";
import { Body, DT, G, crossFraction, stepBodies } from "../src/physics/core";
import { gravity, spring } from "../src/physics/forces";
import { fallTime, projectileRange, stoppingDistance, springStretch, maxCurveSpeed, slideAngleDeg } from "../src/physics/analytic";
import { Vec2 } from "../src/physics/vec2";

/** Simulate a projectile on flat ground and return the interpolated landing x. */
function simulateRange(v: number, angle: number) {
  const b = new Body(1, Vec2.zero(), Vec2.fromPolar(v, angle));
  b.forces = [gravity()];
  let t = 0;
  for (;;) {
    const prev = b.pos;
    stepBodies([b], t, DT);
    t += DT;
    if (b.pos.y < 0 && t > DT) {
      const fr = crossFraction(prev.y, b.pos.y, 0);
      return prev.x + (b.pos.x - prev.x) * fr;
    }
  }
}

describe("Vec2", () => {
  it("builds components from polar form", () => {
    const v = Vec2.fromPolar(50, Math.atan2(40, 30) * (180 / Math.PI));
    expect(v.x).toBeCloseTo(30, 9);
    expect(v.y).toBeCloseTo(40, 9);
    expect(v.len()).toBeCloseTo(50, 9);
  });
});

describe("integrator vs. exact solutions", () => {
  it.each([
    [20, 45],
    [15, 30],
    [25, 60],
    [10, 15],
  ])("projectile range v=%d θ=%d° matches v²sin2θ/g within 0.5%%", (v, a) => {
    const sim = simulateRange(v, a);
    const exact = projectileRange(v, a);
    expect(Math.abs(sim - exact) / exact).toBeLessThan(0.005);
  });

  it("free-fall time matches √(2h/g) within 0.5%", () => {
    const h = 19.6;
    const b = new Body(7, new Vec2(0, h));
    b.forces = [gravity()];
    let t = 0;
    while (b.pos.y > 0) {
      stepBodies([b], t, DT);
      t += DT;
    }
    expect(Math.abs(t - fallTime(h)) / fallTime(h)).toBeLessThan(0.005);
  });

  it("free-fall acceleration does not depend on mass", () => {
    const heavy = new Body(7, new Vec2(0, 10));
    const light = new Body(0.06, new Vec2(0, 10));
    heavy.forces = [gravity()];
    light.forces = [gravity()];
    for (let i = 0; i < 240; i++) stepBodies([heavy, light], i * DT);
    expect(heavy.pos.y).toBeCloseTo(light.pos.y, 12);
  });

  it("spring oscillator conserves energy within 0.5% over 60 s (velocity Verlet)", () => {
    const k = 200,
      m = 3;
    const b = new Body(m, new Vec2(0.1, 0));
    b.forces = [spring(Vec2.zero(), k, 0)];
    const E = () => 0.5 * m * b.vel.dot(b.vel) + 0.5 * k * b.pos.dot(b.pos);
    const E0 = E();
    let maxDev = 0;
    for (let i = 0; i < 60 / DT; i++) {
      stepBodies([b], i * DT);
      maxDev = Math.max(maxDev, Math.abs(E() - E0) / E0);
    }
    expect(maxDev).toBeLessThan(0.005);
  });

  it("momentum is conserved when two bodies push on each other", () => {
    const a = new Body(50, Vec2.zero());
    const c = new Body(100, Vec2.zero());
    a.forces = [{ id: "p", label: "", color: "", compute: (_b, t) => (t < 0.5 ? new Vec2(-200, 0) : Vec2.zero()) }];
    c.forces = [{ id: "p", label: "", color: "", compute: (_b, t) => (t < 0.5 ? new Vec2(200, 0) : Vec2.zero()) }];
    for (let i = 0; i < 480; i++) stepBodies([a, c], i * DT);
    expect(a.mass * a.vel.x + c.mass * c.vel.x).toBeCloseTo(0, 9);
  });
});

describe("analytic helpers (equation sheet values)", () => {
  it("stopping distance", () => expect(stoppingDistance(20, 5)).toBeCloseTo(40));
  it("spring stretch", () => expect(springStretch(3, 200)).toBeCloseTo((3 * G) / 200));
  it("max curve speed", () => expect(maxCurveSpeed(0.6, 50)).toBeCloseTo(17.155, 2));
  it("slide angle", () => expect(slideAngleDeg(0.45)).toBeCloseTo(24.23, 1));
});
