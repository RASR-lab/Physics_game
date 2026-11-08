import { Body, G, stepBodies, crossFraction } from "../physics/core";
import { COLORS, gravity } from "../physics/forces";
import { Vec2 } from "../physics/vec2";
import type { Sim } from "./types";
import { defineLevel, f, n, snap, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 2-1  Stop at the Line   (v² = v0² + 2aΔx)                           */
/* ------------------------------------------------------------------ */
const stopAtTheLine = defineLevel((v) => {
  const V0 = v.num(20, 0); // m/s
  const STOP_LINE = v.num(40, 0); // m
  const aEx = (V0 * V0) / (2 * STOP_LINE);
  const decel = { min: 1, max: 10, step: 0.05 };
  return {
    id: "2-1",
    chapter: 2,
    title: "Stop at the Line",
    hook: `Car at ${V0} m/s. Crosswalk ${STOP_LINE} m ahead. Brake!`,
    goal: "Stop 0–1.5 m before the line.",
    controls: [{ key: "decel", label: "Braking deceleration", ...decel, value: snap(decel, aEx * 0.6), unit: "m/s²" }],
    predict: {
      prompt: "Same brakes, but the car is going twice as fast. How much distance does it need to stop?",
      options: ["The same distance", "Twice as far", "Four times as far", "Half as far"],
      correct: 2,
      why: "Stopping distance is Δx = v₀² / 2a. Speed is squared, so doubling speed makes the distance 2² = 4 times larger.",
    },
    explain: {
      prompt: "Look at the strobe dots under the car. Why do they get closer together as the car stops?",
      options: [
        "The car covers less distance in each equal time step because its velocity is decreasing",
        "The brakes get stronger near the end",
        "The camera is zooming in",
      ],
      correct: 0,
      why: "Dots are dropped every 0.5 s. With constant deceleration the velocity drops by the same amount each step, so each gap is shorter than the last.",
    },
    hints: [
      "Stopped too far? Brake harder.",
      "Use v² = v₀² + 2aΔx with v = 0.",
      `a = ${V0}² ÷ (2 · ${STOP_LINE}) ≈ ${f(aEx, 2)} m/s².`,
    ],
    journal: {
      title: "Stopping distance",
      tex: String.raw`v^2 = v_0^2 + 2a\Delta x \;\Rightarrow\; \Delta x_{stop} = \frac{v_0^2}{2a}`,
      note: "2× speed → 4× stopping distance.",
    },
    view: { xMin: -4, xMax: STOP_LINE + 8, yMin: -8, yMax: 6, anchor: "bottom" },
    graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: 8, yMin: 0, yMax: V0 + 2, series: [{ label: "v", color: COLORS.velocity }] },
    // brake just hard enough: the grid value at or above the exact answer stops before the line
    solution: { decel: snap(decel, aEx * 1.01, "up") },
    wrong: { decel: snap(decel, aEx * 1.4) },
    create(p) {
      const a = p.decel;
      const m = 1200;
      const car = new Body(m, new Vec2(0, 0), new Vec2(V0, 0));
      car.forces = [
        { id: "brake", label: "F_brake", color: COLORS.friction, compute: (b) => (b.vel.x > 0 ? new Vec2(-m * a, 0) : Vec2.zero()) },
      ];
      const strobe = new Strobe(0.5);
      let stopped = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (stopped) return;
          strobe.record(sim.t, car.pos);
          stepBodies([car], sim.t, dt);
          sim.t += dt;
          if (car.vel.x <= 0) {
            car.vel = Vec2.zero();
            car.acc = Vec2.zero();
            car.frozen = true;
            stopped = true;
            strobe.pts.push(car.pos);
          }
        },
        isDone: () => stopped || sim.t > 30,
        outcome() {
          const x = car.pos.x;
          const gap = STOP_LINE - x;
          if (gap < 0) return { success: false, message: `Stopped ${f(-gap)} m past the line. Brake harder.` };
          if (gap > 1.5) return { success: false, message: `Stopped ${f(gap)} m short. Brake less.` };
          return { success: true, message: `Stopped ${f(gap, 2)} m before the line!` };
        },
        draw(r, ov) {
          r.clear();
          r.rect(-20, -6, 100, 6, "#6b7280");
          r.rect(-20, -0.25, 100, 0.25, "#4b5563");
          for (let x = -20; x < 80; x += 6) r.rect(x, -3.1, 3, 0.25, "#f3f4f6");
          // stop line + crosswalk
          r.rect(STOP_LINE, -6, 0.5, 6, "#ffffff");
          for (let y = -5.6; y < -0.3; y += 1.1) r.rect(STOP_LINE + 1.2, y, 3, 0.6, "#f9fafb");
          r.flag(STOP_LINE, 0, 4, "#e63946", "STOP");
          r.rect(STOP_LINE - 1.5, -6, 1.5, 6, "rgba(0,158,115,.25)");
          r.ruler(0, STOP_LINE + 5, -6.4, 5);
          if (ov.trail) for (const s of strobe.pts) r.circle(s.x, 0.25, 0.3, "rgba(213,94,0,.55)", undefined, 4);
          r.car(car.pos.x - 2.25, 0, 4.5, "#e4572e");
          const c = new Vec2(car.pos.x - 2.25, 2.0);
          if (ov.velocity) r.arrow(c.add(new Vec2(0, 1)), car.vel, 4, COLORS.velocity, "v");
          if (ov.forces) for (const fv of car.lastForces) r.arrow(c, fv.value, 0.008, fv.force.color, fv.force.label);
          r.hud([`t = ${f(sim.t, 2)} s`, `x = ${f(car.pos.x, 1)} m`]);
        },
        readouts: () => [
          { label: "Time", value: `${f(sim.t, 2)} s` },
          { label: "Position (front)", value: `${f(car.pos.x, 2)} m` },
          { label: "Velocity", value: `${f(car.vel.x, 2)} m/s` },
          { label: "Acceleration", value: `${f(stopped ? 0 : -a, 1)} m/s²` },
        ],
        equation: () =>
          String.raw`v^2 = v_0^2 + 2a\Delta x \quad\Rightarrow\quad (${n(car.vel.x)})^2 = (${V0})^2 + 2(-${n(a)})(${n(car.pos.x)})`,
        sample: () => [car.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 2-2  The Two-Second Drop   (Δy = ½gt²)                              */
/* ------------------------------------------------------------------ */
const twoSecondDrop = defineLevel((v) => {
  const TARGET_T = v.num(2, 1); // s
  const hEx = 0.5 * G * TARGET_T * TARGET_T;
  const hc = { min: 1, max: 40, step: 0.5 };
  return {
    id: "2-2",
    chapter: 2,
    title: "The Two-Second Drop",
    hook: "Drop a bowling ball and a tennis ball together. No air.",
    goal: `Make the fall last ${f(TARGET_T, 1)} s (±0.05 s).`,
    controls: [{ key: "h", label: "Drop height", ...hc, value: 10, unit: "m" }],
    predict: {
      prompt: "There's no air. The bowling ball (7 kg) and tennis ball (0.06 kg) are released together. Which hits the ground first?",
      options: ["The bowling ball", "The tennis ball", "They land at the same time"],
      correct: 2,
      why: "Gravity pulls harder on the heavier ball, but it also has more mass to accelerate. a = F/m = mg/m = g for both, so they fall together.",
    },
    explain: {
      prompt: "Doubling the height did NOT double the fall time. Why not?",
      options: [
        "The ball keeps speeding up, so later meters take less time (Δy = ½gt², so t ∝ √h)",
        "Gravity is weaker higher up",
        "Air resistance slows it down at the top",
      ],
      correct: 0,
      why: "Height grows with t². To double the time you need four times the height.",
    },
    hints: [
      "Try 10 m. Too short or too long?",
      "Use Δy = ½ g t².",
      `h = ½ · 9.81 · ${f(TARGET_T, 1)}² ≈ ${f(hEx, 1)} m.`,
    ],
    journal: {
      title: "Free fall",
      tex: String.raw`\Delta y = \tfrac12 g t^2 \qquad a = \frac{F}{m} = \frac{mg}{m} = g`,
      note: "No air → everything falls at g = 9.81 m/s².",
    },
    view: { xMin: -6, xMax: 6, yMin: -1, yMax: 22 },
    graph: {
      title: "Height vs. time",
      yLabel: "y (m)",
      tMax: 3,
      yMin: 0,
      yMax: Math.ceil(hEx),
      series: [
        { label: "bowling ball", color: COLORS.gravity },
        { label: "tennis ball", color: COLORS.friction },
      ],
    },
    solution: { h: snap(hc, hEx) },
    wrong: { h: snap(hc, hEx / 2) }, // "half the time → half the height"
    create(p) {
      const h = p.h;
      const bowl = new Body(7, new Vec2(-1.2, h));
      const tennis = new Body(0.06, new Vec2(1.2, h));
      bowl.forces = [gravity()];
      tennis.forces = [gravity()];
      const land: (number | null)[] = [null, null];
      const strobe = [new Strobe(0.1), new Strobe(0.1)];
      const balls = [bowl, tennis];
      const sim: Sim = {
        t: 0,
        step(dt) {
          balls.forEach((b, i) => {
            if (b.frozen) return;
            strobe[i].record(sim.t, b.pos);
            const y0 = b.pos.y;
            stepBodies([b], sim.t, dt);
            if (b.pos.y <= 0) {
              land[i] = sim.t + dt * crossFraction(y0, b.pos.y, 0);
              b.pos = new Vec2(b.pos.x, 0);
              b.vel = Vec2.zero();
              b.frozen = true;
            }
          });
          sim.t += dt;
        },
        isDone: () => (land[0] !== null && land[1] !== null) || sim.t > 10,
        outcome() {
          const t = land[0]!;
          const same = Math.abs(land[0]! - land[1]!) < 1e-6;
          const both = same ? "Both landed together" : "Landed";
          if (Math.abs(t - TARGET_T) <= 0.05) return { success: true, message: `${both} at ${f(t, 2)} s!` };
          return { success: false, message: `${both} at ${f(t, 2)} s. Need ${f(TARGET_T, 2)} s. ${t < TARGET_T ? "Go higher." : "Go lower."}` };
        },
        draw(r, ov) {
          r.setView(sim.view!());
          r.clear("#1f2a44", "#3b4a6b");
          const vis = r.visible();
          r.rect(vis.xMin, -2, vis.xMax - vis.xMin, 2, "#9ca3af");
          // tower
          r.rect(-4.5, 0, 1.4, h, "#64748b", "#334155");
          r.rect(-4.5, h, 4.6, 0.25, "#94a3b8");
          r.vruler(0, Math.max(h, 5), 4.2, h > 20 ? 5 : 2, "m", "#e2e8f0");
          balls.forEach((b, i) => {
            if (ov.trail) for (const s of strobe[i].pts) r.circle(s.x, s.y, 0.08, i ? "rgba(230,159,0,.6)" : "rgba(86,180,233,.6)", undefined, 3);
            r.circle(b.pos.x, b.pos.y + (i ? 0.035 : 0.11), i ? 0.033 : 0.11, i ? "#d9f99d" : "#1e3a8a", "#fff", i ? 6 : 12);
            r.text(i ? "tennis 0.06 kg" : "bowling 7 kg", b.pos.x, b.pos.y + (i ? 0.035 : 0.11), {
              size: 11,
              color: "#fff",
              align: i ? "left" : "right",
              baseline: "bottom",
            });
            const o = b.pos.add(new Vec2(0, 0.1));
            if (ov.forces) r.arrow(o, new Vec2(0, -b.mass * G), 0.9, COLORS.gravity, `F_g ${f(b.mass * G, 1)} N`);
            if (ov.velocity && !b.frozen) r.arrow(o.add(new Vec2(i ? 0.6 : -0.6, 0)), b.vel, 3, COLORS.velocity, "v");
          });
          r.hud([`t = ${f(sim.t, 2)} s`, `a = F/m = ${f(G, 2)} m/s² (both)`]);
        },
        view() {
          const top = Math.max(h + 2, 8);
          return { xMin: -6, xMax: 6, yMin: -1, yMax: top };
        },
        readouts: () => [
          { label: "Time", value: `${f(sim.t, 2)} s` },
          { label: "Bowling ball height", value: `${f(bowl.pos.y, 2)} m` },
          { label: "Tennis ball height", value: `${f(tennis.pos.y, 2)} m` },
          { label: "Speed (both)", value: `${f(-bowl.vel.y, 2)} m/s` },
        ],
        equation: () => {
          const fallen = h - bowl.pos.y;
          return String.raw`\Delta y = \tfrac12 g t^2 \quad\Rightarrow\quad ${n(fallen, 2)} = \tfrac12 (9.81)(${n(sim.t, 2)})^2`;
        },
        sample: () => [bowl.pos.y, tennis.pos.y],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 2-3  Match the Graph   (v = v0 + at)                                */
/* ------------------------------------------------------------------ */
const matchTheGraph = defineLevel((v) => {
  // target line stays on the slider grid so a perfect match is possible
  const TV0 = v.step(2, 0.5); // m/s
  const TA = v.step(1.5, 0.25); // m/s²
  return {
    id: "2-3",
    chapter: 2,
    title: "Match the Graph",
    hook: "Program a self-driving car to follow the dashed graph.",
    goal: "Your v–t line must sit on the dashed line.",
    controls: [
      { key: "v0", label: "Starting velocity v₀", min: -4, max: 10, step: 0.5, value: 0, unit: "m/s" },
      { key: "a", label: "Acceleration a", min: -3, max: 3, step: 0.25, value: 0, unit: "m/s²" },
    ],
    predict: {
      prompt: "A straight line that slopes upward on a velocity–time graph means the car is…",
      options: ["Moving at a constant speed", "Speeding up at a steady rate", "Stopped", "Moving backward"],
      correct: 1,
      why: "On a v–t graph the slope is the acceleration. A constant upward slope means the velocity increases by the same amount every second.",
    },
    explain: {
      prompt: "On a velocity–time graph, what does the slope of the line tell you?",
      options: ["The acceleration", "The position", "The distance to the finish"],
      correct: 0,
      why: "a = Δv/Δt, which is rise over run on a v–t graph. Where the line crosses t = 0 gives v₀.",
    },
    hints: [
      "Two things: where the line starts, how steep it is.",
      "Start (t = 0) → v₀. Steepness → a.",
      `v₀ = ${f(TV0, 1)} m/s. a = (${f(TV0 + 6 * TA, 1)} − ${f(TV0, 1)}) ÷ 6 = ${f(TA, 2)} m/s².`,
    ],
    journal: {
      title: "Velocity and acceleration",
      tex: String.raw`v = v_0 + at \qquad a = \frac{\Delta v}{\Delta t}`,
      note: "Start value = v₀. Slope = a.",
    },
    view: { xMin: -10, xMax: 40, yMin: -4, yMax: 8 },
    graph: {
      title: "Velocity vs. time",
      yLabel: "v (m/s)",
      tMax: 6,
      yMin: -4,
      yMax: 12,
      series: [{ label: "your car", color: COLORS.velocity }],
      target: (t) => TV0 + TA * t,
      targetLabel: "target",
    },
    solution: { v0: TV0, a: TA },
    wrong: { v0: 0, a: TA + 0.5 },
    create(p) {
      const m = 1000;
      const car = new Body(m, new Vec2(0, 0), new Vec2(p.v0, 0));
      car.forces = [{ id: "drive", label: "F_net", color: COLORS.applied, compute: () => new Vec2(m * p.a, 0) }];
      const strobe = new Strobe(0.5);
      let maxErr = 0;
      const T_END = 6;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          strobe.record(sim.t, car.pos);
          stepBodies([car], sim.t, dt);
          sim.t += dt;
          maxErr = Math.max(maxErr, Math.abs(car.vel.x - (TV0 + TA * sim.t)));
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          if (maxErr < 0.1) return { success: true, message: "Perfect match!" };
          const tips: string[] = [];
          if (Math.abs(p.v0 - TV0) > 0.01) tips.push("start (v₀) is off");
          if (Math.abs(p.a - TA) > 0.01) tips.push("slope (a) is off");
          return { success: false, message: `No match: ${tips.join(" and ")}.` };
        },
        draw(r, ov) {
          r.setView(sim.view!());
          r.clear();
          const vis = r.visible();
          r.rect(vis.xMin, -6, vis.xMax - vis.xMin, 6, "#6b7280");
          for (let x = Math.floor(vis.xMin / 6) * 6; x < vis.xMax; x += 6) r.rect(x, -2.1, 3, 0.2, "#f3f4f6");
          for (let x = Math.ceil(vis.xMin / 10) * 10; x < vis.xMax; x += 10) {
            r.line(x, 0, x, 0.6, "#374151", 2);
            r.text(`${x} m`, x, 1.0, { size: 11, color: "#374151" });
          }
          if (ov.trail) for (const s of strobe.pts) r.circle(s.x, -0.6, 0.25, "rgba(213,94,0,.6)", undefined, 4);
          r.car(car.pos.x, 0, 4.5, "#0ea5a5", car.vel.x >= 0 ? 1 : -1);
          const c = new Vec2(car.pos.x, 2.2);
          if (ov.velocity) r.arrow(c.add(new Vec2(0, 0.9)), car.vel, 6, COLORS.velocity, "v");
          if (ov.forces) r.arrow(c, new Vec2(p.a, 0), 25, COLORS.acceleration, "a");
          r.hud([`t = ${f(sim.t, 2)} s`, `v = ${f(car.vel.x, 2)} m/s`]);
        },
        view() {
          const cx = car.pos.x + 8;
          return { xMin: cx - 22, xMax: cx + 22, yMin: -4, yMax: 6, anchor: "bottom" };
        },
        readouts: () => [
          { label: "Time", value: `${f(sim.t, 2)} s` },
          { label: "Your velocity", value: `${f(car.vel.x, 2)} m/s` },
          { label: "Target velocity", value: `${f(TV0 + TA * sim.t, 2)} m/s` },
          { label: "Position", value: `${f(car.pos.x, 1)} m` },
        ],
        equation: () => String.raw`v = v_0 + at \quad\Rightarrow\quad ${n(car.vel.x, 2)} = ${n(p.v0)} + (${n(p.a, 2)})(${n(sim.t, 2)})`,
        sample: () => [car.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 2-4  Catch the Bus   (x = ½at², average velocity)                   */
/* ------------------------------------------------------------------ */
const catchTheBus = defineLevel((v) => {
  const VB = v.num(8, 1); // bus speed, m/s
  const D = v.num(100, 0); // distance to the next stop, m
  const tBus = D / VB;
  const aEx = (2 * D) / (tBus * tBus); // = 2 VB² / D
  const ac = { min: 0.2, max: 3, step: 0.02 };
  return {
    id: "2-4",
    chapter: 2,
    title: "Catch the Bus",
    hook: `You just missed the bus! It rolls past at a steady ${f(VB, 1)} m/s. Its next stop is ${D} m away. You start from rest on an e-scooter.`,
    goal: "Reach the next stop at the same moment as the bus (±0.3 s).",
    controls: [{ key: "a", label: "Scooter acceleration a", ...ac, value: snap(ac, aEx * 0.5), unit: "m/s²" }],
    predict: {
      prompt: "You and the bus reach the stop together. At that moment, your speed compared with the bus's is…",
      options: ["The same", "Twice as fast", "Half as fast", "1.5 times as fast"],
      correct: 1,
      why: "You covered the same distance in the same time, so your average speed equals the bus's. Starting from 0 with steady acceleration, your average is half your final speed, so your final speed is twice the bus's.",
    },
    explain: {
      prompt: "Why do you have to be going faster than the bus at the end?",
      options: [
        "You started at 0, so you must finish above the bus's speed to have the same average speed",
        "The bus slows down near the stop",
        "Acceleration makes distances shorter",
      ],
      correct: 0,
      why: "Average velocity = Δx/Δt is the same for both. For constant acceleration from rest, v̄ = (0 + v)/2, so v = 2v̄.",
    },
    hints: [
      "Both of you must cover the same distance in the same time.",
      "Bus time: t = D ÷ v. You: D = ½at².",
      `t = ${D} ÷ ${f(VB, 1)} ≈ ${f(tBus, 1)} s, so a = 2·${D} ÷ ${f(tBus, 1)}² ≈ ${f(aEx, 2)} m/s².`,
    ],
    journal: {
      title: "Average velocity",
      tex: String.raw`\bar v = \frac{\Delta x}{\Delta t} = \frac{v_0 + v}{2},\qquad x = x_0 + v_0t + \tfrac12at^2`,
      note: "Start from rest → final speed is 2× the average.",
    },
    view: { xMin: -8, xMax: D + 14, yMin: -8, yMax: 8, anchor: "bottom" },
    graph: {
      title: "Velocity vs. time",
      yLabel: "v (m/s)",
      tMax: Math.ceil(tBus + 2),
      yMin: 0,
      yMax: Math.ceil(2.4 * VB),
      series: [
        { label: "you", color: COLORS.velocity },
        { label: "bus", color: COLORS.gravity },
      ],
    },
    solution: { a: snap(ac, aEx) },
    wrong: { a: snap(ac, aEx / 2) }, // "just match the bus's speed at the stop"
    create(p) {
      const you = new Body(90, Vec2.zero());
      you.forces = [{ id: "drive", label: "F_net", color: COLORS.applied, compute: (b) => (b.pos.x < D ? new Vec2(b.mass * p.a, 0) : Vec2.zero()) }];
      const bus = new Body(12000, Vec2.zero(), new Vec2(VB, 0));
      const strobe = new Strobe(1);
      let tYou: number | null = null;
      let tB: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (tYou !== null && tB !== null) return;
          strobe.record(sim.t, you.pos);
          const y0 = you.pos.x,
            b0 = bus.pos.x;
          stepBodies([you, bus], sim.t, dt);
          if (tYou === null && you.pos.x >= D) {
            tYou = sim.t + dt * crossFraction(y0, you.pos.x, D);
            you.frozen = true;
            you.pos = new Vec2(D, 0);
          }
          if (tB === null && bus.pos.x >= D) {
            tB = sim.t + dt * crossFraction(b0, bus.pos.x, D);
            bus.frozen = true;
            bus.pos = new Vec2(D, 0);
          }
          sim.t += dt;
        },
        isDone: () => (tYou !== null && tB !== null) || sim.t > 60,
        outcome() {
          if (tYou === null) return { success: false, message: "You never made it. Accelerate harder." };
          const d = tYou - tBus;
          if (Math.abs(d) <= 0.3) return { success: true, message: `Arrived together at ${f(tYou, 2)} s, going ${f(p.a * tYou, 1)} m/s: twice the bus's speed!` };
          return { success: false, message: `You arrived ${f(Math.abs(d), 1)} s ${d > 0 ? "after" : "before"} the bus. ${d > 0 ? "Accelerate harder." : "Ease off."}` };
        },
        draw(r, ov) {
          r.clear();
          const vis = r.visible();
          r.rect(vis.xMin, -6, vis.xMax - vis.xMin, 6, "#6b7280");
          for (let x = Math.floor(vis.xMin / 8) * 8; x < vis.xMax; x += 8) r.rect(x, -3.1, 4, 0.25, "#f3f4f6");
          r.flag(D, 0, 6, "#0072B2", "BUS STOP");
          r.ruler(0, D, -6.6, D > 100 ? 20 : 10);
          if (ov.trail) for (const s of strobe.pts) r.circle(s.x, -1, 0.5, "rgba(213,94,0,.55)", undefined, 4);
          // bus
          const bx = bus.pos.x;
          r.rect(bx - 12, -2.6, 12, 4.4, "#facc15", "#713f12", 6);
          for (let i = 0; i < 4; i++) r.rect(bx - 11.2 + i * 2.8, -0.4, 2, 1.4, "#cfe8ff");
          r.circle(bx - 9.5, -2.6, 0.9, "#1f2937");
          r.circle(bx - 2.5, -2.6, 0.9, "#1f2937");
          // you on a scooter (drawn 2× size so you can spot it next to the bus)
          const x = you.pos.x;
          const k = 2;
          r.line(x - 1.2 * k, -5.6, x + 1.2 * k, -5.6, "#111827", 4);
          r.line(x + 1.0 * k, -5.6, x + 1.0 * k, -5.6 + 2.6 * k, "#111827", 3);
          r.circle(x - 1.2 * k, -5.8, 0.35 * k, "#111827");
          r.circle(x + 1.2 * k, -5.8, 0.35 * k, "#111827");
          r.rect(x - 0.4 * k, -5.4, 0.8 * k, 2.4 * k, "#D55E00", undefined, 3);
          r.circle(x, -5.4 + 2.9 * k, 0.45 * k, "#fcd34d", "#92400e");
          if (ov.velocity) {
            r.arrow(new Vec2(x, 0.6), you.vel, 2.2, COLORS.velocity, "v");
            r.arrow(new Vec2(bx - 6, 3), bus.vel, 2.2, COLORS.gravity, "v_bus");
          }
          r.hud([`t = ${f(sim.t, 2)} s`, `you ${f(you.pos.x, 1)} m · bus ${f(bus.pos.x, 1)} m`]);
        },
        readouts: () => [
          { label: "Time", value: `${f(sim.t, 2)} s` },
          { label: "Your speed", value: `${f(you.vel.x, 2)} m/s` },
          { label: "Bus speed", value: `${f(bus.vel.x, 2)} m/s` },
          { label: "Your average speed", value: sim.t > 0 ? `${f(you.pos.x / sim.t, 2)} m/s` : "—" },
        ],
        equation: () =>
          String.raw`x_{you} = \tfrac12 at^2 = \tfrac12(${n(p.a, 2)})(${n(sim.t, 2)})^2 = ${n(you.pos.x)}\text{ m}\quad x_{bus} = ${n(VB)}\cdot ${n(sim.t, 2)} = ${n(bus.pos.x)}\text{ m}`,
        sample: () => [you.vel.x, bus.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 2-5  Toss to the Window   (v² = v0² − 2gΔy, a = −g at the top)      */
/* ------------------------------------------------------------------ */
const tossToTheWindow = defineLevel((v) => {
  const H = v.num(12, 1); // window height above your hand, m
  const v0Ex = Math.sqrt(2 * G * H);
  const vc = { min: 5, max: 25, step: 0.05 };
  return {
    id: "2-5",
    chapter: 2,
    title: "Toss to the Window",
    hook: `Your friend leans out of a window ${f(H, 1)} m above your hand. Toss the keys straight up so they stop right at the window.`,
    goal: "Keys peak at the window (±0.25 m).",
    controls: [{ key: "v0", label: "Throw speed v₀", ...vc, value: 10, unit: "m/s" }],
    predict: {
      prompt: "At the very top, when the keys stop for an instant, their acceleration is…",
      options: ["Zero", "9.81 m/s² downward", "9.81 m/s² upward", "It switches from up to down"],
      correct: 1,
      why: "Gravity never switches off. Velocity is zero for an instant, but it's still changing by −9.81 m/s every second, so the acceleration is 9.81 m/s² downward the whole flight.",
    },
    explain: {
      prompt: "The v–t graph was one straight line through zero. What does that show?",
      options: [
        "The acceleration (the slope) is the same −9.81 m/s² going up, at the top, and coming down",
        "The keys moved at a constant speed",
        "The keys stopped accelerating at the top",
      ],
      correct: 0,
      why: "A straight v–t line means constant slope, constant acceleration. Crossing zero just means the velocity changes sign at the top.",
    },
    hints: [
      "Too high? Throw softer. Too low? Harder.",
      "At the top v = 0: 0 = v₀² − 2gH.",
      `v₀ = √(2 · 9.81 · ${f(H, 1)}) ≈ ${f(v0Ex, 2)} m/s.`,
    ],
    journal: {
      title: "Thrown straight up",
      tex: String.raw`v^2 = v_0^2 - 2g\Delta y \;\Rightarrow\; H_{max} = \frac{v_0^2}{2g},\qquad a = -g \text{ the whole time}`,
      note: "At the top: v = 0, but a = −9.81 m/s².",
    },
    view: { xMin: -9, xMax: 9, yMin: -1.5, yMax: H + 4, anchor: "bottom" },
    graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: 4, yMin: -18, yMax: 18, series: [{ label: "v", color: COLORS.velocity }] },
    solution: { v0: snap(vc, v0Ex) },
    wrong: { v0: snap(vc, Math.sqrt(G * H)) }, // forgot the 2 in v² = 2gH
    create(p) {
      const keys = new Body(0.1, new Vec2(0, 0), new Vec2(0, p.v0));
      keys.forces = [gravity()];
      const strobe = new Strobe(0.2);
      let apex: number | null = null;
      let done = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (done) return;
          strobe.record(sim.t, keys.pos);
          const vy0 = keys.vel.y,
            y0 = keys.pos.y;
          stepBodies([keys], sim.t, dt);
          sim.t += dt;
          if (apex === null && keys.vel.y <= 0) {
            // exact apex inside the step: v changes linearly with constant g
            const fr = crossFraction(vy0, keys.vel.y, 0);
            const tIn = fr * dt;
            apex = y0 + vy0 * tIn - 0.5 * G * tIn * tIn;
          }
          if (keys.pos.y <= 0 && sim.t > dt) {
            keys.pos = new Vec2(0, 0);
            done = true;
          }
        },
        isDone: () => done || sim.t > 10,
        outcome() {
          const top = apex ?? 0;
          const d = top - H;
          if (Math.abs(d) <= 0.25) return { success: true, message: `Peaked at ${f(top, 2)} m. Caught at the window!` };
          return { success: false, message: `Peaked at ${f(top, 2)} m, ${f(Math.abs(d), 2)} m ${d > 0 ? "above" : "below"} the window. ${d > 0 ? "Softer." : "Harder."}` };
        },
        draw(r, ov) {
          r.clear("#dbeafe", "#f8fafc");
          r.rect(-12, -1.5, 24, 1.5, "#a3a3a3");
          r.rect(2, -0.01, 6, H + 2.5, "#d6d3d1", "#78716c");
          for (let y = 1.5; y < H + 2; y += 3) r.rect(3, y, 1.4, 1.6, "#cbd5e1", "#64748b");
          r.rect(2.2, H - 0.8, 2, 1.6, "#fde68a", "#92400e");
          r.line(-6, H, 2, H, "#e63946", 2, [6, 4]);
          r.text("window", -6.2, H, { size: 12, bold: true, color: "#b91c1c", align: "right" });
          r.circle(3, H + 0.2, 0.35, "#fcd34d", "#92400e");
          r.vruler(0, H + 2, -3, H > 12 ? 4 : 2);
          // you
          r.rect(-0.4, -1.5, 0.8, 1.2, "#1e40af", undefined, 3);
          r.rect(-0.45, -0.3, 0.9, 0.4, "#0ea5e9", undefined, 3);
          if (ov.trail) for (const s of strobe.pts) r.circle(s.x + 0.6, s.y, 0.12, "rgba(213,94,0,.6)", undefined, 4);
          const P = keys.pos;
          r.rect(P.x - 0.2, P.y - 0.1, 0.4, 0.2, "#facc15", "#713f12", 2);
          if (ov.velocity) r.arrow(P.add(new Vec2(-0.8, 0)), keys.vel, 6, COLORS.velocity, "v");
          if (ov.forces && !done) r.arrow(P.add(new Vec2(0.8, 0)), new Vec2(0, -G), 6, COLORS.acceleration, "a = −g");
          r.hud([`t = ${f(sim.t, 2)} s`, `height ${f(P.y, 2)} m   v = ${f(keys.vel.y, 2)} m/s`]);
        },
        readouts: () => [
          { label: "Height", value: `${f(keys.pos.y, 2)} m` },
          { label: "Velocity", value: `${f(keys.vel.y, 2)} m/s` },
          { label: "Acceleration", value: `${f(-G, 2)} m/s²` },
          { label: "Highest point", value: apex === null ? "—" : `${f(apex, 2)} m` },
        ],
        equation: () => String.raw`v^2 = v_0^2 - 2g\Delta y:\quad (${n(keys.vel.y, 2)})^2 = (${n(p.v0, 2)})^2 - 2(9.81)(${n(keys.pos.y, 2)})`,
        sample: () => [keys.vel.y],
      };
      return sim;
    },
  };
});

export const chapter2 = [stopAtTheLine, twoSecondDrop, matchTheGraph, catchTheBus, tossToTheWindow];
