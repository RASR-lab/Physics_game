import { G } from "../physics/core";
import { COLORS } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Sim } from "./types";
import type { Renderer } from "../render/renderer";
import { ground, hillsScreen, lawn, sky, wall } from "../render/art/backdrops";
import { personTop, ramp } from "../render/art/props";
import { noisePattern } from "../render/art/core";
import { defineLevel, f, n, roundTo, snap } from "./util";

const TAU = 2 * Math.PI;

/** Spoked wheel: center (x, y), radius r, rotated by angle (rad, CCW). */
export function wheel(r: import("../render/renderer").Renderer, x: number, y: number, rad_: number, angle: number, fill: string, spokes = 6) {
  if (fill.startsWith("#")) r.circle(x, y, rad_ * 1.04, "#475569");
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
const potteryWheel = defineLevel((v) => {
  const W0 = v.num(6, 1); // rad/s
  const TARGET_REV = v.num(3, 0); // whole turns, so the handle comes back home
  const aEx = (W0 * W0) / (2 * TAU * TARGET_REV);
  const ac = { min: 0.2, max: 3, step: 0.01 };
  return {
    id: "10-1",
    chapter: 10,
    title: "Pottery Wheel",
    hook: `A pottery wheel spins at ${f(W0, 1)} rad/s. Brake it so the red handle mark stops back where it started.`,
    goal: `Stop after exactly ${TARGET_REV} turns (±0.1 turn).`,
    controls: [{ key: "alpha", label: "Braking α (angular deceleration)", ...ac, value: snap(ac, aEx * 0.55), unit: "rad/s²" }],
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
      `Use ω² = ω₀² + 2αΔθ with ω = 0. ${TARGET_REV} turns = ${TARGET_REV} × 2π rad.`,
      `α = ${f(W0, 1)}² ÷ (2 · ${TARGET_REV} · 2π) ≈ ${f(aEx, 2)} rad/s².`,
    ],
    journal: {
      title: "Rotational kinematics",
      tex: String.raw`\omega^2 = \omega_0^2 + 2\alpha\Delta\theta,\qquad 1\text{ rev} = 2\pi\text{ rad}`,
      note: "Same equations as Ch 2: θ↔x, ω↔v, α↔a.",
    },
    view: { xMin: -2.2, xMax: 2.2, yMin: -1.6, yMax: 1.6 },
    graph: { title: "Angular velocity vs. time", yLabel: "ω (rad/s)", tMax: 12, yMin: 0, yMax: Math.ceil(W0 + 1), series: [{ label: "ω", color: COLORS.velocity }] },
    solution: { alpha: snap(ac, aEx) },
    wrong: { alpha: snap(ac, aEx * 2) },
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
          // studio floor (wood planks, seen from above)
          r.ctx.fillStyle = noisePattern(r.ctx, "#c99a6b", { light: 0.04, dark: 0.06, seed: 3 });
          r.ctx.fillRect(0, 0, r.w, r.h);
          r.ctx.fillStyle = "rgba(90,55,25,.18)";
          for (let X = 0; X < r.w; X += 70) r.ctx.fillRect(X, 0, 2, r.h);
          // splash pan + wheel head
          r.circle(0.08, -0.08, 1.4, "rgba(0,0,0,.2)");
          r.circle(0, 0, 1.35, "#78716c", COLORS.ink);
          r.circle(0, 0, 1.27, "#a8a29e");
          wheel(r, 0, 0, 1.2, th, "#d6a86b", 8);
          // start mark
          r.line(1.25, 0, 1.55, 0, "#e63946", 3);
          r.text("start", 1.8, 0, { size: 12, bold: true, color: "#b91c1c", bg: "rgba(255,255,255,.9)" });
          // clay pot
          r.circle(0, 0, 0.42, "#c2703d", "#7c2d12");
          r.circle(0, 0, 0.33, "#a65a2c");
          r.circle(0, 0, 0.25, "#7c3a12");
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
        equation: () => String.raw`\omega^2 = \omega_0^2 + 2\alpha\Delta\theta:\quad (${n(w, 2)})^2 = (${n(W0)})^2 - 2(${n(a, 2)})(${n(th, 2)})`,
        sample: () => [w],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 10-2  Carousel Riders   (v_t = rω, a_c = rω²)                        */
/* ------------------------------------------------------------------ */
const carousel = defineLevel((v) => {
  const R_IN = v.num(2, 1);
  const R_OUT = v.num(6, 1);
  const TARGET_V = v.num(3, 1);
  const SPIN_UP = 2;
  const ratio = R_OUT / R_IN;
  const wEx = TARGET_V / R_OUT;
  const wc = { min: 0.1, max: 2.5, step: 0.01 };
  return {
    id: "10-2",
    chapter: 10,
    title: "Carousel Riders",
    hook: `Sam rides the inner horse (${f(R_IN, 1)} m from the center). Ava rides the outer horse (${f(R_OUT, 1)} m). Ava wants a speed of exactly ${f(TARGET_V, 1)} m/s.`,
    goal: `Ava's speed ${f(TARGET_V, 1)} m/s (±0.1).`,
    controls: [{ key: "omega", label: "Carousel spin ω", ...wc, value: snap(wc, wEx * 1.8), unit: "rad/s" }],
    predict: {
      prompt: `Sam (${f(R_IN, 1)} m out) and Ava (${f(R_OUT, 1)} m out) ride the same carousel. Compared with Sam, Ava moves…`,
      options: ["At the same speed (they turn together)", `${f(ratio, 1)} times faster`, `${f(ratio, 1)} times slower`, `${f(ratio * ratio, 1)} times faster`],
      correct: 1,
      why: `They share the same ω, but v = rω. Ava's circle is ${f(ratio, 1)}× bigger, so she covers ${f(ratio, 1)}× the distance in each turn.`,
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
      `Ava's speed: v = r ω with r = ${f(R_OUT, 1)} m.`,
      `ω = ${f(TARGET_V, 1)} ÷ ${f(R_OUT, 1)} ≈ ${f(wEx, 2)} rad/s.`,
    ],
    journal: {
      title: "Tangential speed",
      tex: String.raw`v_t = r\omega,\qquad a_t = r\alpha,\qquad a_c = \frac{v_t^2}{r} = r\omega^2`,
      note: "Same ω for everyone; v grows with r.",
    },
    view: { xMin: -R_OUT - 1.5, xMax: R_OUT + 1.5, yMin: -R_OUT - 1.5, yMax: R_OUT + 1.5 },
    graph: {
      title: "Rider speeds",
      yLabel: "v (m/s)",
      tMax: 12,
      yMin: 0,
      yMax: 6,
      series: [
        { label: `Ava (${f(R_OUT, 1)} m)`, color: COLORS.velocity },
        { label: `Sam (${f(R_IN, 1)} m)`, color: COLORS.gravity },
      ],
      target: () => TARGET_V,
      targetLabel: `${f(TARGET_V, 1)} m/s`,
    },
    solution: { omega: snap(wc, wEx) },
    wrong: { omega: snap(wc, TARGET_V / R_IN) }, // gave the inner horse the speed
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
          lawn(r);
          r.circle(0, 0, R_OUT + 2.2, "#e7e1d6", "#b8b0a3");
          r.circle(0.25, -0.25, R_OUT + 0.9, "rgba(0,0,0,.18)");
          // striped platform (rotates with the ride)
          const ctx = r.ctx;
          for (let i = 0; i < 12; i++) {
            const a0 = th + (i * TAU) / 12,
              a1 = a0 + TAU / 12;
            ctx.beginPath();
            ctx.moveTo(r.sx(0), r.sy(0));
            ctx.arc(r.sx(0), r.sy(0), (R_OUT + 0.8) * r.scale, -a1, -a0);
            ctx.closePath();
            ctx.fillStyle = i % 2 ? "#fde68a" : "#fca5a5";
            ctx.fill();
          }
          r.circle(0, 0, R_OUT + 0.8, "rgba(0,0,0,0)", "#b45309");
          r.circle(0, 0, R_IN + 0.8, "#93c5fd", COLORS.ink);
          for (let i = 0; i < 12; i++) {
            const a = th + (i * TAU) / 12;
            r.line(0, 0, (R_OUT + 0.8) * Math.cos(a), (R_OUT + 0.8) * Math.sin(a), "rgba(120,53,15,.35)", 1.5);
          }
          r.circle(0, 0, 0.5, "#334155");
          if (ov.trail) {
            r.path(trailIn, "rgba(0,114,178,.6)", 2.5);
            r.path(trailOut, "rgba(213,94,0,.6)", 2.5);
          }
          const u = new Vec2(Math.cos(th), Math.sin(th));
          const t = u.perp();
          const pIn = u.scale(R_IN);
          const pOut = u.scale(R_OUT);
          personTop(r, pIn.x, pIn.y, 1.5, th, "#0072B2");
          r.text("Sam", pIn.x - t.x * 1.1, pIn.y - t.y * 1.1, { size: 10, color: "#fff", bold: true, bg: "#0072B2" });
          personTop(r, pOut.x, pOut.y, 1.5, th, "#D55E00");
          r.text("Ava", pOut.x - t.x * 1.1, pOut.y - t.y * 1.1, { size: 10, color: "#fff", bold: true, bg: "#D55E00" });
          if (ov.velocity) {
            r.arrow(pIn, t.scale(R_IN * w), 25, COLORS.gravity, "v");
            r.arrow(pOut, t.scale(R_OUT * w), 25, COLORS.velocity, "v");
          }
          if (ov.forces && w > 0) r.arrow(pOut, u.scale(-R_OUT * w * w), 25, COLORS.acceleration, "a_c");
          r.hud([`t = ${f(sim.t, 1)} s   ω = ${f(w, 2)} rad/s`, `Ava ${f(R_OUT * w, 2)} m/s · Sam ${f(R_IN * w, 2)} m/s`]);
        },
        readouts: () => [
          { label: "Angular velocity ω", value: `${f(w, 2)} rad/s` },
          { label: `Ava's speed (r = ${f(R_OUT, 1)} m)`, value: `${f(R_OUT * w, 2)} m/s` },
          { label: `Sam's speed (r = ${f(R_IN, 1)} m)`, value: `${f(R_IN * w, 2)} m/s` },
          { label: "Ava's a_c = rω²", value: `${f(R_OUT * w * w, 2)} m/s²` },
        ],
        equation: () => String.raw`v_{Ava} = r\omega = (${n(R_OUT)})(${n(w, 2)}) = ${n(R_OUT * w, 2)}\text{ m/s}`,
        sample: () => [R_OUT * w, R_IN * w],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 10-3  Rolling Race   (K = ½mv² + ½Iω², v = rω)                       */
/* ------------------------------------------------------------------ */
const rollingRace = defineLevel((v) => {
  const RAMP_DEG = v.num(20, 0);
  const TARGET_ROLL_V = v.num(4, 1);
  const C_CYL = 0.5; // I = ½ m r² for a solid cylinder
  const WHEEL_R = 0.25;
  const hEx = (3 * TARGET_ROLL_V * TARGET_ROLL_V) / (4 * G);
  const hc = { min: 0.2, max: 2, step: 0.01 };
  return {
    id: "10-3",
    chapter: 10,
    title: "Rolling Race",
    hook: `A solid cylinder (I = ½mr²) rolls without slipping down a ${RAMP_DEG}° ramp. A slippery ice block slides beside it.`,
    goal: `Cylinder hits ${f(TARGET_ROLL_V, 1)} m/s at the bottom (±0.1).`,
    controls: [
      { key: "h", label: "Starting height h", ...hc, value: 0.5, unit: "m" },
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
      `h = 3v² ÷ 4g = 3·${f(TARGET_ROLL_V, 1)}² ÷ 39.24 ≈ ${f(hEx, 2)} m.`,
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
      targetLabel: `${f(TARGET_ROLL_V, 1)} m/s`,
    },
    solution: { h: snap(hc, hEx), mass: 5 },
    wrong: { h: snap(hc, (TARGET_ROLL_V * TARGET_ROLL_V) / (2 * G)), mass: 5 }, // forgot the spinning energy
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
          sky(r, r.sy(0), "day");
          hillsScreen(r, r.sy(0), Math.min(r.h * 0.2, r.sy(0) * 0.4));
          ground(r, 0, "grass");
          const top = new Vec2(0, h);
          const bottom = new Vec2(h / Math.tan(th), 0);
          ramp(r, [
            [0, 0],
            [0, h],
            [bottom.x, 0],
          ]);
          r.vruler(0, h, -0.15, h > 1 ? 0.5 : 0.25, "m", "#334155");
          r.line(bottom.x, 0, bottom.x, 0.5, "#e63946", 3);
          r.text("finish", bottom.x + 0.1, 0.45, { size: 11, bold: true, color: "#b91c1c", align: "left", bg: "rgba(255,255,255,.9)" });
          const down = bottom.sub(top).norm();
          const up = new Vec2(Math.sin(th), Math.cos(th)); // outward normal of the slope
          // ice block (behind) and cylinder (front)
          const pB = top.add(down.scale(sB)).add(up.scale(0.12));
          r.rotRect(pB.x, pB.y, 0.3, 0.24, -th, "rgba(186,230,253,.85)", "#38bdf8");
          r.text("ice", pB.x, pB.y, { size: 9, bold: true, color: "#0c4a6e" });
          const pC = top.add(down.scale(sC)).add(up.scale(WHEEL_R));
          wheel(r, pC.x, pC.y, WHEEL_R, -spin, "#9ca3af", 6);
          r.text(`${m} kg`, pC.x, pC.y + WHEEL_R + 0.14, { size: 10, bold: true, bg: "rgba(255,255,255,.9)" });
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
});

/* ------------------------------------------------------------------ */
/* 10-4  Keep Up with Mom   (rolling wheel: v = rω)                    */
/* ------------------------------------------------------------------ */

/** Thick round-capped line in world coords, `w` in meters (for limbs). */
function limb(r: Renderer, a: Vec2, b: Vec2, color: string, w: number) {
  const c = r.ctx;
  c.save();
  c.lineCap = "round";
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, w * r.scale);
  c.beginPath();
  c.moveTo(r.sx(a.x), r.sy(a.y));
  c.lineTo(r.sx(b.x), r.sy(b.y));
  c.stroke();
  c.restore();
}

/**
 * Side-view bike and rider, everything scaled by the wheel radius R.
 * The bike's center (crank) is at x; the road is at y0; th = angle the wheels have rolled (rad).
 * The front tyre carries a red paint dot that starts at the bottom, so it touches the road once per turn.
 */
function bikeRider(r: Renderer, x: number, y0: number, R: number, th: number, frame: string, shirt: string, name: string) {
  const P = (u: number, w: number) => new Vec2(x + u * R, y0 + w * R);
  const rear = P(-1.6, 1),
    front = P(1.6, 1),
    crank = P(0, 1),
    seatTube = P(-0.29, 2.2),
    head = P(1.03, 2.2),
    hip = P(-0.38, 2.68),
    hand = P(1.15, 2.72);
  const spin = -th - Math.PI / 2; // clockwise when riding right; marker starts at the bottom
  const pedal = th / 2.2; // pedals turn a bit slower than the wheels (just for looks)
  const pants = "#334155",
    skin = "#f1c27d";
  const leg = (sign: number, color: string) => {
    const foot = crank.add(new Vec2(Math.cos(-pedal + (sign < 0 ? Math.PI : 0)), Math.sin(-pedal + (sign < 0 ? Math.PI : 0))).scale(0.45 * R));
    const d = foot.sub(hip);
    const L = 1.17 * R;
    const len = Math.hypot(d.x, d.y);
    const k = Math.sqrt(Math.max(0, L * L - (len * len) / 4));
    const knee = hip.add(d.scale(0.5)).add(new Vec2(-d.y, d.x).scale(k / len));
    limb(r, hip, knee, color, 0.24 * R);
    limb(r, knee, foot, color, 0.2 * R);
    r.circle(foot.x + 0.08 * R, foot.y, 0.12 * R, "#1f2937");
  };
  for (const w of [rear, front]) {
    wheel(r, w.x, w.y, R, spin, "rgba(255,255,255,.4)", 12);
    r.ctx.beginPath();
    r.ctx.arc(r.sx(w.x), r.sy(w.y), R * r.scale * 0.97, 0, TAU);
    r.ctx.strokeStyle = "#1f2937";
    r.ctx.lineWidth = Math.max(3, R * r.scale * 0.09);
    r.ctx.stroke();
  }
  r.circle(front.x + 0.97 * R * Math.cos(spin), front.y + 0.97 * R * Math.sin(spin), 0.09 * R, "#e63946", undefined, 4);
  leg(-1, "#1e293b"); // far leg, behind the frame
  for (const [a, b] of [
    [rear, crank],
    [crank, head],
    [rear, seatTube],
    [seatTube, head],
    [head, front],
  ])
    r.line(a.x, a.y, b.x, b.y, frame, Math.max(3, 0.13 * R * r.scale));
  r.line(seatTube.x, seatTube.y, hip.x + 0.03 * R, hip.y - 0.1 * R, "#1f2937", 3);
  r.rect(hip.x - 0.32 * R, hip.y - 0.12 * R, 0.62 * R, 0.13 * R, "#1f2937", undefined, 3);
  r.line(head.x, head.y, hand.x - 0.1 * R, hand.y, "#475569", 3);
  r.circle(crank.x, crank.y, 0.28 * R, "#e5e7eb", COLORS.ink);
  leg(1, pants); // near leg
  const shoulder = hip.add(new Vec2(0.8 * R, 1.55 * R));
  limb(r, hip, shoulder, shirt, 0.62 * R);
  limb(r, shoulder, hand, shirt, 0.22 * R);
  r.circle(hand.x, hand.y, 0.12 * R, skin);
  const headC = shoulder.add(new Vec2(0.32 * R, 0.7 * R));
  r.circle(headC.x, headC.y, 0.42 * R, skin);
  r.circle(headC.x - 0.05 * R, headC.y + 0.14 * R, 0.38 * R, "#4a3426"); // hair
  r.circle(headC.x + 0.24 * R, headC.y - 0.02 * R, 0.055 * R, "#1f2937");
  // name tag a fixed number of pixels above the head, so it never covers the rider on small screens
  r.textPx(name, r.sx(headC.x), r.sy(headC.y + 0.42 * R) - 14, { size: 11, bold: true, color: "#fff", bg: shirt });
  return { nose: front.add(new Vec2(1.15 * R, 0)) };
}

const keepUp = defineLevel((v) => {
  const R_MOM = 0.34; // Mom's wheel radius, m
  const V = v.num(4, 1); // Mom's speed, m/s
  const R_TRUE = v.num(0.25, 3); // the wheel size that works
  const W = roundTo(V / R_TRUE, 1); // Leo's wheel spin, rad/s
  const rEx = V / W;
  const wMom = V / R_MOM;
  const rc = { min: 0.1, max: 0.45, step: 0.005 };
  const T_END = 6;
  const Y_MOM = 2; // Mom's lane (back), Leo's lane is at y = 0
  const OFF = 0.7; // Mom is drawn a little right of center, clear of the readouts
  return {
    id: "10-4",
    chapter: 10,
    title: "Keep Up with Mom",
    hook: `Leo rides next to his mom on the bike path. Mom cruises at ${f(V, 1)} m/s. Leo pedals so his wheels spin at ${f(W, 1)} rad/s. What size wheels does Leo's bike need to keep up?`,
    goal: `Ride beside Mom: Leo's speed ${f(V, 1)} m/s (±0.1).`,
    controls: [{ key: "r", label: "Leo's wheel radius r", ...rc, value: snap(rc, R_MOM), unit: "m" }],
    predict: {
      prompt: "Leo's wheels are smaller than Mom's. When they ride side by side at the same speed, whose wheels spin faster?",
      options: ["Leo's (smaller wheels)", "Mom's (bigger wheels)", "Neither: the same speed means the same spin"],
      correct: 0,
      why: `Each turn rolls one rim length (2πr) of road. A smaller wheel covers less road per turn, so it has to turn more often: ω = v ÷ r. At ${f(V, 1)} m/s, Mom's ${R_MOM} m wheels spin at only ${f(wMom, 1)} rad/s.`,
    },
    explain: {
      prompt: "Why is a rolling wheel's speed v = rω?",
      options: [
        "Each turn rolls out one circumference (2πr) of road, so each radian of turning moves the bike r meters",
        "Bigger wheels are heavier, so they keep rolling farther",
        "The road pushes harder on bigger wheels",
      ],
      correct: 0,
      why: "With no slipping, the tyre lays its rim onto the road: one turn (2π rad) covers 2πr, so 1 rad covers r meters. Turning ω radians each second moves the bike rω meters each second. That's v_cm = rω on your sheet.",
    },
    hints: [
      "Leo falling behind? Bigger wheels. Pulling ahead? Smaller wheels.",
      `Rolling wheel: v = rω. You know v (Mom's ${f(V, 1)} m/s) and Leo's ω (${f(W, 1)} rad/s). Solve for r.`,
      `r = v ÷ ω = ${f(V, 1)} ÷ ${f(W, 1)} ≈ ${f(rEx, 3)} m.`,
    ],
    journal: {
      title: "Rolling wheels",
      tex: String.raw`v_{cm} = r\omega\;\;(\text{no slipping}),\qquad 1\text{ turn} \to 2\pi r\text{ of road}`,
      note: "Smaller wheels must spin faster to keep up.",
    },
    view: { xMin: -3.4, xMax: 3.4, yMin: -0.45, yMax: 4.05, anchor: "bottom" },
    graph: {
      title: "Speed vs. time",
      yLabel: "v (m/s)",
      tMax: T_END,
      yMin: 0,
      yMax: Math.ceil(rc.max * W) + 1,
      series: [{ label: "Leo", color: COLORS.velocity }],
      target: () => V,
      targetLabel: "Mom",
    },
    solution: { r: snap(rc, rEx) },
    wrong: { r: snap(rc, rEx * 0.6) },
    create(p) {
      const R = p.r;
      const vL = R * W;
      let xM = 0,
        xL = 0;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          xM += V * dt;
          xL += vL * dt;
          sim.t += dt;
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const d = vL - V;
          const gap = xL - xM;
          if (Math.abs(d) <= 0.1) return { success: true, message: `Side by side! Leo rides at ${f(vL, 2)} m/s on ${f(R, 3)} m wheels.` };
          return {
            success: false,
            message: `Leo rides at ${f(vL, 2)} m/s and ends ${f(Math.abs(gap), 1)} m ${gap < 0 ? "behind" : "ahead"}. ${d < 0 ? "Bigger wheels." : "Smaller wheels."}`,
          };
        },
        draw(r, ov) {
          const cam = xM - OFF; // the camera rides along with Mom
          const vis = r.visible();
          sky(r, r.sy(Y_MOM), "day");
          hillsScreen(r, r.sy(Y_MOM), Math.min(r.h * 0.25, r.sy(Y_MOM) * 0.45));
          ground(r, Y_MOM, "grass");
          r.rect(vis.xMin - 1, Y_MOM - 0.3, vis.xMax - vis.xMin + 2, 0.3, "#5a6170");
          ground(r, 0, "asphalt");
          // lane dashes are fixed to the road, so they slide back as the riders move
          for (let k = Math.floor((cam + vis.xMin) / 1.2) - 1; k <= Math.ceil((cam + vis.xMax) / 1.2); k++) {
            const xs = k * 1.2 - cam;
            r.rect(xs, Y_MOM - 0.17, 0.45, 0.04, "#fad65c");
            r.rect(xs, -0.24, 0.45, 0.05, "#fad65c");
          }
          const lanes = [
            { y0: Y_MOM, R: R_MOM, x: xM, v: V, name: "Mom", frame: "#0072B2", shirt: "#CC79A7" },
            { y0: 0, R, x: xL, v: vL, name: "Leo", frame: "#D55E00", shirt: "#009E73" },
          ];
          for (const ln of lanes) {
            const gap = ln.x - cam;
            const shown = Math.max(vis.xMin + 1.8 * ln.R, Math.min(vis.xMax - 1.8 * ln.R, gap));
            if (ov.trail) {
              // paint marks: one every turn of the front wheel (2πr apart)
              const per = TAU * ln.R;
              const start = 1.6 * ln.R; // where the front wheel touched the road at t = 0
              const turns = Math.floor(ln.x / per + 1e-9);
              for (let k = 0; k <= turns; k++) {
                const xs = start + k * per - cam + (shown - gap);
                if (xs < vis.xMin - 0.5 || xs > vis.xMax + 0.5) continue;
                r.rect(xs - 0.025, ln.y0 - 0.07, 0.05, 0.07, "#e63946");
              }
              if (turns >= 1) {
                const a = start + (turns - 1) * per - cam + (shown - gap),
                  b = a + per;
                const yb = ln.y0 - (ln.y0 > 0 ? 0.24 : 0.36);
                r.line(a, yb, b, yb, "#fee2e2", 1.5);
                r.line(a, yb - 0.05, a, yb + 0.05, "#fee2e2", 1.5);
                r.line(b, yb - 0.05, b, yb + 0.05, "#fee2e2", 1.5);
                r.text(`1 turn = 2πr = ${f(per, 2)} m`, (a + b) / 2, yb - 0.1, { size: 10, bold: true, color: "#7f1d1d", bg: "rgba(255,255,255,.85)" });
              }
            }
            const lead = ln.x - xM;
            const tag = ln.name === "Leo" && Math.abs(lead) > 0.3 ? `Leo · ${f(Math.abs(lead), 1)} m ${lead < 0 ? "behind ◀" : "ahead ▶"}` : ln.name;
            const b = bikeRider(r, shown, ln.y0, ln.R, ln.x / ln.R, ln.frame, ln.shirt, tag);
            if (ov.velocity) r.arrow(b.nose, new Vec2(ln.v, 0), 0.1 * r.scale, COLORS.velocity, "v");
          }
          r.hud([`t = ${f(sim.t, 1)} s`, `Leo ${f(vL, 2)} m/s · Mom ${f(V, 1)} m/s`]);
        },
        readouts: () => [
          { label: "Leo's wheel spin ω", value: `${f(W, 1)} rad/s` },
          { label: "Leo's road per turn 2πr", value: `${f(TAU * R, 2)} m` },
          { label: "Leo's speed v = rω", value: `${f(vL, 2)} m/s` },
          { label: "Mom's speed", value: `${f(V, 1)} m/s` },
        ],
        equation: () => String.raw`v = r\omega = (${n(R, 3)})(${n(W, 1)}) = ${n(vL, 2)}\text{ m/s}`,
        sample: () => [vL],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 10-5  Centrifuge   (a_c = rω², rpm ↔ rad/s)                          */
/* ------------------------------------------------------------------ */
const centrifuge = defineLevel((v) => {
  const R_CM = v.num(10, 0); // tube distance from the axis, cm
  const GT = v.num(1000, -1); // target in "g"
  const r0 = R_CM / 100;
  const wEx = Math.sqrt((GT * G) / r0);
  const rpmEx = (wEx * 60) / TAU;
  const rc = { min: 500, max: 6000, step: 10 };
  const SPIN_UP = 2;
  const T_END = 4;
  return {
    id: "10-5",
    chapter: 10,
    title: "Centrifuge",
    hook: `A lab centrifuge holds blood samples ${R_CM} cm from its axis. To separate the cells, the samples need an acceleration of ${GT} g (${GT} × 9.81 m/s²).`,
    goal: `Reach ${GT} g (±3%).`,
    controls: [{ key: "rpm", label: "Spin rate", ...rc, value: 1000, unit: "rpm" }],
    predict: {
      prompt: "You double the spin rate (rpm). The samples' acceleration becomes…",
      options: ["Twice as big", "Four times as big", "The same", "Half as big"],
      correct: 1,
      why: "a_c = rω². Acceleration grows with the square of the spin rate, so 2× the rpm gives 4× the acceleration.",
    },
    explain: {
      prompt: "Why do the heavy cells end up at the bottom (outer end) of each tube?",
      options: [
        "The tube must push the sample inward to keep it circling; the sample's inertia makes it press outward and settle there",
        "A centrifugal force pulls everything outward",
        "Gravity gets stronger inside a centrifuge",
      ],
      correct: 0,
      why: "Left alone, the sample would fly off in a straight line (Newton's 1st law). The tube bottom supplies the inward force, so material piles up against it.",
    },
    hints: [
      "Convert the target to m/s² first: a = (g-number) × 9.81.",
      "a = rω² → ω = √(a/r). Then rpm = ω × 60 ÷ 2π.",
      `ω = √(${GT}·9.81 ÷ ${f(r0, 2)}) ≈ ${f(wEx, 0)} rad/s ≈ ${f(rpmEx, 0)} rpm.`,
    ],
    journal: {
      title: "Centripetal acceleration",
      tex: String.raw`a_c = \frac{v_t^2}{r} = r\omega^2,\qquad \omega = 2\pi f = \frac{2\pi\cdot\text{rpm}}{60}`,
      note: "2× the spin → 4× the acceleration.",
    },
    view: { xMin: -0.2, xMax: 0.2, yMin: -0.17, yMax: 0.17 },
    graph: { title: "Sample acceleration", yLabel: "a (g)", tMax: T_END, yMin: 0, yMax: Math.ceil((GT * 1.5) / 100) * 100, series: [{ label: "a_c in g", color: COLORS.acceleration }], target: () => GT, targetLabel: "target" },
    solution: { rpm: snap(rc, rpmEx) },
    wrong: { rpm: snap(rc, rpmEx * 2) },
    create(p) {
      const W = (p.rpm * TAU) / 60;
      const alpha = W / SPIN_UP;
      let th = 0,
        w = 0;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          const a = sim.t < SPIN_UP ? alpha : 0;
          th += w * dt + 0.5 * a * dt * dt;
          w = Math.min(W, w + a * dt);
          sim.t += dt;
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const gs = (r0 * W * W) / G;
          const err = (gs - GT) / GT;
          if (Math.abs(err) <= 0.03) return { success: true, message: `${f(gs, 0)} g at ${p.rpm} rpm. Samples separated!` };
          return { success: false, message: `${f(gs, 0)} g. ${err > 0 ? "Too fast: you'd crack the tubes." : "Not enough to separate. Spin faster."}` };
        },
        draw(r, ov) {
          wall(r, "#e2e8f0", "tile");
          // bench-top centrifuge: steel housing around the rotor
          r.circle(0.004, -0.004, r0 + 0.07, "rgba(0,0,0,.18)");
          r.circle(0, 0, r0 + 0.065, "#94a3b8", COLORS.ink);
          r.circle(0, 0, r0 + 0.045, "#e2e8f0", COLORS.ink);
          const shown = th / 100; // drawn 100× slower so the motion is visible
          for (let i = 0; i < 4; i++) {
            const a = shown + (i * Math.PI) / 2;
            const u = new Vec2(Math.cos(a), Math.sin(a));
            const c = u.scale(r0 - 0.015);
            r.rotRect(c.x, c.y, 0.06, 0.018, a, "#fca5a5");
            const bottom = u.scale(r0 + 0.012);
            r.circle(bottom.x, bottom.y, 0.008, "#7f1d1d", undefined, 3);
            if (i === 0) {
              if (ov.forces && w > 0) r.arrow(u.scale(r0), u.scale(-1), 40, COLORS.acceleration, "a_c");
              if (ov.velocity && w > 0) r.arrow(u.scale(r0), u.perp(), 40, COLORS.velocity, "v");
            }
          }
          r.circle(0, 0, 0.02, "#475569", COLORS.ink);
          r.line(0, 0, r0, 0, "#111827", 1, [3, 3]);
          r.text(`r = ${R_CM} cm`, r0 / 2, -0.015, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
          if (ov.trail && w > 0) {
            const ctx = r.ctx;
            ctx.beginPath();
            ctx.arc(r.sx(0), r.sy(0), r0 * r.scale, 0, TAU);
            ctx.strokeStyle = `rgba(213,94,0,${Math.min(0.6, w / W)})`;
            ctx.lineWidth = 6;
            ctx.stroke();
          }
          r.hud([`${f((w * 60) / TAU, 0)} rpm  (drawn 100× slower)`, `a_c = ${f((r0 * w * w) / G, 0)} g`]);
        },
        readouts: () => [
          { label: "Spin rate", value: `${f((w * 60) / TAU, 0)} rpm` },
          { label: "ω", value: `${f(w, 1)} rad/s` },
          { label: "a_c = rω²", value: `${f(r0 * w * w, 0)} m/s²` },
          { label: "In g's", value: `${f((r0 * w * w) / G, 0)} g` },
        ],
        equation: () => String.raw`a_c = r\omega^2 = (${n(r0, 2)})(${n(w, 1)})^2 = ${n(r0 * w * w, 0)}\ \tfrac{m}{s^2} = ${n((r0 * w * w) / G, 0)}\,g`,
        sample: () => [(r0 * w * w) / G],
      };
      return sim;
    },
  };
});

export const chapter10 = [potteryWheel, carousel, rollingRace, keepUp, centrifuge];

