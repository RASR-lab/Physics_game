import { Body, G, crossFraction, stepBodies } from "../physics/core";
import { COLORS, applied, gravity } from "../physics/forces";
import { Vec2 } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n, seeded, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 5-1  Coasting in Space   (Newton's 1st & 2nd law)                   */
/* ------------------------------------------------------------------ */
const STATION_X = 100;
const BURN = 4;
const CRATE_M = 200;

const stars = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 90 }, () => ({ x: rnd() * 140 - 20, y: rnd() * 40 - 20, r: rnd() * 1.5 + 0.5 }));
})();

const coastingInSpace: Level = {
  id: "5-1",
  chapter: 5,
  title: "Coasting in Space",
  hook: "Send a 200 kg crate to a station 100 m away. Thruster: 4 s, then off. No friction.",
  goal: "Arrive between 19 and 21 s.",
  controls: [{ key: "thrust", label: "Thruster force F", min: 0, max: 1000, step: 10, value: 100, unit: "N" }],
  predict: {
    prompt: "Thruster off. The crate…",
    options: ["Slows and stops", "Keeps going, same speed", "Stops instantly", "Speeds up"],
    correct: 1,
    why: "No force → no change in motion. On Earth, friction is what stops things.",
  },
  explain: {
    prompt: "Why did it keep moving?",
    options: ["No net force → constant velocity", "Stored force slowly ran out", "The station pulled it"],
    correct: 0,
    why: "ΣF = 0 → a = 0. Forces change motion; they don't keep it going.",
  },
  hints: [
    "Watch the ghost spacing after the engine stops.",
    "a = F/m for 4 s, then coast. Total t ≈ 2 + 25/a.",
    "t = 20 s → a ≈ 1.39 → F ≈ 280 N.",
  ],
  journal: {
    title: "Newton's 1st & 2nd laws",
    tex: String.raw`\sum \vec F = m\vec a \qquad \sum\vec F = 0 \;\Rightarrow\; \vec v = \text{constant}`,
    note: "No net force → constant velocity.",
  },
  view: { xMin: -8, xMax: 120, yMin: -18, yMax: 18 },
  graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: 22, yMin: 0, yMax: 8, series: [{ label: "v", color: COLORS.velocity }] },
  solution: { thrust: 280 },
  wrong: { thrust: 500 },
  create(p) {
    const crate = new Body(CRATE_M, Vec2.zero());
    crate.forces = [applied(new Vec2(p.thrust, 0), 0, BURN, "F_thrust")];
    const strobe = new Strobe(1);
    let arrive: number | null = null;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (arrive !== null) return;
        strobe.record(sim.t, crate.pos);
        const x0 = crate.pos.x;
        stepBodies([crate], sim.t, dt);
        if (crate.pos.x >= STATION_X) {
          arrive = sim.t + dt * crossFraction(x0, crate.pos.x, STATION_X);
          crate.pos = new Vec2(STATION_X, 0);
        }
        sim.t += dt;
      },
      isDone: () => arrive !== null || sim.t > 40,
      outcome() {
        if (arrive === null)
          return { success: false, message: p.thrust === 0 ? "No force, no motion." : "Too slow to arrive. More thrust." };
        if (arrive >= 19 && arrive <= 21) return { success: true, message: `Docked at ${f(arrive, 2)} s. On time!` };
        return { success: false, message: `Docked at ${f(arrive, 2)} s. Need 19–21 s. ${arrive < 19 ? "Less thrust." : "More thrust."}` };
      },
      draw(r, ov) {
        r.clear("#0b1026", "#1a2250");
        for (const s of stars) r.circle(s.x, s.y, 0, "rgba(255,255,255,.8)", undefined, s.r);
        // station
        r.rect(STATION_X, -6, 6, 12, "#94a3b8", "#e2e8f0", 4);
        r.line(STATION_X, -14, STATION_X, 14, "rgba(52,211,153,.6)", 2, [6, 6]);
        r.rect(STATION_X + 6, -12, 2, 24, "#475569");
        r.rect(STATION_X + 8, -14, 10, 4, "#1e3a8a", "#93c5fd");
        r.rect(STATION_X + 8, 10, 10, 4, "#1e3a8a", "#93c5fd");
        r.text("STATION", STATION_X + 3, 8, { color: "#e2e8f0", bold: true, size: 12 });
        for (let x = 0; x <= 100; x += 20) r.text(`${x} m`, x, -9, { size: 10, color: "#94a3b8" });
        if (ov.trail) for (const s of strobe.pts) r.rect(s.x - 1, s.y - 1, 2, 2, "rgba(255,255,255,.18)", "rgba(255,255,255,.4)");
        const P = crate.pos;
        const burning = sim.t < BURN && p.thrust > 0 && arrive === null;
        if (burning) r.poly([[P.x - 2.5, 1.4], [P.x - 2.5 - p.thrust / 120 - 2, 0], [P.x - 2.5, -1.4]], "#fbbf24");
        r.rect(P.x - 2.5, -2.5, 5, 5, "#b45309", "#fde68a", 4);
        r.text("200 kg", P.x, 0, { size: 11, color: "#fff", bold: true });
        const c = P.add(new Vec2(0, 4));
        if (ov.forces && burning) r.arrow(P.add(new Vec2(2.5, 0)), new Vec2(p.thrust, 0), 0.12, COLORS.applied, "F_thrust");
        if (ov.velocity) r.arrow(c, crate.vel, 12, COLORS.velocity, "v");
        r.textPx(`t = ${f(arrive ?? sim.t, 2)} s`, 14, 18, { align: "left", bold: true, color: "#fff" });
        r.textPx(burning ? "Thruster ON" : sim.t >= BURN ? "Thruster OFF: coasting" : "", 14, 40, { align: "left", bold: true, color: burning ? "#fbbf24" : "#93c5fd" });
      },
      readouts: () => [
        { label: "Time", value: `${f(arrive ?? sim.t, 2)} s` },
        { label: "Net force", value: `${f(sim.t < BURN ? p.thrust : 0, 0)} N` },
        { label: "Acceleration", value: `${f(sim.t < BURN ? p.thrust / CRATE_M : 0, 2)} m/s²` },
        { label: "Velocity", value: `${f(crate.vel.x, 2)} m/s` },
      ],
      equation: () =>
        sim.t < BURN
          ? String.raw`a = \frac{F}{m} = \frac{${n(p.thrust, 0)}\text{ N}}{200\text{ kg}} = ${n(p.thrust / CRATE_M, 2)}\ \tfrac{m}{s^2}`
          : String.raw`\sum F = 0 \;\Rightarrow\; a = 0 \;\Rightarrow\; v = ${n(crate.vel.x, 2)}\ \tfrac{m}{s}\ \text{(constant)}`,
      sample: () => [crate.vel.x],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 5-2  Elevator Scale   (N = m(g + a))                                */
/* ------------------------------------------------------------------ */
const RIDER_M = 60;
const ACC_PHASE = 2.5;
const RIDE_END = 4;
const TARGET_N = 700;

const elevatorScale: Level = {
  id: "5-2",
  chapter: 5,
  title: "Elevator Scale",
  hook: "A 60 kg rider stands on a scale in an elevator. Make them feel heavier.",
  goal: "Scale reads 700 N (±5) while speeding up.",
  controls: [{ key: "accel", label: "Elevator acceleration a", min: -4, max: 4, step: 0.1, value: 0, unit: "m/s²" }],
  predict: {
    prompt: "Speeding up going UP, the scale reads…",
    options: ["More than weight", "Same as weight", "Less than weight"],
    correct: 0,
    why: "The floor must push harder than gravity to speed you up.",
  },
  explain: {
    prompt: "Why more than 589 N?",
    options: ["Floor pushes extra: N − mg = ma", "Mass increased", "Gravity got stronger"],
    correct: 0,
    why: "The scale reads N = m(g + a).",
  },
  hints: [
    "At a = 0 it reads 589 N. You need more.",
    "N up, mg down: N − mg = ma.",
    "a = 700/60 − 9.81 ≈ 1.9 m/s².",
  ],
  journal: {
    title: "Apparent weight",
    tex: String.raw`N - mg = ma \;\Rightarrow\; N = m(g + a)`,
    note: "A scale reads N, not mass. Accelerate up → heavier.",
  },
  view: { xMin: -6, xMax: 6, yMin: -2, yMax: 6 },
  graph: {
    title: "Scale reading vs. time",
    yLabel: "N (newtons)",
    tMax: 4,
    yMin: 400,
    yMax: 800,
    series: [{ label: "scale", color: COLORS.normal }],
    target: () => TARGET_N,
    targetLabel: "700 N goal",
  },
  solution: { accel: 1.9 },
  wrong: { accel: 0 },
  create(p) {
    const aElev = (t: number) => (t < ACC_PHASE ? p.accel : 0);
    const rider = new Body(RIDER_M, Vec2.zero());
    const normal = {
      id: "normal",
      label: "N",
      color: COLORS.normal,
      // Constraint force: whatever the floor must supply so the rider moves with the elevator.
      compute: (b: Body, t: number) => new Vec2(0, b.mass * (G + aElev(t))),
    };
    rider.forces = [gravity(), normal];
    let reading = RIDER_M * G;
    let worst = 0;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= RIDE_END) return;
        reading = RIDER_M * (G + aElev(sim.t)); // what the floor pushes with during this step
        if (sim.t < ACC_PHASE) worst = Math.max(worst, Math.abs(reading - TARGET_N));
        stepBodies([rider], sim.t, dt);
        sim.t += dt;
      },
      isDone: () => sim.t >= RIDE_END - 1e-9,
      outcome() {
        const N = RIDER_M * (G + p.accel);
        if (worst <= 5) return { success: true, message: `${f(N, 0)} N: ${f(N / (RIDER_M * G), 2)}× heavier!` };
        let tip = N < TARGET_N ? "More upward acceleration." : "Less acceleration.";
        if (p.accel < 0) tip = "Negative = down = lighter. Go positive.";
        return { success: false, message: `Read ${f(N, 0)} N. Need 700 N. ${tip}` };
      },
      draw(r, ov) {
        r.clear("#e5e7eb", "#f3f4f6");
        const y0 = rider.pos.y;
        const vis = r.visible();
        // shaft + floors
        r.rect(-3.2, vis.yMin, 6.4, vis.yMax - vis.yMin, "#d1d5db");
        for (let fl = Math.floor(vis.yMin / 3) * 3; fl < vis.yMax; fl += 3) {
          r.line(-3.2, fl, -4.2, fl, "#6b7280", 2);
          r.text(`${fl / 3 >= 0 ? "Floor " + (fl / 3 + 1) : "B" + -fl / 3}`, -4.4, fl + 0.3, { size: 10, align: "right", color: "#4b5563" });
        }
        // car
        r.rect(-2.5, y0 - 0.3, 5, 3.4, "#fef3c7", "#92400e", 6);
        r.rect(-2.5, y0 - 0.3, 5, 0.3, "#92400e");
        // scale
        r.rect(-0.6, y0, 1.2, 0.15, "#334155");
        // rider (simple figure)
        r.rect(-0.25, y0 + 0.15, 0.5, 0.9, "#1e40af", undefined, 4);
        r.rect(-0.3, y0 + 1.05, 0.6, 0.7, "#0ea5e9", undefined, 6);
        r.circle(0, y0 + 2.0, 0.24, "#fcd34d", "#92400e");
        // digital readout
        r.rect(1.0, y0 + 1.5, 1.3, 0.6, "#111827", undefined, 4);
        r.text(`${f(reading, 0)} N`, 1.65, y0 + 1.8, { color: "#34d399", bold: true, size: 13 });
        const c = new Vec2(0, y0 + 1.0);
        if (ov.forces) {
          r.arrow(c.add(new Vec2(-0.05, 0)), new Vec2(0, -RIDER_M * G), 0.11, COLORS.gravity, `mg ${f(RIDER_M * G, 0)} N`);
          r.arrow(c.add(new Vec2(0.05, 0)), new Vec2(0, reading), 0.11, COLORS.normal, `N ${f(reading, 0)} N`);
        }
        if (ov.velocity) r.arrow(new Vec2(-1.6, y0 + 1.5), rider.vel, 25, COLORS.velocity, "v");
        r.hud([`t = ${f(sim.t, 2)} s`, sim.t < ACC_PHASE ? `accelerating at ${f(p.accel, 1)} m/s²` : "constant velocity"]);
      },
      view() {
        const y = rider.pos.y;
        return { xMin: -6, xMax: 6, yMin: y - 2, yMax: y + 5.5 };
      },
      readouts: () => [
        { label: "Scale reading N", value: `${f(reading, 0)} N` },
        { label: "Weight mg", value: `${f(RIDER_M * G, 0)} N` },
        { label: "Acceleration", value: `${f(aElev(sim.t), 1)} m/s²` },
        { label: "Velocity", value: `${f(rider.vel.y, 2)} m/s` },
      ],
      equation: () => {
        const a = aElev(sim.t);
        return String.raw`N = m(g + a) = 60(9.81 + ${a < 0 ? `(${n(a)})` : n(a)}) = ${n(RIDER_M * (G + a), 0)}\text{ N}`;
      },
      sample: () => [reading],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 5-3  Skater Push-Off   (Newton's 3rd law)                           */
/* ------------------------------------------------------------------ */
const AVA_M = 50;
const PUSH = 200;
const PUSH_T = 0.5;
const AVA_START = -0.6;
const BEN_START = 0.6;
const AVA_LINE = AVA_START - 20;
const BEN_LINE = BEN_START + 10;

const skaterPushOff: Level = {
  id: "5-3",
  chapter: 5,
  title: "Skater Push-Off",
  hook: "Ava (50 kg) and her partner push off on ice: 200 N for 0.5 s. Ava glides 20 m, partner 10 m.",
  goal: "Both reach their marks at the same time (±0.3 s).",
  controls: [{ key: "benMass", label: "Partner's mass", min: 40, max: 120, step: 1, value: 60, unit: "kg" }],
  predict: {
    prompt: "Partner is heavier. Who feels more force?",
    options: ["Partner", "Ava", "Equal"],
    correct: 2,
    why: "3rd law: equal and opposite, always.",
  },
  explain: {
    prompt: "Equal forces. Why is the partner slower?",
    options: ["More mass → less acceleration", "Partner pushed less", "Ice friction"],
    correct: 0,
    why: "a = F/m. 2× mass → ½ speed.",
  },
  hints: [
    "Half the distance, same time → half the speed.",
    "Speed after push: v = (F/m)·t. Ava gets 2 m/s.",
    "Partner needs 1 m/s → m = 100 kg.",
  ],
  journal: {
    title: "Newton's 3rd law",
    tex: String.raw`\vec F_{A\,\text{on}\,B} = -\vec F_{B\,\text{on}\,A}`,
    note: "Equal and opposite forces, on different objects.",
  },
  view: { xMin: -24, xMax: 14, yMin: -4, yMax: 7, anchor: "bottom" },
  graph: {
    title: "Speed vs. time",
    yLabel: "speed (m/s)",
    tMax: 12,
    yMin: 0,
    yMax: 3,
    series: [
      { label: "Ava", color: COLORS.applied },
      { label: "partner", color: COLORS.normal },
    ],
  },
  solution: { benMass: 100 },
  wrong: { benMass: 50 },
  create(p) {
    const ava = new Body(AVA_M, new Vec2(AVA_START, 0));
    const ben = new Body(p.benMass, new Vec2(BEN_START, 0));
    ava.forces = [applied(new Vec2(-PUSH, 0), 0, PUSH_T, "F_partner→Ava")];
    ben.forces = [applied(new Vec2(PUSH, 0), 0, PUSH_T, "F_Ava→partner")];
    let tA: number | null = null,
      tB: number | null = null;
    const sim: Sim = {
      t: 0,
      step(dt) {
        const a0 = ava.pos.x,
          b0 = ben.pos.x;
        stepBodies([ava, ben], sim.t, dt);
        if (tA === null && ava.pos.x <= AVA_LINE) tA = sim.t + dt * crossFraction(a0, ava.pos.x, AVA_LINE);
        if (tB === null && ben.pos.x >= BEN_LINE) tB = sim.t + dt * crossFraction(b0, ben.pos.x, BEN_LINE);
        sim.t += dt;
      },
      isDone: () => (tA !== null && tB !== null && sim.t > Math.max(tA, tB) + 0.3) || sim.t > 30,
      outcome() {
        if (tA === null || tB === null) return { success: false, message: "Someone never reached their mark." };
        const d = tB - tA;
        if (Math.abs(d) <= 0.3) return { success: true, message: `Ava ${f(tA, 2)} s, partner ${f(tB, 2)} s. In sync!` };
        return { success: false, message: `Ava ${f(tA, 2)} s, partner ${f(tB, 2)} s. Make partner ${d < 0 ? "heavier" : "lighter"}.` };
      },
      draw(r, ov) {
        r.clear("#e0f2fe", "#f0f9ff");
        r.rect(-30, -4, 50, 3, "#bae6fd");
        r.line(-30, -1, 20, -1, "#7dd3fc", 2);
        r.flag(AVA_LINE, -1, 3, COLORS.applied, "Ava's mark");
        r.flag(BEN_LINE, -1, 3, COLORS.normal, "partner's mark");
        r.ruler(-22, 12, -3, 2);
        const skater = (b: Body, color: string, name: string) => {
          const s = 1.8 * Math.sqrt(b.mass / 60);
          const x = b.pos.x;
          r.rect(x - 0.25 * s, -1, 0.5 * s, 1.1 * s, color, undefined, 4);
          r.circle(x, -1 + 1.1 * s + 0.3 * s, 0.28 * s, "#fcd34d", "#92400e");
          r.line(x - 0.4, -1, x + 0.4, -1, "#111827", 3);
          r.text(`${name} ${f(b.mass, 0)} kg`, x, -1 + 1.1 * s + 0.95 * s, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
        };
        skater(ava, COLORS.applied, "Ava");
        skater(ben, COLORS.normal, "Partner");
        const pushing = sim.t < PUSH_T;
        if (ov.forces && pushing) {
          r.arrow(new Vec2(ava.pos.x - 0.5, 0.6), new Vec2(-PUSH, 0), 0.5, COLORS.applied, "200 N");
          r.arrow(new Vec2(ben.pos.x + 0.5, 0.6), new Vec2(PUSH, 0), 0.5, COLORS.normal, "200 N");
        }
        if (ov.velocity) {
          r.arrow(new Vec2(ava.pos.x, 4.6), ava.vel, 30, COLORS.velocity, "v");
          r.arrow(new Vec2(ben.pos.x, 4.6), ben.vel, 30, COLORS.velocity, "v");
        }
        r.hud([`t = ${f(sim.t, 2)} s`, pushing ? "Pushing: equal and opposite forces" : "Gliding (no net force)"]);
      },
      readouts: () => {
        const push = sim.t < PUSH_T;
        return [
          { label: "Force on Ava", value: `${push ? PUSH : 0} N` },
          { label: "Force on partner", value: `${push ? PUSH : 0} N` },
          { label: "Ava's speed", value: `${f(-ava.vel.x, 2)} m/s` },
          { label: "Partner's speed", value: `${f(ben.vel.x, 2)} m/s` },
        ];
      },
      equation: () =>
        String.raw`a_{Ava} = \frac{200}{50} = 4.0\ \tfrac{m}{s^2},\qquad a_{partner} = \frac{200}{${n(p.benMass, 0)}} = ${n(PUSH / p.benMass, 2)}\ \tfrac{m}{s^2}`,
      sample: () => [-ava.vel.x, ben.vel.x],
    };
    return sim;
  },
};

export const chapter5 = [coastingInSpace, elevatorScale, skaterPushOff];
