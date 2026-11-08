import { G } from "../physics/core";
import { COLORS } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n } from "./util";

const TAU = 2 * Math.PI;

/** Spoked wheel: center (x, y), radius r, rotated by angle (rad, CCW). */
function wheel(r: import("../render/renderer").Renderer, x: number, y: number, rad_: number, angle: number, fill: string, spokes = 6) {
  r.circle(x, y, rad_, fill, COLORS.ink);
  for (let i = 0; i < spokes; i++) {
    const a = angle + (i * TAU) / spokes;
    r.line(x, y, x + rad_ * 0.92 * Math.cos(a), y + rad_ * 0.92 * Math.sin(a), "rgba(29,36,51,.55)", 2);
  }
  // marker dot on the rim so the rotation is easy to count
  r.circle(x + rad_ * 0.8 * Math.cos(angle), y + rad_ * 0.8 * Math.sin(angle), rad_ * 0.1, "#e63946", undefined, 4);
  r.circle(x, y, rad_ * 0.08, COLORS.ink, undefined, 3);
}

/* ------------------------------------------------------------------ */
/* 10-1  Pottery Wheel   (ω² = ω0² + 2αΔθ)                              */
/* ------------------------------------------------------------------ */
const W0 = 6; // rad/s
const TARGET_REV = 3;

const potteryWheel: Level = {
  id: "10-1",
  chapter: 10,
  title: "Pottery Wheel",
  hook: "A pottery wheel spins at 6.0 rad/s. Brake it so the red handle mark stops back where it started.",
  goal: "Stop after exactly 3 turns (±0.1 turn).",
  controls: [{ key: "alpha", label: "Braking α (angular deceleration)", min: 0.2, max: 3, step: 0.05, value: 0.5, unit: "rad/s²" }],
  predict: {
    prompt: "Same brake, but the wheel starts spinning twice as fast. How many turns does it make before stopping?",
    options: ["The same number", "Twice as many", "Four times as many", "Half as many"],
    correct: 2,
    why: "Δθ = ω₀² / 2α. Just like a braking car, the starting spin rate is squared, so 2× the spin means 4× the turns.",
  },
  explain: {
    prompt: "The rotation equations look just like Chapter 2's motion equations. Why?",
    options: [
      "Angle, angular velocity and angular acceleration play the roles of x, v and a, so the same math applies",
      "Wheels move in straight lines",
      "It's a coincidence that only works for pottery wheels",
    ],
    correct: 0,
    why: "θ ↔ x, ω ↔ v, α ↔ a. With constant α, ω = ω₀ + αt and ω² = ω₀² + 2αΔθ are the linear equations with new letters.",
  },
  hints: [
    "Too many turns? Brake harder.",
    "Use ω² = ω₀² + 2αΔθ with ω = 0. 3 turns = 3 × 2π rad.",
    "α = 6² ÷ (2 · 6π) ≈ 0.95 rad/s².",
  ],
  journal: {
    title: "Rotational kinematics",
    tex: String.raw`\omega^2 = \omega_0^2 + 2\alpha\Delta\theta,\qquad 1\text{ rev} = 2\pi\text{ rad}`,
    note: "Same equations as Ch 2: θ↔x, ω↔v, α↔a.",
  },
  view: { xMin: -2.2, xMax: 2.2, yMin: -1.6, yMax: 1.6 },
  graph: { title: "Angular velocity vs. time", yLabel: "ω (rad/s)", tMax: 12, yMin: 0, yMax: 7, series: [{ label: "ω", color: COLORS.velocity }] },
  solution: { alpha: 0.95 },
  wrong: { alpha: 1.9 },
  create(p) {
    const a = p.alpha;
    let th = 0;
    let w = W0;
    let stopped = false;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (stopped) return;
        if (w - a * dt <= 0) {
          // stop exactly at ω = 0 inside this step
          const tStop = w / a;
          th += w * tStop - 0.5 * a * tStop * tStop;
          w = 0;
          sim.t += tStop;
          stopped = true;
          return;
        }
        th += w * dt - 0.5 * a * dt * dt;
        w -= a * dt;
        sim.t += dt;
      },
      isDone: () => stopped || sim.t > 60,
      outcome() {
        const rev = th / TAU;
        const diff = rev - TARGET_REV;
        if (Math.abs(diff) <= 0.1) return { success: true, message: `Stopped after ${f(rev, 2)} turns. Handle back home!` };
        return { success: false, message: `Stopped after ${f(rev, 2)} turns. ${diff > 0 ? "Brake harder." : "Brake gentler."}` };
      },
      draw(r, ov) {
        r.clear("#fef3c7", "#fffbeb");
        // table + wheel (seen from above)
        r.circle(0, 0, 1.35, "#78716c", COLORS.ink);
        wheel(r, 0, 0, 1.2, th, "#d6a86b", 8);
        // start mark
        r.line(1.25, 0, 1.55, 0, "#e63946", 3);
        r.text("start", 1.75, 0, { size: 12, bold: true, color: "#b91c1c" });
        // clay pot
        r.circle(0, 0, 0.42, "#b45309", "#7c2d12");
        r.circle(0, 0, 0.25, "#92400e");
        if (ov.trail && th > 0) {
          // orange arc = angle turned so far (a full ring once it passes one turn)
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), 1.45 * r.scale, th >= TAU ? 0 : -th, th >= TAU ? TAU : 0);
          ctx.strokeStyle = "rgba(213,94,0,.55)";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        const rim = new Vec2(0.96 * Math.cos(th), 0.96 * Math.sin(th));
        if (ov.velocity && w > 0) r.arrow(rim, new Vec2(-Math.sin(th), Math.cos(th)).scale(w * 0.96), 12, COLORS.velocity, "v_t");
        r.hud([`t = ${f(sim.t, 2)} s`, `turns = ${f(th / TAU, 2)}`, `ω = ${f(w, 2)} rad/s`]);
      },
      readouts: () => [
        { label: "Time", value: `${f(sim.t, 2)} s` },
        { label: "Angle turned Δθ", value: `${f(th, 2)} rad` },
        { label: "Turns (Δθ ÷ 2π)", value: `${f(th / TAU, 2)}` },
        { label: "Angular velocity ω", value: `${f(w, 2)} rad/s` },
      ],
      equation: () => String.raw`\omega^2 = \omega_0^2 + 2\alpha\Delta\theta:\quad (${n(w, 2)})^2 = (6)^2 - 2(${n(a, 2)})(${n(th, 2)})`,
      sample: () => [w],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 10-2  Carousel Riders   (v_t = rω, a_c = rω²)                        */
/* ------------------------------------------------------------------ */
const R_IN = 2;
const R_OUT = 6;
const TARGET_V = 3;
const SPIN_UP = 2;

const carousel: Level = {
  id: "10-2",
  chapter: 10,
  title: "Carousel Riders",
  hook: "Sam rides the inner horse (2 m from the center). Ava rides the outer horse (6 m). Ava wants a speed of exactly 3.0 m/s.",
  goal: "Ava's speed 3.0 m/s (±0.1).",
  controls: [{ key: "omega", label: "Carousel spin ω", min: 0.1, max: 1.5, step: 0.05, value: 1, unit: "rad/s" }],
  predict: {
    prompt: "Sam (2 m out) and Ava (6 m out) ride the same carousel. Compared with Sam, Ava moves…",
    options: ["At the same speed (they turn together)", "3 times faster", "3 times slower", "9 times faster"],
    correct: 1,
    why: "They share the same ω, but v = rω. Ava's circle is 3× bigger, so she covers 3× the distance in each turn.",
  },
  explain: {
    prompt: "Why do Sam and Ava have the same ω but different speeds?",
    options: [
      "Each turn takes them the same time, but Ava's circle is longer, so v = rω is larger for her",
      "Ava's horse has a stronger motor",
      "The outer part of the carousel spins at a higher ω",
    ],
    correct: 0,
    why: "ω is how fast the angle changes, and it's the same for every point on a rigid carousel. Speed along the circle is v = rω, so it grows with r.",
  },
  hints: [
    "Watch the two speed lines on the graph: they're different!",
    "Ava's speed: v = r ω with r = 6 m.",
    "ω = 3.0 ÷ 6 = 0.5 rad/s.",
  ],
  journal: {
    title: "Tangential speed",
    tex: String.raw`v_t = r\omega,\qquad a_t = r\alpha,\qquad a_c = \frac{v_t^2}{r} = r\omega^2`,
    note: "Same ω for everyone; v grows with r.",
  },
  view: { xMin: -7.5, xMax: 7.5, yMin: -7.5, yMax: 7.5 },
  graph: {
    title: "Rider speeds",
    yLabel: "v (m/s)",
    tMax: 12,
    yMin: 0,
    yMax: 6,
    series: [
      { label: "Ava (6 m)", color: COLORS.velocity },
      { label: "Sam (2 m)", color: COLORS.gravity },
    ],
    target: () => TARGET_V,
    targetLabel: "3.0 m/s",
  },
  solution: { omega: 0.5 },
  wrong: { omega: 1.5 },
  create(p) {
    const W = p.omega;
    const alpha = W / SPIN_UP; // gentle constant spin-up, then steady
    const tEnd = Math.min(12, SPIN_UP + TAU / W);
    let th = 0;
    let w = 0;
    const trailIn: Vec2[] = [];
    const trailOut: Vec2[] = [];
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= tEnd) return;
        const a = sim.t < SPIN_UP ? alpha : 0;
        th += w * dt + 0.5 * a * dt * dt;
        w = Math.min(W, w + a * dt);
        sim.t += dt;
        if (sim.t % (1 / 20) < dt) {
          trailIn.push(new Vec2(R_IN * Math.cos(th), R_IN * Math.sin(th)));
          trailOut.push(new Vec2(R_OUT * Math.cos(th), R_OUT * Math.sin(th)));
        }
      },
      isDone: () => sim.t >= tEnd - 1e-9,
      outcome() {
        const v = R_OUT * W;
        if (Math.abs(v - TARGET_V) <= 0.1) return { success: true, message: `Ava rides at ${f(v, 2)} m/s, Sam at only ${f(R_IN * W, 2)} m/s. Same ω!` };
        return { success: false, message: `Ava rides at ${f(v, 2)} m/s. ${v > TARGET_V ? "Spin slower." : "Spin faster."}` };
      },
      draw(r, ov) {
        r.clear("#e0f2fe", "#f0f9ff");
        r.circle(0, 0, 6.8, "#fde68a", COLORS.ink);
        r.circle(0, 0, 2.8, "#fca5a5", COLORS.ink);
        for (let i = 0; i < 12; i++) {
          const a = th + (i * TAU) / 12;
          r.line(0, 0, 6.8 * Math.cos(a), 6.8 * Math.sin(a), "rgba(29,36,51,.25)", 1.5);
        }
        r.circle(0, 0, 0.5, COLORS.ink);
        if (ov.trail) {
          r.path(trailIn, "rgba(0,114,178,.6)", 2.5);
          r.path(trailOut, "rgba(213,94,0,.6)", 2.5);
        }
        const u = new Vec2(Math.cos(th), Math.sin(th));
        const t = u.perp();
        const pIn = u.scale(R_IN);
        const pOut = u.scale(R_OUT);
        r.circle(pIn.x, pIn.y, 0.45, "#0072B2", COLORS.ink);
        r.text("Sam", pIn.x, pIn.y, { size: 10, color: "#fff", bold: true });
        r.circle(pOut.x, pOut.y, 0.45, "#D55E00", COLORS.ink);
        r.text("Ava", pOut.x, pOut.y, { size: 10, color: "#fff", bold: true });
        if (ov.velocity) {
          r.arrow(pIn, t.scale(R_IN * w), 25, COLORS.gravity, "v");
          r.arrow(pOut, t.scale(R_OUT * w), 25, COLORS.velocity, "v");
        }
        if (ov.forces && w > 0) r.arrow(pOut, u.scale(-R_OUT * w * w), 25, COLORS.acceleration, "a_c");
        r.hud([`t = ${f(sim.t, 1)} s   ω = ${f(w, 2)} rad/s`, `Ava ${f(R_OUT * w, 2)} m/s · Sam ${f(R_IN * w, 2)} m/s`]);
      },
      readouts: () => [
        { label: "Angular velocity ω", value: `${f(w, 2)} rad/s` },
        { label: "Ava's speed (r = 6 m)", value: `${f(R_OUT * w, 2)} m/s` },
        { label: "Sam's speed (r = 2 m)", value: `${f(R_IN * w, 2)} m/s` },
        { label: "Ava's a_c = rω²", value: `${f(R_OUT * w * w, 2)} m/s²` },
      ],
      equation: () => String.raw`v_{Ava} = r\omega = (6)(${n(w, 2)}) = ${n(R_OUT * w, 2)}\text{ m/s}`,
      sample: () => [R_OUT * w, R_IN * w],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 10-3  Rolling Race   (K = ½mv² + ½Iω², v = rω)                       */
/* ------------------------------------------------------------------ */
const RAMP_DEG = 20;
const TARGET_ROLL_V = 4;
const C_CYL = 0.5; // I = ½ m r² for a solid cylinder
const WHEEL_R = 0.25;

const rollingRace: Level = {
  id: "10-3",
  chapter: 10,
  title: "Rolling Race",
  hook: "A solid cylinder (I = ½mr²) rolls without slipping down a 20° ramp. A slippery ice block slides beside it.",
  goal: "Cylinder hits 4.0 m/s at the bottom (±0.1).",
  controls: [
    { key: "h", label: "Starting height h", min: 0.2, max: 2, step: 0.01, value: 0.5, unit: "m" },
    { key: "mass", label: "Cylinder mass", min: 1, max: 20, step: 1, value: 5, unit: "kg" },
  ],
  predict: {
    prompt: "From the same height, a heavier cylinder reaches the bottom…",
    options: ["Faster", "At the same speed", "Slower"],
    correct: 1,
    why: "Every term (mgh, ½mv², ½·½mr²·ω²) has m in it, so mass cancels. Only the shape (how I compares with mr²) matters.",
  },
  explain: {
    prompt: "Why does the ice block beat the rolling cylinder to the bottom?",
    options: [
      "Some of the cylinder's energy goes into spinning (½Iω²), leaving less for moving forward",
      "The cylinder is heavier",
      "Friction on the cylinder wastes energy as heat",
    ],
    correct: 0,
    why: "Rolling without slipping wastes no energy, but it splits it: mgh = ½mv² + ½Iω². For a cylinder a third goes into spin, so v = √(4gh/3) instead of √(2gh).",
  },
  hints: [
    "The ice block gets √(2gh). The cylinder gets less.",
    "mgh = ½mv² + ½(½mr²)(v/r)² = ¾mv².",
    "h = 3v² ÷ 4g = 3·16 ÷ 39.24 ≈ 1.22 m.",
  ],
  journal: {
    title: "Rolling energy",
    tex: String.raw`mgh = \tfrac12 mv^2 + \tfrac12 I\omega^2,\quad v = r\omega \;\Rightarrow\; v_{cyl} = \sqrt{\tfrac{4}{3}gh}`,
    note: "Spinning takes a share of the energy.",
  },
  view: { xMin: -0.6, xMax: 6.2, yMin: -0.3, yMax: 2.4, anchor: "bottom" },
  graph: {
    title: "Speed vs. time",
    yLabel: "v (m/s)",
    tMax: 2.5,
    yMin: 0,
    yMax: 5,
    series: [
      { label: "cylinder", color: COLORS.velocity },
      { label: "ice block", color: COLORS.acceleration },
    ],
    target: () => TARGET_ROLL_V,
    targetLabel: "4.0 m/s",
  },
  solution: { h: 1.22, mass: 5 },
  wrong: { h: 0.82, mass: 5 },
  create(p) {
    const th = rad(RAMP_DEG);
    const h = p.h;
    const m = p.mass;
    const L = h / Math.sin(th); // ramp length to travel
    const aCyl = (G * Math.sin(th)) / (1 + C_CYL);
    const aBlock = G * Math.sin(th);
    let sC = 0,
      vC = 0,
      sB = 0,
      vB = 0,
      spin = 0;
    let cDone = false,
      bDone = false;
    const run = (s: number, v: number, a: number, dt: number): [number, number, boolean] => {
      const s2 = s + v * dt + 0.5 * a * dt * dt;
      if (s2 >= L) {
        const vEnd = Math.sqrt(v * v + 2 * a * (L - s)); // land exactly on the bottom
        return [L, vEnd, true];
      }
      return [s2, v + a * dt, false];
    };
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (cDone) return;
        const prev = sC;
        [sC, vC, cDone] = run(sC, vC, aCyl, dt);
        spin += (sC - prev) / WHEEL_R;
        if (!bDone) [sB, vB, bDone] = run(sB, vB, aBlock, dt);
        sim.t += dt;
      },
      isDone: () => cDone,
      outcome() {
        if (Math.abs(vC - TARGET_ROLL_V) <= 0.1) return { success: true, message: `Cylinder: ${f(vC, 2)} m/s. The ice block hit ${f(vB, 2)} m/s. Spin took its share.` };
        return { success: false, message: `Cylinder hit ${f(vC, 2)} m/s. ${vC < TARGET_ROLL_V ? "Start higher." : "Start lower."}` };
      },
      draw(r, ov) {
        r.clear("#e0f2fe", "#f8fafc");
        const top = new Vec2(0, h);
        const bottom = new Vec2(h / Math.tan(th), 0);
        r.rect(-2, -0.3, 12, 0.3, "#a3a3a3");
        r.poly([[0, 0], [0, h], [bottom.x, 0]], "#d6a86b", "#7c4a1e");
        r.vruler(0, h, -0.15, h > 1 ? 0.5 : 0.25);
        r.line(bottom.x, 0, bottom.x, 0.5, "#e63946", 3);
        r.text("finish", bottom.x + 0.08, 0.45, { size: 11, bold: true, color: "#b91c1c", align: "left" });
        const down = bottom.sub(top).norm();
        const up = new Vec2(Math.sin(th), Math.cos(th)); // outward normal of the slope
        // ice block (behind) and cylinder (front)
        const pB = top.add(down.scale(sB)).add(up.scale(0.12));
        r.rotRect(pB.x, pB.y, 0.3, 0.24, -th, "rgba(86,180,233,.75)");
        r.text("ice", pB.x, pB.y, { size: 9, bold: true });
        const pC = top.add(down.scale(sC)).add(up.scale(WHEEL_R));
        wheel(r, pC.x, pC.y, WHEEL_R, -spin, "#9ca3af", 6);
        r.text(`${m} kg`, pC.x, pC.y + WHEEL_R + 0.12, { size: 10, bold: true });
        if (ov.velocity) {
          r.arrow(pC, down.scale(vC), 22, COLORS.velocity, "v");
          r.arrow(pB.add(up.scale(0.2)), down.scale(vB), 22, COLORS.acceleration, "v");
        }
        if (ov.forces) {
          const ppu = 60 / (m * G);
          r.arrow(pC, new Vec2(0, -m * G), ppu, COLORS.gravity, "mg");
          // static friction at the contact point supplies the torque for spinning: f = m·g·sinθ/3
          const fs = (m * G * Math.sin(th) * C_CYL) / (1 + C_CYL);
          r.arrow(pC.sub(up.scale(WHEEL_R)), down.scale(-fs), ppu, COLORS.friction, "f_s");
        }
        const KE = 0.5 * m * vC * vC;
        const KR = 0.5 * C_CYL * m * vC * vC;
        r.hud([`t = ${f(sim.t, 2)} s`, `KE move ${f(KE, 1)} J · KE spin ${f(KR, 1)} J`]);
      },
      readouts: () => [
        { label: "Cylinder speed v", value: `${f(vC, 2)} m/s` },
        { label: "Spin rate ω = v/r", value: `${f(vC / WHEEL_R, 1)} rad/s` },
        { label: "Ice block speed", value: `${f(vB, 2)} m/s` },
        { label: "Energy at start mgh", value: `${f(m * G * h, 1)} J` },
      ],
      equation: () => {
        const KE = 0.5 * m * vC * vC;
        const KR = 0.5 * C_CYL * m * vC * vC;
        const U = m * G * (h - sC * Math.sin(th));
        return String.raw`mgh = U + \tfrac12 mv^2 + \tfrac12 I\omega^2:\; ${n(m * G * h)} = ${n(U)} + ${n(KE)} + ${n(KR)}\text{ J}`;
      },
      sample: () => [vC, vB],
      view: () => ({ xMin: -0.7, xMax: h / Math.tan(th) + 0.9, yMin: -0.35, yMax: h + 0.55, anchor: "bottom" }),
    };
    return sim;
  },
};

export const chapter10 = [potteryWheel, carousel, rollingRace];

