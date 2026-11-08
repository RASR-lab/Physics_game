import { Body, G, crossFraction, stepBodies } from "../physics/core";
import { COLORS, gravity, spring } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Level, Sim } from "./types";
import type { Renderer } from "../render/renderer";
import { f, n } from "./util";

const TAU = 2 * Math.PI;

/**
 * Measures the period of an oscillation from the times it crosses its center going the same way.
 * Crossing times are interpolated inside a step, so the measurement is much finer than one step.
 */
class PeriodMeter {
  crossings: number[] = [];
  private prev: number | null = null;
  /** Call once per step with the time and displacement from the center. */
  sample(t: number, dt: number, x: number) {
    if (this.prev !== null && this.prev > 0 && x <= 0) this.crossings.push(t - dt + dt * crossFraction(this.prev, x, 0));
    this.prev = x;
  }
  /** Average period from the downward crossings recorded so far (NaN until two exist). */
  period(): number {
    const c = this.crossings;
    return c.length < 2 ? NaN : (c[c.length - 1] - c[0]) / (c.length - 1);
  }
  cycles() {
    return Math.max(0, this.crossings.length - 1);
  }
}

function zigzag(r: Renderer, a: Vec2, b: Vec2, coils = 12, width = 0.05, color = COLORS.spring) {
  const d = b.sub(a);
  const u = d.norm();
  const w = u.perp();
  const pts: Vec2[] = [a];
  for (let i = 1; i < coils * 2; i++) pts.push(a.add(d.scale(i / (coils * 2))).add(w.scale(i % 2 ? width : -width)));
  pts.push(b);
  r.path(pts, color, 2.5);
}

/* ------------------------------------------------------------------ */
/* 13-1  Grandfather Clock   (T = 2π√(L/g))                             */
/* ------------------------------------------------------------------ */
const CLOCK_T = 2;
const SWING_DEG = 8;

const grandfatherClock: Level = {
  id: "13-1",
  chapter: 13,
  title: "Grandfather Clock",
  hook: "A grandfather clock ticks once per swing, so a full back-and-forth must take exactly 2.00 s. Cut the pendulum rod to the right length.",
  goal: "Period 2.00 s (±0.01).",
  controls: [
    { key: "L", label: "Pendulum length L", min: 0.2, max: 2, step: 0.01, value: 1.5, unit: "m" },
    { key: "mass", label: "Bob mass", min: 0.5, max: 10, step: 0.5, value: 2, unit: "kg" },
  ],
  predict: {
    prompt: "You swap the brass bob for one 4 times heavier. The clock now runs…",
    options: ["Faster (heavier swings faster)", "Slower (heavier is sluggish)", "Exactly the same"],
    correct: 2,
    why: "T = 2π√(L/g) has no mass in it. A heavier bob feels more gravity but is also harder to speed up, and the two effects cancel, just like in free fall.",
  },
  explain: {
    prompt: "To make the period twice as long, how much longer must the pendulum be?",
    options: ["Twice as long", "Four times as long", "√2 times as long", "Half as long"],
    correct: 1,
    why: "T ∝ √L, so to double T you need 2² = 4 times the length.",
  },
  hints: [
    "Longer pendulum → slower swing.",
    "T = 2π√(L/g) → L = g(T/2π)².",
    "L = 9.81 × (2 ÷ 2π)² ≈ 0.99 m.",
  ],
  journal: {
    title: "Pendulum",
    tex: String.raw`T = 2\pi\sqrt{\frac{L}{g}},\qquad f = \frac{1}{T}`,
    note: "Period depends on length, not mass.",
  },
  view: { xMin: -1.1, xMax: 1.1, yMin: -2.25, yMax: 0.25 },
  graph: {
    title: "Swing angle vs. time",
    yLabel: "angle (°)",
    tMax: 8,
    yMin: -10,
    yMax: 10,
    series: [{ label: "your pendulum", color: COLORS.applied }],
    target: (t) => SWING_DEG * Math.cos((TAU * t) / CLOCK_T),
    targetLabel: "perfect 2 s clock",
  },
  solution: { L: 0.99, mass: 2 },
  wrong: { L: 0.5, mass: 2 },
  create(p) {
    const L = p.L;
    const m = p.mass;
    let th = rad(SWING_DEG);
    let w = 0;
    const acc = (a: number) => -(G / L) * Math.sin(a); // exact pendulum, not just small-angle
    const meter = new PeriodMeter();
    let done = false;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        // velocity Verlet on the angle
        const a0 = acc(th);
        th += w * dt + 0.5 * a0 * dt * dt;
        w += 0.5 * (a0 + acc(th)) * dt;
        sim.t += dt;
        meter.sample(sim.t, dt, th);
        if (meter.cycles() >= 3 || sim.t > 14) done = true;
      },
      isDone: () => done,
      outcome() {
        const T = meter.period();
        if (Math.abs(T - CLOCK_T) <= 0.01) return { success: true, message: `Period ${f(T, 3)} s. Tick… tock… right on time!` };
        const perDay = ((T - CLOCK_T) / CLOCK_T) * 86400;
        return {
          success: false,
          message: `Period ${f(T, 3)} s. The clock ${perDay > 0 ? "loses" : "gains"} ${f(Math.abs(perDay) / 60, 0)} min a day. ${T > CLOCK_T ? "Shorten" : "Lengthen"} the rod.`,
        };
      },
      draw(r, ov) {
        r.clear("#fef3c7", "#fffbeb");
        // clock case
        r.rect(-1.0, -2.2, 2.0, 2.4, "#7c2d12", COLORS.ink, 8);
        r.rect(-0.9, -2.1, 1.8, 2.2, "#fde68a");
        r.rect(-0.2, 0, 0.4, 0.12, "#57534e");
        // target length mark
        r.line(-0.85, -0.994, -0.65, -0.994, "#9ca3af", 1.5, [3, 3]);
        r.vruler(-2, 0, 0.82, 0.5);
        const bob = new Vec2(L * Math.sin(th), -L * Math.cos(th));
        r.line(0, 0, bob.x, bob.y, "#57534e", 3);
        const br = 0.06 + 0.012 * m;
        r.circle(bob.x, bob.y, br, "#d97706", "#78350f");
        r.text(`${p.mass} kg`, bob.x, bob.y - br - 0.07, { size: 10, bold: true });
        if (ov.trail) {
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), L * r.scale, Math.PI / 2 - rad(SWING_DEG), Math.PI / 2 + rad(SWING_DEG));
          ctx.strokeStyle = "rgba(204,121,167,.6)";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (ov.velocity) r.arrow(bob, new Vec2(Math.cos(th), Math.sin(th)).scale(w * L), 120, COLORS.velocity, "v");
        if (ov.forces) {
          r.arrow(bob, new Vec2(0, -m * G), 4 / m, COLORS.gravity, "mg");
          const T = m * G * Math.cos(th) + m * w * w * L;
          r.arrow(bob, new Vec2(-Math.sin(th), Math.cos(th)).scale(T), 4 / m, COLORS.normal, "T");
        }
        const T = meter.period();
        r.hud([`t = ${f(sim.t, 2)} s`, Number.isNaN(T) ? "measuring period…" : `period = ${f(T, 3)} s`]);
      },
      readouts: () => {
        const T = meter.period();
        return [
          { label: "Length L", value: `${f(L, 2)} m` },
          { label: "Measured period", value: Number.isNaN(T) ? "—" : `${f(T, 3)} s` },
          { label: "Formula 2π√(L/g)", value: `${f(TAU * Math.sqrt(L / G), 3)} s` },
          { label: "Swing angle", value: `${f((th * 180) / Math.PI, 1)}°` },
        ];
      },
      equation: () => String.raw`T = 2\pi\sqrt{\frac{L}{g}} = 2\pi\sqrt{\frac{${n(L, 2)}}{9.81}} = ${n(TAU * Math.sqrt(L / G), 3)}\text{ s}`,
      sample: () => [(th * 180) / Math.PI],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 13-2  Smooth Ride   (f = (1/2π)√(k/m))                               */
/* ------------------------------------------------------------------ */
const CAR_CORNER = 400; // kg resting on one spring
const TARGET_F = 1.5; // Hz, a comfortable bounce
const BUMP = 0.05; // m

const smoothRide: Level = {
  id: "13-2",
  chapter: 13,
  title: "Smooth Ride",
  hook: "Each corner of a car puts 400 kg on one spring. Engineers want a comfy bounce of 1.5 Hz. (Shock absorbers off for this test.)",
  goal: "Bounce at 1.50 Hz (±0.02).",
  controls: [{ key: "k", label: "Spring stiffness k", min: 5, max: 80, step: 0.5, value: 10, unit: "kN/m" }],
  predict: {
    prompt: "Four friends climb into the car (more mass on each spring). The bounce becomes…",
    options: ["Faster (higher frequency)", "Slower (lower frequency)", "Exactly the same"],
    correct: 1,
    why: "f = (1/2π)√(k/m). More mass on the same spring makes the frequency lower: a loaded car wallows more slowly.",
  },
  explain: {
    prompt: "Why does a stiffer spring bounce faster?",
    options: [
      "A stiffer spring pushes back harder for the same stretch, so it accelerates the car back to center sooner",
      "A stiffer spring is lighter",
      "Stiffer springs make bigger bounces",
    ],
    correct: 0,
    why: "Bigger k means a bigger restoring force (F = −kx) and a bigger acceleration (a = −kx/m) at every point, so each cycle is quicker: ω = √(k/m).",
  },
  hints: [
    "Stiffer spring → faster bounce.",
    "f = (1/2π)√(k/m) → k = m(2πf)².",
    "k = 400 × (2π × 1.5)² ≈ 35,500 N/m = 35.5 kN/m.",
  ],
  journal: {
    title: "Mass on a spring",
    tex: String.raw`T = 2\pi\sqrt{\frac{m}{k}},\qquad f = \frac{1}{2\pi}\sqrt{\frac{k}{m}}`,
    note: "Stiffer → faster; heavier → slower.",
  },
  view: { xMin: -1.5, xMax: 1.5, yMin: -0.2, yMax: 2.0, anchor: "bottom" },
  graph: { title: "Bounce vs. time", yLabel: "height (cm)", tMax: 4, yMin: -6, yMax: 6, series: [{ label: "car body", color: COLORS.spring }], target: (t) => -BUMP * 100 * Math.cos(TAU * TARGET_F * t), targetLabel: "1.5 Hz target" },
  solution: { k: 35.5 },
  wrong: { k: 20 },
  create(p) {
    const k = p.k * 1000;
    const REST = 1.0; // spring length when relaxed (m)
    const anchor = new Vec2(0, 0.25); // top of the wheel / axle
    const eq = anchor.y + REST - (CAR_CORNER * G) / k; // where spring force = weight
    const body = new Body(CAR_CORNER, new Vec2(0, eq - BUMP));
    body.forces = [gravity(), spring(anchor, k, REST)];
    const meter = new PeriodMeter();
    let done = false;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        stepBodies([body], sim.t, dt);
        sim.t += dt;
        meter.sample(sim.t, dt, body.pos.y - eq);
        if (meter.cycles() >= 2 || sim.t > 10) done = true;
      },
      isDone: () => done,
      outcome() {
        const fr = 1 / meter.period();
        if (Math.abs(fr - TARGET_F) <= 0.02) return { success: true, message: `Bouncing at ${f(fr, 3)} Hz. Smooth ride!` };
        return { success: false, message: `Bouncing at ${f(fr, 3)} Hz. ${fr < TARGET_F ? "Too floaty: stiffer spring." : "Too jittery: softer spring."}` };
      },
      draw(r, ov) {
        r.clear("#e0f2fe", "#f8fafc");
        r.rect(-3, -0.2, 6, 0.2, "#6b7280");
        // wheel
        r.circle(0, 0.25, 0.25, "#1f2937", "#111");
        r.circle(0, 0.25, 0.1, "#9ca3af");
        const top = new Vec2(0, body.pos.y);
        r.line(0, 0.25, 0, Math.min(0.55, body.pos.y), "#475569", 6); // strut from the axle
        zigzag(r, new Vec2(0, Math.min(0.55, body.pos.y)), top, 7, 0.14);
        // equilibrium line
        r.line(-1.3, eq + 0.12, 1.3, eq + 0.12, "#9ca3af", 1, [5, 4]);
        r.text("rest", 1.25, eq + 0.17, { size: 10, color: "#6b7280", align: "right" });
        // car body (one corner)
        r.rect(-1.2, body.pos.y, 2.4, 0.3, "#e4572e", COLORS.ink, 6);
        r.rect(-0.7, body.pos.y + 0.3, 1.2, 0.3, "#e4572e", COLORS.ink, 6);
        r.rect(-0.6, body.pos.y + 0.36, 0.45, 0.2, "#cfe8ff");
        r.rect(-0.05, body.pos.y + 0.36, 0.45, 0.2, "#cfe8ff");
        r.text("400 kg", 0, body.pos.y + 0.15, { size: 11, bold: true, color: "#fff" });
        const c = new Vec2(0.9, body.pos.y + 0.15);
        if (ov.forces) {
          r.arrow(c, new Vec2(0, -CAR_CORNER * G), 0.012, COLORS.gravity, "mg");
          const fs = body.lastForces[1]?.value ?? new Vec2(0, CAR_CORNER * G);
          r.arrow(c.add(new Vec2(-1.8, 0)), fs, 0.012, COLORS.spring, "F_s");
        }
        if (ov.velocity) r.arrow(new Vec2(1.3, body.pos.y + 0.15), body.vel, 300, COLORS.velocity, "v");
        const T = meter.period();
        r.hud([`t = ${f(sim.t, 2)} s`, Number.isNaN(T) ? "measuring…" : `f = ${f(1 / T, 3)} Hz`]);
      },
      readouts: () => {
        const T = meter.period();
        return [
          { label: "Stiffness k", value: `${f(k, 0)} N/m` },
          { label: "Measured frequency", value: Number.isNaN(T) ? "—" : `${f(1 / T, 3)} Hz` },
          { label: "Formula (1/2π)√(k/m)", value: `${f(Math.sqrt(k / CAR_CORNER) / TAU, 3)} Hz` },
          { label: "Height from rest", value: `${f((body.pos.y - eq) * 100, 1)} cm` },
        ];
      },
      equation: () => String.raw`f = \frac{1}{2\pi}\sqrt{\frac{k}{m}} = \frac{1}{2\pi}\sqrt{\frac{${n(k, 0)}}{400}} = ${n(Math.sqrt(k / CAR_CORNER) / TAU, 3)}\text{ Hz}`,
      sample: () => [(body.pos.y - eq) * 100],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 13-3  Match the Wave   (x = A cos ωt, ω = √(k/m))                    */
/* ------------------------------------------------------------------ */
const WAVE_M = 0.5;
const WAVE_A = 0.15;
const WAVE_T = 1.2;
const WAVE_END = 3 * WAVE_T;
const target = (t: number) => WAVE_A * Math.cos((TAU * t) / WAVE_T);

const matchTheWave: Level = {
  id: "13-3",
  chapter: 13,
  title: "Match the Wave",
  hook: "A 0.5 kg glider on a spring draws its motion on the graph. Make it trace the dashed target: x = 0.15 cos(2πt / 1.2 s).",
  goal: "Stay within 1 cm of the target for 3 cycles.",
  controls: [
    { key: "A", label: "Pull-back distance A", min: 0.05, max: 0.3, step: 0.01, value: 0.1, unit: "m" },
    { key: "k", label: "Spring stiffness k", min: 2, max: 40, step: 0.1, value: 5, unit: "N/m" },
  ],
  predict: {
    prompt: "You pull the glider back twice as far before letting go. The time for one full cycle…",
    options: ["Doubles", "Halves", "Stays the same", "Quadruples"],
    correct: 2,
    why: "T = 2π√(m/k) has no amplitude in it. Pull farther and the spring pushes harder, so the glider goes faster and covers the longer path in the same time.",
  },
  explain: {
    prompt: "Which two settings control the two features of the wave?",
    options: [
      "The pull-back sets the amplitude (height); the stiffness sets the period (width of each wave)",
      "Both settings change the amplitude only",
      "The pull-back sets the period; the stiffness sets the amplitude",
    ],
    correct: 0,
    why: "x = A cos(ωt): A is however far you pulled it, and ω = 2π/T = √(k/m) is set by the spring and the mass.",
  },
  hints: [
    "Match the height first (A), then the width (k).",
    "A = 0.15 m. T = 2π√(m/k) → k = m(2π/T)².",
    "k = 0.5 × (2π ÷ 1.2)² ≈ 13.7 N/m.",
  ],
  journal: {
    title: "Simple harmonic motion",
    tex: String.raw`x = A\cos(\omega t),\quad v = -A\omega\sin(\omega t),\quad \omega = \frac{2\pi}{T} = \sqrt{\frac{k}{m}}`,
    note: "Amplitude doesn't change the period.",
  },
  view: { xMin: -0.55, xMax: 0.4, yMin: -0.12, yMax: 0.2, anchor: "bottom" },
  graph: { title: "Position vs. time", yLabel: "x (m)", tMax: WAVE_END, yMin: -0.3, yMax: 0.3, series: [{ label: "glider", color: COLORS.spring }], target, targetLabel: "target" },
  solution: { A: 0.15, k: 13.7 },
  wrong: { A: 0.15, k: 27.4 },
  create(p) {
    const k = p.k;
    const WALL = -0.5;
    // spring anchored at the wall; relaxed length puts the glider's center at x = 0
    const glider = new Body(WAVE_M, new Vec2(p.A, 0));
    glider.forces = [spring(new Vec2(WALL, 0), k, -WALL)];
    let worst = Math.abs(p.A - WAVE_A);
    const trail: Vec2[] = [];
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= WAVE_END) return;
        stepBodies([glider], sim.t, dt);
        sim.t += dt;
        worst = Math.max(worst, Math.abs(glider.pos.x - target(sim.t)));
        if (sim.t % (1 / 30) < dt) trail.push(new Vec2(glider.pos.x, 0.13 - sim.t * 0.012));
      },
      isDone: () => sim.t >= WAVE_END - 1e-9,
      outcome() {
        if (worst <= 0.01) return { success: true, message: `Matched! Never more than ${f(worst * 100, 1)} cm off.` };
        const T = TAU * Math.sqrt(WAVE_M / k);
        const tips: string[] = [];
        if (Math.abs(p.A - WAVE_A) > 0.005) tips.push(p.A > WAVE_A ? "smaller pull" : "bigger pull");
        if (Math.abs(T - WAVE_T) > 0.004) tips.push(T > WAVE_T ? "stiffer spring" : "softer spring");
        return { success: false, message: `Off by up to ${f(worst * 100, 1)} cm. Try a ${tips.join(" and a ") || "small tweak"}.` };
      },
      draw(r, ov) {
        r.clear("#f1f5f9", "#f8fafc");
        r.rect(-0.6, -0.1, 1.1, 0.06, "#94a3b8");
        r.rect(-0.53, -0.1, 0.03, 0.22, "#475569");
        // target zone and center
        r.line(0, -0.04, 0, 0.12, "#9ca3af", 1, [3, 3]);
        r.line(WAVE_A, -0.04, WAVE_A, 0.12, "#e63946", 1.5, [5, 3]);
        r.line(-WAVE_A, -0.04, -WAVE_A, 0.12, "#e63946", 1.5, [5, 3]);
        r.text("±0.15 m", WAVE_A, 0.15, { size: 10, color: "#b91c1c", bold: true });
        const gx = glider.pos.x;
        zigzag(r, new Vec2(-0.5, 0), new Vec2(gx - 0.04, 0), 12, 0.02);
        r.rect(gx - 0.04, -0.04, 0.08, 0.07, "#7B4FA0", COLORS.ink, 4);
        // ghost of the target position
        r.rect(target(sim.t) - 0.04, -0.04, 0.08, 0.07, "rgba(230,57,70,.18)", "rgba(230,57,70,.6)", 4);
        if (ov.trail) r.path(trail, "rgba(123,79,160,.45)", 2);
        if (ov.forces) r.arrow(new Vec2(gx, 0.06), glider.lastForces[0]?.value ?? new Vec2(-k * gx, 0), 60, COLORS.spring, "−kx");
        if (ov.velocity) r.arrow(new Vec2(gx, -0.02), glider.vel, 120, COLORS.velocity, "v");
        r.hud([`t = ${f(sim.t, 2)} s   x = ${f(gx, 3)} m`, `worst gap so far: ${f(worst * 100, 1)} cm`]);
      },
      readouts: () => [
        { label: "Position x", value: `${f(glider.pos.x, 3)} m` },
        { label: "Target x", value: `${f(target(sim.t), 3)} m` },
        { label: "Your period 2π√(m/k)", value: `${f(TAU * Math.sqrt(WAVE_M / k), 3)} s` },
        { label: "Velocity", value: `${f(glider.vel.x, 3)} m/s` },
      ],
      equation: () => String.raw`x = A\cos\!\left(\sqrt{\tfrac{k}{m}}\,t\right) = ${n(p.A, 2)}\cos\!\left(${n(Math.sqrt(k / WAVE_M), 3)}\cdot ${n(sim.t, 2)}\right)`,
      sample: () => [glider.pos.x],
    };
    return sim;
  },
};

export const chapter13 = [grandfatherClock, smoothRide, matchTheWave];
