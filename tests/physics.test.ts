import { describe, expect, it } from "vitest";
import { Body, DT, G, crossFraction, stepBodies } from "../src/physics/core";
import { gravity, spring } from "../src/physics/forces";
import { fallTime, projectileRange, stoppingDistance, springStretch, maxCurveSpeed, slideAngleDeg } from "../src/physics/analytic";
import { Vec2 } from "../src/physics/vec2";
import {
  balanceDistance,
  circularOrbitSpeed,
  EARTH_MOON,
  G_N,
  GM_EARTH,
  gAtAltitude,
  M_EARTH,
  M_MOON,
  neutralPoint,
  pendulumPeriod,
  R_EARTH,
  rollingSpeed,
  spinAfter,
  spinDownAngle,
  springFrequency,
  springPeriod,
  torque,
} from "../src/physics/analytic";

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

/* ---------------- Ch 10–13 ---------------- */

describe("rotation, gravity & oscillation helpers (equation sheet values)", () => {
  it("spin-down angle ω0²/2α", () => expect(spinDownAngle(6, 6 / Math.PI) / (2 * Math.PI)).toBeCloseTo(1.5, 9));
  it("rolling cylinder v = √(4gh/3)", () => expect(rollingSpeed(1.2232, 0.5)).toBeCloseTo(4, 2));
  it("a hoop rolls slower than a cylinder, which rolls slower than a sphere", () => {
    expect(rollingSpeed(1, 1)).toBeLessThan(rollingSpeed(1, 0.5));
    expect(rollingSpeed(1, 0.5)).toBeLessThan(rollingSpeed(1, 0.4));
  });
  it("torque rF sin θ", () => {
    expect(torque(0.35, 200, 90)).toBeCloseTo(70);
    expect(torque(0.35, 200, 0)).toBeCloseTo(0);
  });
  it("seesaw balance", () => expect(balanceDistance(30, 2, 75)).toBeCloseTo(0.8));
  it("skater: I0ω0 = Iω", () => expect(spinAfter(4, 2, 4 / 3)).toBeCloseTo(6));
  it("GM_E from the game's g agrees with G·M_E from the sheet within 0.1%", () =>
    expect(Math.abs(GM_EARTH - G_N * M_EARTH) / GM_EARTH).toBeLessThan(0.001));
  it("half gravity at h = (√2 − 1)R", () => expect(gAtAltitude((Math.SQRT2 - 1) * R_EARTH)).toBeCloseTo(9.81 / 2, 9));
  it("ISS-height gravity is about 89% of the ground value", () => expect(gAtAltitude(400e3) / 9.81).toBeCloseTo(0.887, 2));
  it("circular orbit speed at 400 km ≈ 7.67 km/s", () => expect(circularOrbitSpeed(R_EARTH + 400e3)).toBeCloseTo(7669, -1));
  it("Earth–Moon neutral point ≈ 90% of the way", () => expect(neutralPoint(M_EARTH, M_MOON, EARTH_MOON) / EARTH_MOON).toBeCloseTo(0.9, 2));
  it("seconds pendulum is ≈ 0.994 m", () => expect(pendulumPeriod(0.994)).toBeCloseTo(2, 2));
  it("spring period & frequency", () => {
    expect(springPeriod(0.5, 13.7)).toBeCloseTo(1.2, 2);
    expect(springFrequency(400, 35500)).toBeCloseTo(1.5, 2);
  });
});

describe("integrator vs. exact solutions (Ch 12–13)", () => {
  it("a circular orbit keeps its radius within 0.1% and its energy within 0.01% for one period", () => {
    const r0 = R_EARTH + 400e3;
    const v0 = circularOrbitSpeed(r0);
    const sat = new Body(1000, new Vec2(r0, 0), new Vec2(0, v0));
    sat.forces = [{ id: "g", label: "", color: "", compute: (b) => b.pos.norm().scale((-GM_EARTH * b.mass) / b.pos.dot(b.pos)) }];
    const E = () => 0.5 * sat.vel.dot(sat.vel) - GM_EARTH / sat.pos.len();
    const E0 = E();
    const period = (2 * Math.PI * r0) / v0;
    const dt = 2.5; // the in-game orbit step (600× time-lapse at 240 Hz)
    let maxDr = 0;
    for (let t = 0; t < period; t += dt) {
      stepBodies([sat], t, dt);
      maxDr = Math.max(maxDr, Math.abs(sat.pos.len() - r0) / r0);
    }
    expect(maxDr).toBeLessThan(0.001);
    expect(Math.abs((E() - E0) / E0)).toBeLessThan(1e-4);
  });

  it("a mass on a spring oscillates with T = 2π√(m/k) within 0.1%", () => {
    const m = 0.5,
      k = 13.7;
    const b = new Body(m, new Vec2(0.15, 0));
    b.forces = [spring(Vec2.zero(), k, 0)];
    // average period from 4 downward crossings of x = 0 (interpolated inside a step)
    const crossings: number[] = [];
    let t = 0;
    let prev = b.pos.x;
    while (crossings.length < 4) {
      stepBodies([b], t, DT);
      t += DT;
      if (prev > 0 && b.pos.x <= 0) crossings.push(t - DT + DT * crossFraction(prev, b.pos.x, 0));
      prev = b.pos.x;
    }
    const T = (crossings[3] - crossings[0]) / 3;
    expect(Math.abs(T - springPeriod(m, k)) / springPeriod(m, k)).toBeLessThan(0.001);
  });
});
