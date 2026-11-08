import { Body, G, crossFraction, stepBodies } from "../physics/core";
import { COLORS, applied, gravity } from "../physics/forces";
import { Vec2 } from "../physics/vec2";
import type { Sim } from "./types";
import { defineLevel, f, n, seeded, snap, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 5-1  Coasting in Space   (Newton's 1st & 2nd law)                   */
/* ------------------------------------------------------------------ */
const BURN = 4;

const stars = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 90 }, () => ({ x: rnd() * 140 - 20, y: rnd() * 40 - 20, r: rnd() * 1.5 + 0.5 }));
})();

const coastingInSpace = defineLevel((v) => {
  const STATION_X = v.num(100, 0);
  const CRATE_M = v.num(200, 0);
  const T_ARR = v.num(20, 0); // arrival time target, s (window ±1 s)
  // x(T) = ½aB² + aB(T − B) = aB(T − B/2)  →  F = m·X / (B(T − B/2))
  const FEx = (CRATE_M * STATION_X) / (BURN * (T_ARR - BURN / 2));
  const fc = { min: 0, max: 1000, step: 5 };
  return {
    id: "5-1",
    chapter: 5,
    title: "Coasting in Space",
    hook: `Send a ${CRATE_M} kg crate to a station ${STATION_X} m away. Thruster: ${BURN} s, then off. No friction.`,
    goal: `Arrive between ${T_ARR - 1} and ${T_ARR + 1} s.`,
    controls: [{ key: "thrust", label: "Thruster force F", ...fc, value: snap(fc, FEx * 0.4), unit: "N" }],
    predict: {
      prompt: "After the thruster shuts off, what will the crate do?",
      options: ["Gradually slow down and stop", "Keep moving at a constant speed", "Stop immediately", "Keep speeding up"],
      correct: 1,
      why: "Newton's 1st law: with no net force, velocity doesn't change. On Earth things slow down because of friction and air, not because motion 'runs out'.",
    },
    explain: {
      prompt: "Why did the crate keep moving after the engine shut off?",
      options: [
        "No net force means no acceleration, so its velocity stayed constant",
        "The force was stored inside the crate and slowly used up",
        "The space station pulled it in",
      ],
      correct: 0,
      why: "ΣF = ma. When ΣF = 0, a = 0. A force is needed to change motion, not to keep it going.",
    },
    hints: [
      "Watch the ghost spacing after the engine stops.",
      `a = F/m for ${BURN} s, then coast. Distance = a·${BURN}·(t − ${BURN / 2}).`,
      `${STATION_X} = a·${BURN}·${T_ARR - BURN / 2} → a ≈ ${f(FEx / CRATE_M, 2)} m/s² → F ≈ ${f(FEx, 0)} N.`,
    ],
    journal: {
      title: "Newton's 1st & 2nd laws",
      tex: String.raw`\sum \vec F = m\vec a \qquad \sum\vec F = 0 \;\Rightarrow\; \vec v = \text{constant}`,
      note: "No net force → constant velocity.",
    },
    view: { xMin: -8, xMax: STATION_X + 20, yMin: -18, yMax: 18 },
    graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: T_ARR + 2, yMin: 0, yMax: 8, series: [{ label: "v", color: COLORS.velocity }] },
    solution: { thrust: snap(fc, FEx) },
    wrong: { thrust: snap(fc, FEx * 2) },
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
        isDone: () => arrive !== null || sim.t > 50,
        outcome() {
          if (arrive === null)
            return { success: false, message: p.thrust === 0 ? "No force, no motion." : "Too slow to arrive. More thrust." };
          if (arrive >= T_ARR - 1 && arrive <= T_ARR + 1) return { success: true, message: `Docked at ${f(arrive, 2)} s. On time!` };
          return { success: false, message: `Docked at ${f(arrive, 2)} s. Need ${T_ARR - 1}–${T_ARR + 1} s. ${arrive < T_ARR - 1 ? "Less thrust." : "More thrust."}` };
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
          for (let x = 0; x <= STATION_X; x += 20) r.text(`${x} m`, x, -9, { size: 10, color: "#94a3b8" });
          if (ov.trail) for (const s of strobe.pts) r.rect(s.x - 1, s.y - 1, 2, 2, "rgba(255,255,255,.18)", "rgba(255,255,255,.4)");
          const P = crate.pos;
          const burning = sim.t < BURN && p.thrust > 0 && arrive === null;
          if (burning) r.poly([[P.x - 2.5, 1.4], [P.x - 2.5 - p.thrust / 120 - 2, 0], [P.x - 2.5, -1.4]], "#fbbf24");
          r.rect(P.x - 2.5, -2.5, 5, 5, "#b45309", "#fde68a", 4);
          r.text(`${CRATE_M} kg`, P.x, 0, { size: 11, color: "#fff", bold: true });
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
            ? String.raw`a = \frac{F}{m} = \frac{${n(p.thrust, 0)}\text{ N}}{${CRATE_M}\text{ kg}} = ${n(p.thrust / CRATE_M, 2)}\ \tfrac{m}{s^2}`
            : String.raw`\sum F = 0 \;\Rightarrow\; a = 0 \;\Rightarrow\; v = ${n(crate.vel.x, 2)}\ \tfrac{m}{s}\ \text{(constant)}`,
        sample: () => [crate.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 5-2  Elevator Scale   (N = m(g + a))                                */
/* ------------------------------------------------------------------ */
const ACC_PHASE = 2.5;
const RIDE_END = 4;

const elevatorScale = defineLevel((v) => {
  const RIDER_M = v.num(60, 0);
  // target reading: 10–35% above the rider's weight, rounded to 5 N
  const TARGET_N = Math.round((RIDER_M * G * v.num(1.19, 3, 0.1)) / 5) * 5;
  const aEx = TARGET_N / RIDER_M - G;
  const ac = { min: -4, max: 4, step: 0.05 };
  return {
    id: "5-2",
    chapter: 5,
    title: "Elevator Scale",
    hook: `A ${RIDER_M} kg rider stands on a scale in an elevator. Make them feel heavier.`,
    goal: `Scale reads ${TARGET_N} N (±5) while speeding up.`,
    controls: [{ key: "accel", label: "Elevator acceleration a", ...ac, value: 0, unit: "m/s²" }],
    predict: {
      prompt: "As the elevator starts moving UP and speeds up, the scale reads…",
      options: ["More than the rider's weight", "Exactly the rider's weight", "Less than the rider's weight"],
      correct: 0,
      why: "To accelerate the rider upward, the floor must push up harder than gravity pulls down. The scale measures that push, the normal force.",
    },
    explain: {
      prompt: `Why did the scale read more than mg = ${f(RIDER_M * G, 0)} N?`,
      options: [
        "The floor pushed harder than gravity to give the rider an upward net force: N − mg = ma",
        "The rider's mass increased",
        "Gravity got stronger as the elevator rose",
      ],
      correct: 0,
      why: "The scale reads the normal force N. From ΣF = ma: N = m(g + a). Mass and gravity didn't change.",
    },
    hints: [
      `At a = 0 it reads ${f(RIDER_M * G, 0)} N. You need more.`,
      "N up, mg down: N − mg = ma.",
      `a = ${TARGET_N}/${RIDER_M} − 9.81 ≈ ${f(aEx, 2)} m/s².`,
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
      yMin: Math.floor((RIDER_M * G * 0.7) / 100) * 100,
      yMax: Math.ceil((TARGET_N * 1.15) / 100) * 100,
      series: [{ label: "scale", color: COLORS.normal }],
      target: () => TARGET_N,
      targetLabel: `${TARGET_N} N goal`,
    },
    solution: { accel: snap(ac, aEx) },
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
          return { success: false, message: `Read ${f(N, 0)} N. Need ${TARGET_N} N. ${tip}` };
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
          return String.raw`N = m(g + a) = ${RIDER_M}(9.81 + ${a < 0 ? `(${n(a)})` : n(a)}) = ${n(RIDER_M * (G + a), 0)}\text{ N}`;
        },
        sample: () => [reading],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 5-3  Skater Push-Off   (Newton's 3rd law)                           */
/* ------------------------------------------------------------------ */
const PUSH_T = 0.5;
const AVA_START = -0.6;
const BEN_START = 0.6;

const skaterPushOff = defineLevel((v) => {
  const AVA_M = v.num(50, 0);
  const PUSH = v.num(200, -1);
  const AVA_D = 20;
  const BEN_D = v.num(10, 1, 0.15);
  const AVA_LINE = AVA_START - AVA_D;
  const BEN_LINE = BEN_START + BEN_D;
  // equal times → speeds in the ratio of distances → masses in the inverse ratio
  const mEx = (AVA_M * AVA_D) / BEN_D;
  const vAva = (PUSH * PUSH_T) / AVA_M;
  const mc = { min: 40, max: 160, step: 1 };
  return {
    id: "5-3",
    chapter: 5,
    title: "Skater Push-Off",
    hook: `Ava (${AVA_M} kg) and her partner push off on ice: ${PUSH} N for ${PUSH_T} s. Ava glides ${AVA_D} m, partner ${f(BEN_D, 1)} m.`,
    goal: "Both reach their marks at the same time (±0.3 s).",
    controls: [{ key: "benMass", label: "Partner's mass", ...mc, value: snap(mc, AVA_M * 1.2), unit: "kg" }],
    predict: {
      prompt: "The partner is heavier than Ava. While they push, who feels the larger force?",
      options: ["The heavier partner", "Ava", "They feel equal forces"],
      correct: 2,
      why: "Newton's 3rd law: when A pushes on B, B pushes back on A with an equal and opposite force, whatever their masses.",
    },
    explain: {
      prompt: "The forces were equal, so why did the heavier skater glide away more slowly?",
      options: [
        "The same force on more mass gives less acceleration (a = F/m)",
        "The heavier skater pushed less hard",
        "Heavier skaters have more friction on ice",
      ],
      correct: 0,
      why: "Equal forces, unequal masses. Twice the mass means half the acceleration, so half the speed after the push.",
    },
    hints: [
      "Same time, less distance → less speed.",
      `Speed after push: v = (F/m)·t. Ava gets ${f(vAva, 2)} m/s.`,
      `Partner needs ${f((vAva * BEN_D) / AVA_D, 2)} m/s → m = ${PUSH}·${PUSH_T} ÷ that ≈ ${f(mEx, 0)} kg.`,
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
    solution: { benMass: snap(mc, mEx) },
    wrong: { benMass: snap(mc, AVA_M) },
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
          r.ruler(-22, 14, -3, 2);
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
            r.arrow(new Vec2(ava.pos.x - 0.5, 0.6), new Vec2(-PUSH, 0), 0.5, COLORS.applied, `${PUSH} N`);
            r.arrow(new Vec2(ben.pos.x + 0.5, 0.6), new Vec2(PUSH, 0), 0.5, COLORS.normal, `${PUSH} N`);
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
          String.raw`a_{Ava} = \frac{${PUSH}}{${AVA_M}} = ${n(PUSH / AVA_M, 2)}\ \tfrac{m}{s^2},\qquad a_{partner} = \frac{${PUSH}}{${n(p.benMass, 0)}} = ${n(PUSH / p.benMass, 2)}\ \tfrac{m}{s^2}`,
        sample: () => [-ava.vel.x, ben.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 5-4  Coupling Strength   (connected objects, rope tension)          */
/* ------------------------------------------------------------------ */
const couplingStrength = defineLevel((v) => {
  const M1 = v.num(300, 0); // front cart, kg
  const M2 = v.num(200, 0); // back cart, kg
  const T_MAX = v.num(400, -1); // rope rating, N
  const FMAX = (T_MAX * (M1 + M2)) / M2;
  const fc = { min: 0, max: 2500, step: 10 };
  const SNAP_AT = 0.3; // s, when an overloaded rope gives way
  return {
    id: "5-4",
    chapter: 5,
    title: "Coupling Strength",
    hook: `A tractor pulls a ${M1} kg cart, which tows a ${M2} kg cart on a rope rated for ${T_MAX} N. The track is frictionless.`,
    goal: `Pull as hard as you can without snapping the rope (within 8% of the limit).`,
    controls: [{ key: "F", label: "Tractor pull F", ...fc, value: snap(fc, FMAX * 1.4), unit: "N" }],
    predict: {
      prompt: "The tractor pulls the front cart with force F. The rope between the carts pulls on the back cart with…",
      options: ["The full force F", "Less than F", "More than F", "Zero, since the carts move together"],
      correct: 1,
      why: "F has to accelerate both carts. The rope only has to accelerate the back one, so it needs only the back cart's share: T = m₂a < F.",
    },
    explain: {
      prompt: "How do you find the rope tension?",
      options: [
        "Both carts share one acceleration a = F/(m₁+m₂); the rope supplies the back cart's force, T = m₂a",
        "Tension always equals the pulling force",
        "Tension equals the back cart's weight m₂g",
      ],
      correct: 0,
      why: `Treat both carts as one: a = F/(${M1}+${M2}). Then look at the back cart alone: the only horizontal force is T, so T = ${M2}·a.`,
    },
    hints: [
      "The rope only pulls the back cart.",
      "a = F/(m₁+m₂), and T = m₂·a.",
      `T = ${T_MAX} N → a = ${T_MAX}/${M2} = ${f(T_MAX / M2, 2)} m/s² → F = ${M1 + M2}·a ≈ ${f(FMAX, 0)} N.`,
    ],
    journal: {
      title: "Connected objects",
      tex: String.raw`a = \frac{F}{m_1 + m_2},\qquad T = m_2 a = \frac{m_2}{m_1+m_2}F`,
      note: "Each rope pulls only what's behind it.",
    },
    view: { xMin: -14, xMax: 16, yMin: -2, yMax: 6, anchor: "bottom" },
    graph: { title: "Rope tension vs. time", yLabel: "T (N)", tMax: 3, yMin: 0, yMax: Math.ceil((T_MAX * 1.6) / 100) * 100, series: [{ label: "rope tension", color: COLORS.applied }], target: () => T_MAX, targetLabel: "rope limit" },
    solution: { F: snap(fc, FMAX * 0.96, "down") },
    wrong: { F: snap(fc, T_MAX) }, // "the rope feels the full pull"
    create(p) {
      const T = (M2 * p.F) / (M1 + M2);
      const snaps = T > T_MAX;
      const front = new Body(M1, new Vec2(-4, 0));
      const back = new Body(M2, new Vec2(-10, 0));
      let broken = false;
      front.forces = [
        applied(new Vec2(p.F, 0), 0, Infinity, "F"),
        { id: "rope", label: "T", color: COLORS.applied, compute: () => (broken ? Vec2.zero() : new Vec2(-T, 0)) },
      ];
      back.forces = [{ id: "rope", label: "T", color: COLORS.applied, compute: () => (broken ? Vec2.zero() : new Vec2(T, 0)) }];
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= 3) return;
          if (snaps && sim.t >= SNAP_AT) broken = true;
          stepBodies([front, back], sim.t, dt);
          sim.t += dt;
        },
        isDone: () => sim.t >= 3 - 1e-9,
        outcome() {
          if (snaps) return { success: false, message: `SNAP! The rope needed ${f(T, 0)} N but holds only ${T_MAX} N. Pull less.` };
          if (p.F < 0.92 * FMAX) return { success: false, message: `Rope held at ${f(T, 0)} N, only ${f((T / T_MAX) * 100, 0)}% of its limit. You can pull harder.` };
          return { success: true, message: `Max pull! Rope tension ${f(T, 0)} N of ${T_MAX} N, while you pull with ${f(p.F, 0)} N.` };
        },
        draw(r, ov) {
          r.clear("#fef3c7", "#fffbeb");
          r.rect(-30, -2, 60, 2, "#a3a3a3");
          for (let x = -30; x < 30; x += 1.5) r.rect(x, -0.35, 0.8, 0.2, "#78716c");
          const cart = (b: Body, w: number, color: string, label: string) => {
            r.rect(b.pos.x - w / 2, 0.3, w, 1.6, color, COLORS.ink, 4);
            r.circle(b.pos.x - w / 3, 0.3, 0.3, "#1f2937");
            r.circle(b.pos.x + w / 3, 0.3, 0.3, "#1f2937");
            r.text(label, b.pos.x, 1.1, { size: 11, bold: true, color: "#fff" });
          };
          cart(front, 3.4, "#0072B2", `${M1} kg`);
          cart(back, 3, "#009E73", `${M2} kg`);
          // tractor
          const tx = front.pos.x + 3.4;
          r.rect(tx - 0.8, 0.3, 2.6, 1.4, "#D55E00", COLORS.ink, 4);
          r.rect(tx + 0.2, 1.7, 1.2, 1.1, "#D55E00", COLORS.ink, 3);
          r.circle(tx - 0.2, 0.5, 0.5, "#1f2937");
          r.circle(tx + 1.4, 0.4, 0.4, "#1f2937");
          r.line(front.pos.x + 1.7, 1.0, tx - 0.8, 1.0, COLORS.ink, 3);
          // rope
          const rx0 = back.pos.x + 1.5,
            rx1 = front.pos.x - 1.7;
          if (!broken) r.line(rx0, 1.0, rx1, 1.0, "#92400e", 3);
          else {
            r.line(rx0, 1.0, rx0 + 0.8, 0.6, "#92400e", 3);
            r.line(rx1, 1.0, rx1 - 0.8, 0.6, "#92400e", 3);
            r.text("SNAP!", (rx0 + rx1) / 2, 2.4, { size: 14, bold: true, color: "#b91c1c" });
          }
          if (ov.forces) {
            r.arrow(new Vec2(tx + 2, 3.3), new Vec2(p.F, 0), 60 / FMAX, COLORS.applied, "F");
            if (!broken) r.arrow(new Vec2(back.pos.x, 2.6), new Vec2(T, 0), 60 / FMAX, COLORS.friction, "T");
          }
          if (ov.velocity) r.arrow(new Vec2(back.pos.x, 4.4), back.vel, 12, COLORS.velocity, "v");
          r.hud([`t = ${f(sim.t, 2)} s`, `rope: ${f(broken ? 0 : T, 0)} N of ${T_MAX} N`]);
        },
        view() {
          const c = (front.pos.x + back.pos.x) / 2 + 3;
          return { xMin: c - 15, xMax: c + 15, yMin: -2, yMax: 6, anchor: "bottom" };
        },
        readouts: () => [
          { label: "Tractor pull F", value: `${f(p.F, 0)} N` },
          { label: "Acceleration (both carts)", value: `${f(p.F / (M1 + M2), 2)} m/s²` },
          { label: "Rope tension T = m₂a", value: `${f(broken ? 0 : T, 0)} N` },
          { label: "Rope limit", value: `${T_MAX} N` },
        ],
        equation: () => String.raw`T = m_2 a = ${M2}\cdot\frac{${n(p.F, 0)}}{${M1}+${M2}} = ${n(T, 0)}\text{ N}`,
        sample: () => [broken ? 0 : T],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 5-5  Pulley Drop   (two-body system, tension < mg)                  */
/* ------------------------------------------------------------------ */
const pulleyDrop = defineLevel((v) => {
  const M = v.num(2, 1); // cart on the table, kg
  const L = v.num(1.2, 2); // distance to travel, m
  const T_GOAL = v.num(1.5, 1); // s
  const aEx = (2 * L) / (T_GOAL * T_GOAL);
  const mEx = (M * aEx) / (G - aEx); // kg
  const mc = { min: 20, max: 1500, step: 5 }; // grams
  return {
    id: "5-5",
    chapter: 5,
    title: "Pulley Drop",
    hook: `A ${f(M, 1)} kg cart on a frictionless table is tied to a string that runs over a pulley to a hanging weight. The cart must roll ${f(L, 2)} m to the edge.`,
    goal: `Cart reaches the edge in ${f(T_GOAL, 1)} s (±0.05 s).`,
    controls: [{ key: "m", label: "Hanging mass m", ...mc, value: 50, unit: "g" }],
    predict: {
      prompt: "While the weight is falling and speeding up, the tension in the string is…",
      options: ["Equal to the weight's mg", "Less than mg", "More than mg", "Zero"],
      correct: 1,
      why: "If the string pulled up with the full mg, the hanging weight would have zero net force and couldn't accelerate. It speeds up downward, so T < mg.",
    },
    explain: {
      prompt: "Why isn't the cart's acceleration simply mg/M?",
      options: [
        "The falling weight must accelerate both itself and the cart: a = mg/(M + m)",
        "Friction in the pulley slows everything",
        "The cart's weight pulls it backward",
      ],
      correct: 0,
      why: "The only unbalanced force on the whole system is the hanging weight's mg, and it moves the total mass M + m. So a = mg/(M + m), and T = Ma is less than mg.",
    },
    hints: [
      "Find the acceleration you need first.",
      "L = ½at² → a = 2L/t². Then mg = (M + m)a.",
      `a = ${f(aEx, 3)} m/s² → m = Ma/(g − a) ≈ ${f(mEx * 1000, 0)} g.`,
    ],
    journal: {
      title: "Pulley systems",
      tex: String.raw`a = \frac{mg}{M + m},\qquad T = Ma < mg`,
      note: "One string, one acceleration. Tension < hanging weight.",
    },
    view: { xMin: -L - 0.55, xMax: 0.45, yMin: -L - 0.5, yMax: 1.05 },
    graph: { title: "Cart speed vs. time", yLabel: "v (m/s)", tMax: Math.ceil(T_GOAL + 0.5), yMin: 0, yMax: Math.ceil(aEx * T_GOAL * 1.3), series: [{ label: "v", color: COLORS.velocity }] },
    solution: { m: snap(mc, mEx * 1000) },
    wrong: { m: snap(mc, mEx * 2000) },
    create(p) {
      const m = p.m / 1000;
      const a = (m * G) / (M + m);
      const T = M * a;
      let s = 0,
        vel = 0;
      let tEdge: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (tEdge !== null) return;
          const s2 = s + vel * dt + 0.5 * a * dt * dt;
          if (s2 >= L) {
            const tIn = (-vel + Math.sqrt(vel * vel + 2 * a * (L - s))) / a;
            tEdge = sim.t + tIn;
            vel += a * tIn;
            s = L;
            sim.t += tIn;
            return;
          }
          s = s2;
          vel += a * dt;
          sim.t += dt;
        },
        isDone: () => tEdge !== null || sim.t > 20,
        outcome() {
          if (tEdge === null) return { success: false, message: "Too slow. Add mass." };
          const d = tEdge - T_GOAL;
          if (Math.abs(d) <= 0.05) return { success: true, message: `Reached the edge at ${f(tEdge, 2)} s. String tension ${f(T, 2)} N, less than mg = ${f(m * G, 2)} N.` };
          return { success: false, message: `Reached the edge at ${f(tEdge, 2)} s. ${d > 0 ? "Add mass." : "Less mass."}` };
        },
        draw(r, ov) {
          r.clear("#f1f5f9", "#f8fafc");
          const top = 0.7;
          r.rect(-L - 0.5, top - 0.06, L + 0.5, 0.06, "#92400e");
          r.rect(-L - 0.45, -L - 0.5, 0.05, L + 1.14, "#78350f");
          r.rect(-L - 0.5, -L - 0.5, L + 1, 0.04, "#a8a29e");
          // pulley
          r.circle(0.03, top + 0.02, 0.05, "#9ca3af", COLORS.ink);
          const cx = -L - 0.3 + s;
          r.rect(cx - 0.12, top, 0.24, 0.14, "#0072B2", COLORS.ink, 3);
          r.text(`${f(M, 1)} kg`, cx, top + 0.07, { size: 10, bold: true, color: "#fff" });
          r.line(cx + 0.12, top + 0.07, 0.03, top + 0.07, "#111827", 1.5);
          const wy = top - 0.25 - s;
          r.line(0.08, top + 0.02, 0.08, wy + 0.08, "#111827", 1.5);
          r.rect(0.03, wy - 0.06, 0.1, 0.14, "#D55E00", COLORS.ink, 2);
          r.text(`${p.m} g`, 0.2, wy, { size: 10, bold: true, align: "left" });
          r.line(0, top, 0, top + 0.25, "#e63946", 2, [3, 3]);
          r.text("edge", 0, top + 0.3, { size: 10, color: "#b91c1c", bold: true });
          if (ov.forces) {
            const ppu = 0.12 / (m * G);
            r.arrow(new Vec2(0.08, wy - 0.06), new Vec2(0, -m * G), ppu * r.scale, COLORS.gravity, "mg");
            r.arrow(new Vec2(0.08, wy + 0.08), new Vec2(0, T), ppu * r.scale, COLORS.applied, "T");
            r.arrow(new Vec2(cx + 0.12, top + 0.2), new Vec2(T, 0), ppu * r.scale, COLORS.applied, "T");
          }
          if (ov.velocity) r.arrow(new Vec2(cx, top + 0.3), new Vec2(vel, 0), 0.15 * r.scale, COLORS.velocity, "v");
          r.hud([`t = ${f(tEdge ?? sim.t, 2)} s`, `T = ${f(T, 2)} N   mg = ${f(m * G, 2)} N`]);
        },
        readouts: () => [
          { label: "Acceleration", value: `${f(a, 3)} m/s²` },
          { label: "String tension T", value: `${f(T, 2)} N` },
          { label: "Hanging weight mg", value: `${f(m * G, 2)} N` },
          { label: "Distance rolled", value: `${f(s, 2)} m` },
        ],
        equation: () => String.raw`a = \frac{mg}{M+m} = \frac{(${n(m, 3)})(9.81)}{${n(M)} + ${n(m, 3)}} = ${n(a, 3)}\ \tfrac{m}{s^2}`,
        sample: () => [vel],
      };
      return sim;
    },
  };
});

export const chapter5 = [coastingInSpace, elevatorScale, skaterPushOff, couplingStrength, pulleyDrop];
