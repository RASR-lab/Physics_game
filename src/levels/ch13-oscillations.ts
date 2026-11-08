import { Body, G, crossFraction, stepBodies } from "../physics/core";
import { COLORS, gravity, spring } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Sim } from "./types";
import { ground, sky, skylineScreen, wall } from "../render/art/backdrops";
import { ball, coil, metalBar, tyre } from "../render/art/props";
import type { Renderer } from "../render/renderer";
import { bestOnGrid, defineLevel, f, n, snap } from "./util";

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
  void pts;
  coil(r, a, b, coils, width * 2, color);
}

/* ------------------------------------------------------------------ */
/* 13-1  Grandfather Clock   (T = 2π√(L/g))                             */
/* ------------------------------------------------------------------ */
const grandfatherClock = defineLevel((v) => {
  const CLOCK_T = v.num(2, 1); // s per full back-and-forth
  const SWING_DEG = 8;
  const lEx = G * (CLOCK_T / TAU) ** 2;
  const lc = { min: 0.2, max: 2, step: 0.01 };
  // an 8° swing runs ~0.12% slower than the small-angle formula; pick the grid length that really works
  const big = 1 + (SWING_DEG * Math.PI / 180) ** 2 / 16;
  return {
    id: "13-1",
    chapter: 13,
    title: "Grandfather Clock",
    hook: `A pendulum clock ticks twice per cycle, so a full back-and-forth must take exactly ${f(CLOCK_T, 2)} s. Cut the pendulum rod to the right length.`,
    goal: `Period ${f(CLOCK_T, 2)} s (±0.01).`,
    controls: [
      { key: "L", label: "Pendulum length L", ...lc, value: snap(lc, Math.min(2, lEx * 1.5 + 0.05)), unit: "m" },
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
      `L = 9.81 × (${f(CLOCK_T, 2)} ÷ 2π)² ≈ ${f(lEx, 3)} m.`,
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
      targetLabel: `perfect ${f(CLOCK_T, 2)} s clock`,
    },
    solution: { L: bestOnGrid(lc, (L) => TAU * Math.sqrt(L / G) * big - CLOCK_T), mass: 2 },
    wrong: { L: snap(lc, lEx / 2), mass: 2 }, // "half the length → half the period"
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
          wall(r, "#e7d7bd", "wallpaper");
          // clock case: dark walnut with a glass door
          r.rect(-1.0, -2.2, 2.0, 2.4, "#6b3a1f", "#3b1d0c", 8);
          r.rect(-0.9, -2.1, 1.8, 2.2, "#f3e3bd", "#8a5a33", 4);
          r.poly(
            [
              [-0.9, -0.6],
              [-0.9, -0.2],
              [-0.3, 0.1],
              [0.1, 0.1],
            ],
            "rgba(255,255,255,.35)",
          );
          r.rect(-0.2, 0, 0.4, 0.12, "#b7791f", "#78350f", 2);
          // target length mark
          r.line(-0.85, -lEx, -0.65, -lEx, "#9ca3af", 1.5, [3, 3]);
          r.vruler(-2, 0, 0.82, 0.5, "m", "#3f2a1a");
          const bob = new Vec2(L * Math.sin(th), -L * Math.cos(th));
          metalBar(r, new Vec2(0, 0), bob, 0.022, "#c8a24a");
          const br = 0.06 + 0.012 * m;
          ball(r, bob.x, bob.y, br, "#d6a23a", "brass");
          r.text(`${p.mass} kg`, bob.x, bob.y - br - 0.08, { size: 10, bold: true, bg: "rgba(255,255,255,.85)" });
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
});

/* ------------------------------------------------------------------ */
/* 13-2  Smooth Ride   (f = (1/2π)√(k/m))                               */
/* ------------------------------------------------------------------ */
const smoothRide = defineLevel((v) => {
  const CAR_CORNER = v.num(400, -1); // kg resting on one spring
  const TARGET_F = v.num(1.5, 2); // Hz, a comfortable bounce
  const BUMP = 0.05; // m
  const kEx = (CAR_CORNER * (TAU * TARGET_F) ** 2) / 1000; // kN/m
  const kc = { min: 5, max: 80, step: 0.5 };
  return {
    id: "13-2",
    chapter: 13,
    title: "Smooth Ride",
    hook: `Each corner of a car puts ${CAR_CORNER} kg on one spring. Engineers want a comfy bounce of ${f(TARGET_F, 2)} Hz. (Shock absorbers off for this test.)`,
    goal: `Bounce at ${f(TARGET_F, 2)} Hz (±0.02).`,
    controls: [{ key: "k", label: "Spring stiffness k", ...kc, value: 10, unit: "kN/m" }],
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
      `k = ${CAR_CORNER} × (2π × ${f(TARGET_F, 2)})² ≈ ${f(kEx * 1000, 0)} N/m = ${f(kEx, 1)} kN/m.`,
    ],
    journal: {
      title: "Mass on a spring",
      tex: String.raw`T = 2\pi\sqrt{\frac{m}{k}},\qquad f = \frac{1}{2\pi}\sqrt{\frac{k}{m}}`,
      note: "Stiffer → faster; heavier → slower.",
    },
    view: { xMin: -1.5, xMax: 1.5, yMin: -0.2, yMax: 2.0, anchor: "bottom" },
    graph: { title: "Bounce vs. time", yLabel: "height (cm)", tMax: 4, yMin: -6, yMax: 6, series: [{ label: "car body", color: COLORS.spring }], target: (t) => -BUMP * 100 * Math.cos(TAU * TARGET_F * t), targetLabel: `${f(TARGET_F, 2)} Hz target` },
    solution: { k: bestOnGrid(kc, (k) => Math.sqrt((k * 1000) / CAR_CORNER) / TAU - TARGET_F) },
    wrong: { k: snap(kc, kEx / 2) },
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
          sky(r, r.sy(0), "day");
          skylineScreen(r, r.sy(0), r.sy(0) * 0.55);
          ground(r, 0, "asphalt");
          tyre(r, 0, 0.25, 0.25);
          const top = new Vec2(0, body.pos.y);
          r.line(0, 0.25, 0, Math.min(0.55, body.pos.y), "#475569", 6); // strut from the axle
          zigzag(r, new Vec2(0, Math.min(0.55, body.pos.y)), top, 7, 0.14);
          // equilibrium line
          r.line(-1.3, eq + 0.12, 1.3, eq + 0.12, "#6b7280", 1, [5, 4]);
          r.text("rest", 1.25, eq + 0.17, { size: 10, align: "right", bold: true, bg: "rgba(255,255,255,.85)" });
          // car body (one corner)
          r.rect(-1.2, body.pos.y, 2.4, 0.3, "#e4572e", COLORS.ink, 6);
          r.rect(-0.7, body.pos.y + 0.3, 1.2, 0.3, "#e4572e", COLORS.ink, 6);
          r.rect(-0.6, body.pos.y + 0.36, 0.45, 0.2, "#2c3e57");
          r.rect(-0.05, body.pos.y + 0.36, 0.45, 0.2, "#2c3e57");
          r.rect(-1.15, body.pos.y + 0.22, 2.3, 0.03, "rgba(255,255,255,.35)");
          r.text(`${CAR_CORNER} kg`, 0, body.pos.y + 0.12, { size: 11, bold: true, color: "#fff" });
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
        equation: () => String.raw`f = \frac{1}{2\pi}\sqrt{\frac{k}{m}} = \frac{1}{2\pi}\sqrt{\frac{${n(k, 0)}}{${CAR_CORNER}}} = ${n(Math.sqrt(k / CAR_CORNER) / TAU, 3)}\text{ Hz}`,
        sample: () => [(body.pos.y - eq) * 100],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 13-3  Match the Wave   (x = A cos ωt, ω = √(k/m))                    */
/* ------------------------------------------------------------------ */
const matchTheWave = defineLevel((v) => {
  const WAVE_M = v.num(0.5, 2);
  const WAVE_A = v.num(0.15, 2);
  const WAVE_T = v.num(1.2, 2);
  const WAVE_END = 3 * WAVE_T;
  const target = (t: number) => WAVE_A * Math.cos((TAU * t) / WAVE_T);
  const kEx = WAVE_M * (TAU / WAVE_T) ** 2;
  const Ac = { min: 0.05, max: 0.3, step: 0.01 };
  const kc = { min: 2, max: 40, step: 0.05 };
  return {
    id: "13-3",
    chapter: 13,
    title: "Match the Wave",
    hook: `A ${f(WAVE_M, 2)} kg glider on a spring draws its motion on the graph. Make it trace the dashed target: x = ${f(WAVE_A, 2)} cos(2πt / ${f(WAVE_T, 2)} s).`,
    goal: "Stay within 1 cm of the target for 3 cycles.",
    controls: [
      { key: "A", label: "Pull-back distance A", ...Ac, value: snap(Ac, WAVE_A * 0.6), unit: "m" },
      { key: "k", label: "Spring stiffness k", ...kc, value: 5, unit: "N/m" },
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
      `A = ${f(WAVE_A, 2)} m. T = 2π√(m/k) → k = m(2π/T)².`,
      `k = ${f(WAVE_M, 2)} × (2π ÷ ${f(WAVE_T, 2)})² ≈ ${f(kEx, 2)} N/m.`,
    ],
    journal: {
      title: "Simple harmonic motion",
      tex: String.raw`x = A\cos(\omega t),\quad v = -A\omega\sin(\omega t),\quad \omega = \frac{2\pi}{T} = \sqrt{\frac{k}{m}}`,
      note: "Amplitude doesn't change the period.",
    },
    view: { xMin: -0.55, xMax: 0.4, yMin: -0.12, yMax: 0.2, anchor: "bottom" },
    graph: { title: "Position vs. time", yLabel: "x (m)", tMax: WAVE_END, yMin: -0.3, yMax: 0.3, series: [{ label: "glider", color: COLORS.spring }], target, targetLabel: "target" },
    solution: { A: snap(Ac, WAVE_A), k: bestOnGrid(kc, (k) => TAU * Math.sqrt(WAVE_M / k) - WAVE_T) },
    wrong: { A: snap(Ac, WAVE_A), k: snap(kc, kEx * 2) }, // "double k halves the period"
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
          wall(r, "#e2e8f0", "tile");
          // lab bench + air track
          r.rect(-0.75, -0.3, 1.4, 0.16, "#8b6a4a", "#5b3a1f", 3);
          metalBar(r, new Vec2(-0.6, -0.07), new Vec2(0.5, -0.07), 0.06, "#94a3b8");
          for (let x = -0.55; x < 0.48; x += 0.04) r.circle(x, -0.06, 0.004, "#475569", undefined, 1.2);
          r.rect(-0.53, -0.1, 0.03, 0.22, "#475569", "#1f2937", 2);
          // target zone and center
          r.line(0, -0.04, 0, 0.12, "#9ca3af", 1, [3, 3]);
          r.line(WAVE_A, -0.04, WAVE_A, 0.12, "#e63946", 1.5, [5, 3]);
          r.line(-WAVE_A, -0.04, -WAVE_A, 0.12, "#e63946", 1.5, [5, 3]);
          r.text(`±${f(WAVE_A, 2)} m`, WAVE_A, 0.15, { size: 10, color: "#b91c1c", bold: true, bg: "rgba(255,255,255,.9)" });
          const gx = glider.pos.x;
          zigzag(r, new Vec2(-0.5, 0), new Vec2(gx - 0.04, 0), 12, 0.02);
          r.rect(gx - 0.04, -0.04, 0.08, 0.07, "#7B4FA0", COLORS.ink, 4);
          r.rect(gx - 0.03, 0.012, 0.06, 0.012, "rgba(255,255,255,.35)", undefined, 2);
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
});

/* ------------------------------------------------------------------ */
/* 13-4  Photogate Speed   (v_max = Aω, ½kA² = ½mv²)                    */
/* ------------------------------------------------------------------ */
const photogateSpeed = defineLevel((v) => {
  const M = v.num(0.8, 2);
  const K = v.num(20, 0);
  const VT = v.num(0.6, 2); // target speed at the gate, m/s
  const w = Math.sqrt(K / M);
  const aEx = VT / w;
  const Ac = { min: 0.01, max: 0.4, step: 0.002 };
  return {
    id: "13-4",
    chapter: 13,
    title: "Photogate Speed",
    hook: `A ${f(M, 2)} kg glider on a spring (k = ${K} N/m) slides on an air track. A photogate at the center measures how fast it passes.`,
    goal: `Gate reads ${f(VT, 2)} m/s (±3%).`,
    controls: [{ key: "A", label: "Pull-back distance A", ...Ac, value: 0.25, unit: "m" }],
    predict: {
      prompt: "You pull the glider back twice as far. As it passes the center, it moves…",
      options: ["At the same speed", "Twice as fast", "Four times as fast", "√2 times as fast"],
      correct: 1,
      why: "v_max = Aω, and ω = √(k/m) doesn't change. Twice the amplitude means twice the top speed (and the same period).",
    },
    explain: {
      prompt: "Why is the glider fastest exactly at the center?",
      options: [
        "There the spring is relaxed: all the stored energy ½kA² has become kinetic energy ½mv²",
        "The photogate pulls it",
        "The spring force is biggest at the center",
      ],
      correct: 0,
      why: "At the ends v = 0 and all the energy is in the spring. At x = 0 the spring force is zero and all of it is kinetic: ½kA² = ½mv²_max → v_max = A√(k/m).",
    },
    hints: [
      "Too fast? Pull back less.",
      "v_max = Aω with ω = √(k/m).",
      `ω = √(${K}/${f(M, 2)}) ≈ ${f(w, 2)} rad/s → A = ${f(VT, 2)} ÷ ${f(w, 2)} ≈ ${f(aEx, 3)} m.`,
    ],
    journal: {
      title: "Speed in SHM",
      tex: String.raw`v = -A\omega\sin(\omega t),\qquad v_{max} = A\omega = A\sqrt{\frac{k}{m}}`,
      note: "Fastest at the center, stopped at the ends.",
    },
    view: { xMin: -0.6, xMax: 0.5, yMin: -0.12, yMax: 0.22, anchor: "bottom" },
    graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: Math.ceil((TAU / w) * 10) / 10, yMin: -1, yMax: 1, series: [{ label: "v", color: COLORS.velocity }] },
    solution: { A: snap(Ac, aEx) },
    wrong: { A: snap(Ac, aEx * 2) },
    create(p) {
      const WALL = -0.55;
      const glider = new Body(M, new Vec2(p.A, 0));
      glider.forces = [spring(new Vec2(WALL, 0), K, -WALL)];
      let gate: number | null = null;
      const T_END = TAU / w; // one full cycle
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          const x0 = glider.pos.x,
            v0 = glider.vel.x;
          stepBodies([glider], sim.t, dt);
          sim.t += dt;
          if (gate === null && x0 > 0 && glider.pos.x <= 0) {
            const fr = crossFraction(x0, glider.pos.x, 0);
            gate = Math.abs(v0 + (glider.vel.x - v0) * fr);
          }
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const g = gate ?? 0;
          const err = (g - VT) / VT;
          if (Math.abs(err) <= 0.03) return { success: true, message: `Gate: ${f(g, 3)} m/s. ½kA² = ½mv² checks out!` };
          return { success: false, message: `Gate: ${f(g, 3)} m/s. ${err > 0 ? "Pull back less." : "Pull back farther."}` };
        },
        draw(r, ov) {
          wall(r, "#e2e8f0", "tile");
          // lab bench + air track
          r.rect(-0.75, -0.3, 1.4, 0.16, "#8b6a4a", "#5b3a1f", 3);
          metalBar(r, new Vec2(-0.62, -0.07), new Vec2(0.53, -0.07), 0.06, "#94a3b8");
          for (let x = -0.58; x < 0.5; x += 0.04) r.circle(x, -0.06, 0.004, "#475569", undefined, 1.2);
          r.rect(WALL - 0.03, -0.1, 0.03, 0.24, "#475569", "#1f2937", 2);
          // photogate
          r.rect(-0.012, -0.04, 0.024, 0.2, "#1f2937", undefined, 3);
          r.circle(0, 0.15, 0.008, "#ef4444", undefined, 3);
          r.line(0, -0.03, 0, 0.15, "rgba(239,68,68,.7)", 1, [2, 2]);
          r.text(gate === null ? "gate" : `${f(gate, 3)} m/s`, 0, 0.19, { size: 11, bold: true, bg: "rgba(255,255,255,.9)" });
          const gx = glider.pos.x;
          zigzag(r, new Vec2(WALL, 0), new Vec2(gx - 0.04, 0), 12, 0.02);
          r.rect(gx - 0.04, -0.04, 0.08, 0.07, "#7B4FA0", COLORS.ink, 4);
          r.rect(gx - 0.03, 0.012, 0.06, 0.012, "rgba(255,255,255,.35)", undefined, 2);
          r.line(p.A, -0.05, p.A, 0.1, "#6b7280", 1, [3, 3]);
          r.text(`A = ${f(p.A, 3)} m`, p.A, 0.12, { size: 10, bold: true, bg: "rgba(255,255,255,.9)" });
          if (ov.forces) r.arrow(new Vec2(gx, 0.06), new Vec2(-K * gx, 0), 40, COLORS.spring, "−kx");
          if (ov.velocity) r.arrow(new Vec2(gx, -0.02), glider.vel, 80, COLORS.velocity, "v");
          const KE = 0.5 * M * glider.vel.x ** 2,
            PE = 0.5 * K * gx * gx;
          r.hud([`t = ${f(sim.t, 2)} s`, `spring ${f(PE, 3)} J + kinetic ${f(KE, 3)} J`]);
        },
        readouts: () => [
          { label: "ω = √(k/m)", value: `${f(w, 2)} rad/s` },
          { label: "Predicted v_max = Aω", value: `${f(p.A * w, 3)} m/s` },
          { label: "Velocity now", value: `${f(glider.vel.x, 3)} m/s` },
          { label: "Gate reading", value: gate === null ? "—" : `${f(gate, 3)} m/s` },
        ],
        equation: () => String.raw`v_{max} = A\omega = A\sqrt{\frac{k}{m}} = (${n(p.A, 3)})\sqrt{\frac{${K}}{${n(M, 2)}}} = ${n(p.A * w, 3)}\text{ m/s}`,
        sample: () => [glider.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 13-5  Weigh an Astronaut   (m = kT²/4π²; scales read zero in orbit)  */
/* ------------------------------------------------------------------ */
const weighAstronaut = defineLevel((v) => {
  const K = v.num(600, -1); // N/m
  const CHAIR = 10; // kg
  const M_REAL = v.num(75, 1);
  const T_MEAS = TAU * Math.sqrt((M_REAL + CHAIR) / K);
  const T_TXT = f(T_MEAS, 3);
  const T_SHOWN = Number(T_MEAS.toFixed(3));
  const mEx = (K * T_SHOWN * T_SHOWN) / (4 * Math.PI * Math.PI) - CHAIR;
  const mc = { min: 30, max: 150, step: 0.5 };
  return {
    id: "13-5",
    chapter: 13,
    title: "Weigh an Astronaut",
    hook: `Bathroom scales don't work in orbit. Instead, the astronaut straps into a ${CHAIR} kg chair on springs (k = ${K} N/m) and rocks back and forth. One full cycle takes ${T_TXT} s.`,
    goal: "Find the astronaut's mass (your estimate must swing in step with the real chair, ±2%).",
    controls: [{ key: "m", label: "Your mass estimate", ...mc, value: 50, unit: "kg" }],
    predict: {
      prompt: "On the space station, an astronaut stands on a regular bathroom scale. It reads…",
      options: ["Their normal weight", "About 90% of their weight", "Zero", "More than normal"],
      correct: 2,
      why: "Gravity there is still about 90% of Earth's, but the astronaut and the scale fall around Earth together. The scale doesn't have to push, so it reads zero.",
    },
    explain: {
      prompt: "Why does the spring chair still work in orbit?",
      options: [
        "The period depends on mass (how hard the body is to accelerate), not on weight",
        "The springs measure the astronaut's weight",
        "Gravity pulls the chair back to the center",
      ],
      correct: 0,
      why: "T = 2π√(m/k) comes from F = −kx = ma. Gravity isn't in it, so it works anywhere. Remember the chair moves too!",
    },
    hints: [
      "Total moving mass = astronaut + chair.",
      "T = 2π√(m/k) → m_total = kT²/4π².",
      `m_total = ${K}·${T_TXT}² ÷ 4π² ≈ ${f(mEx + CHAIR, 1)} kg → astronaut ≈ ${f(mEx, 1)} kg.`,
    ],
    journal: {
      title: "Mass from a period",
      tex: String.raw`T = 2\pi\sqrt{\frac{m}{k}} \;\Rightarrow\; m = \frac{kT^2}{4\pi^2}`,
      note: "Oscillations measure inertia, even with no weight.",
    },
    view: { xMin: -1.2, xMax: 1.2, yMin: -0.9, yMax: 0.9 },
    graph: {
      title: "Chair position vs. time",
      yLabel: "x (cm)",
      tMax: Math.ceil(T_MEAS * 3),
      yMin: -12,
      yMax: 12,
      series: [
        { label: "your estimate", color: COLORS.spring },
        { label: "real chair", color: COLORS.gravity },
      ],
    },
    solution: { m: snap(mc, mEx) },
    wrong: { m: snap(mc, mEx + CHAIR) }, // forgot the chair also moves
    create(p) {
      const A = 0.1;
      const yours = new Body(p.m + CHAIR, new Vec2(A, 0.35));
      const real = new Body(M_REAL + CHAIR, new Vec2(A, -0.35));
      yours.forces = [spring(new Vec2(-1, 0.35), K, 1)];
      real.forces = [spring(new Vec2(-1, -0.35), K, 1)];
      const T_END = 3 * T_MEAS;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          stepBodies([yours, real], sim.t, dt);
          sim.t += dt;
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const Ty = TAU * Math.sqrt((p.m + CHAIR) / K);
          const err = (p.m - M_REAL) / M_REAL;
          if (Math.abs(err) <= 0.02) return { success: true, message: `In step! Your estimate ${f(p.m, 1)} kg swings with period ${f(Ty, 3)} s.` };
          return { success: false, message: `Your chair's period is ${f(Ty, 3)} s, not ${T_TXT} s. ${err > 0 ? "Too heavy." : "Too light."}` };
        },
        draw(r, ov) {
          // inside the space station: pale wall panels, handrails and a porthole
          wall(r, "#dbe3ec", "panel");
          r.ctx.fillStyle = "rgba(100,116,139,.18)";
          for (let X = 40; X < r.w; X += 120) r.ctx.fillRect(X, r.h * 0.06, 70, 14);
          const X0 = r.w * 0.86,
            Y0 = r.h * 0.17,
            RR = Math.min(r.w, r.h) * 0.09;
          r.ctx.save();
          r.ctx.beginPath();
          r.ctx.arc(X0, Y0, RR, 0, TAU);
          r.ctx.fillStyle = "#0b1026";
          r.ctx.fill();
          r.ctx.clip();
          const eg = r.ctx.createRadialGradient(X0 - RR * 0.2, Y0 + RR * 1.4, RR * 0.2, X0, Y0 + RR * 1.6, RR * 1.3);
          eg.addColorStop(0, "#4aa3ff");
          eg.addColorStop(1, "#163f8c");
          r.ctx.fillStyle = eg;
          r.ctx.beginPath();
          r.ctx.arc(X0, Y0 + RR * 1.55, RR * 1.2, 0, TAU);
          r.ctx.fill();
          r.ctx.restore();
          r.ctx.beginPath();
          r.ctx.arc(X0, Y0, RR, 0, TAU);
          r.ctx.strokeStyle = "#94a3b8";
          r.ctx.lineWidth = 6;
          r.ctx.stroke();
          const row = (b: Body, y: number, label: string, color: string) => {
            r.rect(-1.1, y - 0.18, 0.05, 0.36, "#64748b", "#334155", 2);
            r.line(-1.1, y + 0.3, 0.9, y + 0.3, "#cbd5e1", 4);
            zigzag(r, new Vec2(-1.05, y), new Vec2(b.pos.x - 0.18, y), 10, 0.05);
            // seat + astronaut
            r.rect(b.pos.x - 0.18, y - 0.15, 0.36, 0.3, color, "#e2e8f0", 6);
            r.rect(b.pos.x - 0.1, y - 0.02, 0.2, 0.16, "#f8fafc", undefined, 5);
            r.circle(b.pos.x, y + 0.24, 0.08, "#f1c27d");
            r.circle(b.pos.x, y + 0.27, 0.075, "rgba(0,0,0,0)", "#4a3426");
            r.text(label, 0.95, y + 0.25, { size: 11, bold: true, align: "right", bg: "rgba(255,255,255,.9)" });
            r.line(0, y - 0.22, 0, y + 0.22, "rgba(51,65,85,.35)", 1, [3, 3]);
            if (ov.velocity) r.arrow(new Vec2(b.pos.x, y - 0.2), b.vel, 120, COLORS.velocity, "v");
          };
          row(yours, 0.35, `your estimate: ${f(p.m, 1)} kg`, "#7B4FA0");
          row(real, -0.35, "the real astronaut", "#0072B2");
          r.hud([`t = ${f(sim.t, 2)} s`, `real period ${T_TXT} s`]);
        },
        readouts: () => [
          { label: "Your moving mass", value: `${f(p.m + CHAIR, 1)} kg` },
          { label: "Your period", value: `${f(TAU * Math.sqrt((p.m + CHAIR) / K), 3)} s` },
          { label: "Measured period", value: `${T_TXT} s` },
          { label: "Gap between chairs", value: `${f(Math.abs(yours.pos.x - real.pos.x) * 100, 1)} cm` },
        ],
        equation: () => String.raw`T = 2\pi\sqrt{\frac{${n(p.m, 1)} + ${CHAIR}}{${K}}} = ${n(TAU * Math.sqrt((p.m + CHAIR) / K), 3)}\text{ s}`,
        sample: () => [yours.pos.x * 100, real.pos.x * 100],
      };
      return sim;
    },
  };
});

export const chapter13 = [grandfatherClock, smoothRide, matchTheWave, photogateSpeed, weighAstronaut];
