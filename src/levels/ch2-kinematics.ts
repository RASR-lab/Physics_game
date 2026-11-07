import { Body, G, stepBodies, crossFraction } from "../physics/core";
import { COLORS, gravity } from "../physics/forces";
import { Vec2 } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 2-1  Stop at the Line   (v² = v0² + 2aΔx)                           */
/* ------------------------------------------------------------------ */
const STOP_LINE = 40;
const V0 = 20;

const stopAtTheLine: Level = {
  id: "2-1",
  chapter: 2,
  title: "Stop at the Line",
  hook: "You're driving at 20 m/s (about 45 mph) when you spot a crosswalk 40 m ahead. You hit the brakes right away.",
  goal: "Pick a braking deceleration so the car stops within 1.5 m before the stop line, without crossing it.",
  controls: [{ key: "decel", label: "Braking deceleration", min: 1, max: 10, step: 0.1, value: 3, unit: "m/s²" }],
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
    "Bigger deceleration means stronger brakes and a shorter stop. Too far? Brake harder.",
    "Use v² = v₀² + 2aΔx. At the end the car is stopped, so v = 0.",
    "0 = 20² − 2·a·40  →  a = 400 / 80 = 5 m/s². Anything from 5.0 to 5.1 lands in the zone.",
  ],
  journal: {
    title: "Stopping distance",
    tex: String.raw`v^2 = v_0^2 + 2a\Delta x \;\Rightarrow\; \Delta x_{stop} = \frac{v_0^2}{2a}`,
    note: "Twice the speed means four times the stopping distance.",
  },
  view: { xMin: -4, xMax: 48, yMin: -8, yMax: 6, anchor: "bottom" },
  graph: { title: "Velocity vs. time", yLabel: "v (m/s)", tMax: 8, yMin: 0, yMax: 22, series: [{ label: "v", color: COLORS.velocity }] },
  solution: { decel: 5 },
  wrong: { decel: 3 },
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
        if (gap < 0) return { success: false, message: `The car stopped ${f(-gap)} m past the stop line, in the crosswalk. Brake harder.` };
        if (gap > 1.5) return { success: false, message: `The car stopped ${f(gap)} m before the line. That's safe, but more than 1.5 m short. Brake a little more gently.` };
        return { success: true, message: `The car stopped ${f(gap, 2)} m before the line. Perfect stop!` };
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
        r.ruler(0, 45, -6.4, 5);
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

/* ------------------------------------------------------------------ */
/* 2-2  The Two-Second Drop   (Δy = ½gt²)                              */
/* ------------------------------------------------------------------ */
const TARGET_T = 2.0;

const twoSecondDrop: Level = {
  id: "2-2",
  chapter: 2,
  title: "The Two-Second Drop",
  hook: "A film crew needs a shot where a bowling ball and a tennis ball are dropped together and fall for exactly 2.0 s. The scene is on the Moon set: a vacuum chamber with Earth gravity and no air.",
  goal: "Choose the drop height so the fall lasts 2.0 s (±0.05 s).",
  controls: [{ key: "h", label: "Drop height", min: 1, max: 40, step: 0.5, value: 10, unit: "m" }],
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
    "Try 10 m first and read the time. Is it more or less than 2 s?",
    "Use Δy = ½ g t² with g = 9.81 m/s².",
    "h = ½ · 9.81 · (2.0)² = 19.6 m. Try 19.5 m.",
  ],
  journal: {
    title: "Free fall",
    tex: String.raw`\Delta y = \tfrac12 g t^2 \qquad a = \frac{F}{m} = \frac{mg}{m} = g`,
    note: "Without air, all objects fall with the same acceleration g = 9.81 m/s², whatever their mass.",
  },
  view: { xMin: -6, xMax: 6, yMin: -1, yMax: 22 },
  graph: {
    title: "Height vs. time",
    yLabel: "y (m)",
    tMax: 3,
    yMin: 0,
    yMax: 20,
    series: [
      { label: "bowling ball", color: COLORS.gravity },
      { label: "tennis ball", color: COLORS.friction },
    ],
  },
  solution: { h: 19.5 },
  wrong: { h: 10 },
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
        const both = same ? "Both balls hit the ground at the same instant" : "The balls landed";
        if (Math.abs(t - TARGET_T) <= 0.05) return { success: true, message: `${both} after ${f(t, 2)} s. That's a wrap!` };
        return {
          success: false,
          message: `${both} after ${f(t, 2)} s. The director needs 2.00 s. ${t < TARGET_T ? "Drop from higher." : "Drop from lower."}`,
        };
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

/* ------------------------------------------------------------------ */
/* 2-3  Match the Graph   (v = v0 + at)                                */
/* ------------------------------------------------------------------ */
const TV0 = 2;
const TA = 1.5;

const matchTheGraph: Level = {
  id: "2-3",
  chapter: 2,
  title: "Match the Graph",
  hook: "A self-driving car company sent you a velocity–time graph (the dashed line). Program the car so its motion matches it exactly.",
  goal: "Set the starting velocity and acceleration so your v–t line sits on the dashed target line for the full 6 s.",
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
    "Two numbers control the line: where it starts (at t = 0) and how steep it is.",
    "Read v at t = 0 from the dashed line, which gives v₀. Then find how much v grows each second, which gives a.",
    "The dashed line starts at 2 m/s and reaches 11 m/s at t = 6 s: a = (11 − 2)/6 = 1.5 m/s².",
  ],
  journal: {
    title: "Velocity and acceleration",
    tex: String.raw`v = v_0 + at \qquad a = \frac{\Delta v}{\Delta t}`,
    note: "On a v–t graph, the intercept is v₀ and the slope is a.",
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
  solution: { v0: 2, a: 1.5 },
  wrong: { v0: 0, a: 2 },
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
        if (maxErr < 0.1) return { success: true, message: "Your v–t line sits right on the target. The car's motion matches!" };
        const tips: string[] = [];
        if (Math.abs(p.v0 - TV0) > 0.01) tips.push(`your line starts at ${f(p.v0)} m/s at t = 0 (check v₀)`);
        if (Math.abs(p.a - TA) > 0.01) tips.push(`your slope is ${f(p.a, 2)} m/s per second (check a)`);
        return { success: false, message: `Not a match yet: ${tips.join(", and ")}.` };
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

export const chapter2 = [stopAtTheLine, twoSecondDrop, matchTheGraph];
