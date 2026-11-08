import { G } from "../physics/core";
import { COLORS } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n } from "./util";

const TAU = 2 * Math.PI;

/* ------------------------------------------------------------------ */
/* 11-1  Seesaw Balance   (τ = rF, Στ = 0)                             */
/* ------------------------------------------------------------------ */
const KID_M = 30;
const KID_R = 2;
const PARENT_M = 75;
const PLANK_HALF = 2.5;
const PLANK_M = 20;
const PIVOT_H = 0.55;
const MAX_TILT = Math.asin(PIVOT_H / PLANK_HALF);

const seesaw: Level = {
  id: "11-1",
  chapter: 11,
  title: "Seesaw Balance",
  hook: "A 30 kg kid sits 2.0 m left of the pivot. Where should their 75 kg parent sit so the seesaw balances?",
  goal: "Plank stays level (zero net torque).",
  controls: [{ key: "d", label: "Parent's distance from pivot", min: 0.2, max: 2.5, step: 0.05, value: 1.5, unit: "m" }],
  predict: {
    prompt: "The parent is 2.5 times heavier than the kid. To balance, the parent should sit…",
    options: ["The same distance out (2.0 m)", "2.5 times closer to the pivot", "2.5 times farther out", "Right on the pivot"],
    correct: 1,
    why: "Balance means equal torques: m₁gr₁ = m₂gr₂. If the weight is 2.5× bigger, the lever arm must be 2.5× smaller.",
  },
  explain: {
    prompt: "Why can a light kid balance a heavy parent?",
    options: [
      "Torque is force × lever arm, so a small force far out can match a big force close in",
      "The plank pushes harder on lighter people",
      "Only the weights matter, so it can't really balance",
    ],
    correct: 0,
    why: "τ = rF. The kid's small weight has a long lever arm; the parent's big weight has a short one. Equal products → no rotation.",
  },
  hints: [
    "Heavier person → closer to the pivot.",
    "Balance: m_kid · g · 2.0 = m_parent · g · d.",
    "d = 30 · 2.0 ÷ 75 = 0.80 m.",
  ],
  journal: {
    title: "Torque & balance",
    tex: String.raw`\tau = rF_\perp = rF\sin\theta,\qquad \text{balance: } \sum\tau = 0`,
    note: "Force × lever arm, not force alone.",
  },
  view: { xMin: -3.2, xMax: 3.2, yMin: -0.2, yMax: 2.6, anchor: "bottom" },
  graph: { title: "Tilt vs. time", yLabel: "tilt (°)", tMax: 3, yMin: -12, yMax: 12, series: [{ label: "tilt", color: COLORS.applied }] },
  solution: { d: 0.8 },
  wrong: { d: 2 },
  create(p) {
    const d = p.d;
    const I = KID_M * KID_R * KID_R + PARENT_M * d * d + (PLANK_M * (2 * PLANK_HALF) ** 2) / 12;
    // φ > 0 means the left (kid's) side goes down
    let phi = 0;
    let w = 0;
    let landed = false;
    const tauKid = () => KID_M * G * KID_R * Math.cos(phi);
    const tauParent = () => PARENT_M * G * d * Math.cos(phi);
    const T_END = 3;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= T_END) return;
        sim.t += dt;
        if (landed) return;
        const a = (tauKid() - tauParent()) / I; // Στ = Iα
        phi += w * dt + 0.5 * a * dt * dt;
        w += a * dt;
        if (Math.abs(phi) >= MAX_TILT) {
          phi = Math.sign(phi) * MAX_TILT;
          w = 0;
          landed = true;
        }
      },
      isDone: () => sim.t >= T_END - 1e-9,
      outcome() {
        const net = KID_M * G * KID_R - PARENT_M * G * d;
        if (Math.abs(net) < 1e-6) return { success: true, message: "Perfectly level! Both torques are 589 N·m." };
        return {
          success: false,
          message: `${net > 0 ? "Kid's side went down" : "Parent's side went down"}: net torque ${f(Math.abs(net), 0)} N·m. ${net > 0 ? "Move the parent farther out." : "Move the parent closer in."}`,
        };
      },
      draw(r, ov) {
        r.clear("#dcfce7", "#f0fdf4");
        r.rect(-5, -0.2, 10, 0.2, "#65a30d");
        r.poly([[-0.3, 0], [0.3, 0], [0, PIVOT_H]], "#78716c", COLORS.ink);
        const piv = new Vec2(0, PIVOT_H);
        const along = new Vec2(Math.cos(phi), -Math.sin(phi)); // toward the right end
        const up = new Vec2(Math.sin(phi), Math.cos(phi));
        r.rotRect(piv.x, piv.y + 0.06, 2 * PLANK_HALF, 0.12, -phi, "#d6a86b");
        // distance marks along the plank
        for (let x = -2.5; x <= 2.5001; x += 0.5) {
          const q = piv.add(along.scale(x)).add(up.scale(0.12));
          r.circle(q.x, q.y, 0.025, "#7c4a1e", undefined, 2);
        }
        const kidAt = piv.add(along.scale(-KID_R)).add(up.scale(0.4));
        const parAt = piv.add(along.scale(d)).add(up.scale(0.55));
        r.circle(kidAt.x, kidAt.y, 0.28, "#0072B2", COLORS.ink);
        r.text("30 kg", kidAt.x, kidAt.y, { size: 10, color: "#fff", bold: true });
        r.circle(parAt.x, parAt.y, 0.42, "#CC79A7", COLORS.ink);
        r.text("75 kg", parAt.x, parAt.y, { size: 11, color: "#fff", bold: true });
        r.text(`${f(KID_R, 2)} m`, -KID_R / 2, PIVOT_H - 0.25, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
        r.text(`${f(d, 2)} m`, d / 2, PIVOT_H - 0.25, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
        if (ov.forces) {
          const ppu = 0.11;
          r.arrow(piv.add(along.scale(-KID_R)), new Vec2(0, -KID_M * G), ppu, COLORS.gravity, "m₁g");
          r.arrow(piv.add(along.scale(d)), new Vec2(0, -PARENT_M * G), ppu, COLORS.gravity, "m₂g");
          r.arrow(piv, new Vec2(0, (KID_M + PARENT_M + PLANK_M) * G), ppu * 0.5, COLORS.normal, "F_pivot");
        }
        r.hud([`τ kid = ${f(tauKid(), 0)} N·m (↺)`, `τ parent = ${f(tauParent(), 0)} N·m (↻)`]);
      },
      readouts: () => [
        { label: "Kid's torque m₁g·r₁", value: `${f(KID_M * G * KID_R, 1)} N·m` },
        { label: "Parent's torque m₂g·r₂", value: `${f(PARENT_M * G * d, 1)} N·m` },
        { label: "Net torque", value: `${f(KID_M * G * KID_R - PARENT_M * G * d, 1)} N·m` },
        { label: "Tilt", value: `${f((phi * 180) / Math.PI, 1)}°` },
      ],
      equation: () => String.raw`\sum\tau = (30)(9.81)(2.0) - (75)(9.81)(${n(d, 2)}) = ${n(KID_M * G * KID_R - PARENT_M * G * d, 1)}\text{ N·m}`,
      sample: () => [(phi * 180) / Math.PI],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 11-2  Rusty Bolt   (τ = rF sin θ)                                   */
/* ------------------------------------------------------------------ */
const PUSH = 200; // N, the most you can push
const STUCK = 60; // N·m needed to break the bolt free
const KINETIC_T = 30; // N·m of friction once it's turning
const WRENCH_I = 0.4; // kg·m² (wrench + your hand + bolt)
const HANDLE = 0.42;

const rustyBolt: Level = {
  id: "11-2",
  chapter: 11,
  title: "Rusty Bolt",
  hook: "A rusted wheel bolt needs 60 N·m of torque to break free. You can push with 200 N, no more.",
  goal: "Break the bolt loose (τ ≥ 60 N·m).",
  controls: [
    { key: "r", label: "Grip distance from bolt r", min: 0.05, max: 0.4, step: 0.01, value: 0.15, unit: "m" },
    { key: "angle", label: "Push angle θ (from the handle)", min: 0, max: 90, step: 5, value: 30, unit: "°" },
  ],
  predict: {
    prompt: "You push with the full 200 N, but straight along the handle toward the bolt (θ = 0°). The torque is…",
    options: ["The biggest possible", "Half the biggest", "Zero", "It depends on how long the wrench is"],
    correct: 2,
    why: "τ = rF sin θ, and sin 0° = 0. A push along the handle points right at the bolt, so it has no lever arm and can't twist it.",
  },
  explain: {
    prompt: "What two things make a push twist the bolt harder?",
    options: [
      "Grip farther out (bigger r) and push more perpendicular to the handle (θ near 90°)",
      "Grip closer to the bolt and push along the handle",
      "Only the size of the force matters",
    ],
    correct: 0,
    why: "Only the part of the force perpendicular to the handle (F sin θ) twists, and it twists more with a longer lever arm r.",
  },
  hints: [
    "Push across the handle, and hold it near the end.",
    "τ = r · F · sin θ must reach 60 N·m.",
    "e.g. r = 0.35 m, θ = 60°: 0.35 · 200 · 0.87 ≈ 61 N·m.",
  ],
  journal: {
    title: "Lever arm",
    tex: String.raw`\tau = r F \sin\theta = r F_\perp`,
    note: "Push far out, at 90°, for most twist.",
  },
  view: { xMin: -0.25, xMax: 0.55, yMin: -0.2, yMax: 0.45 },
  graph: { title: "Torque you apply", yLabel: "τ (N·m)", tMax: 2.5, yMin: 0, yMax: 80, series: [{ label: "τ = rF sin θ", color: COLORS.applied }], target: () => STUCK, targetLabel: "needed 60 N·m" },
  solution: { r: 0.35, angle: 60 },
  wrong: { r: 0.35, angle: 15 },
  create(p) {
    const r0 = p.r;
    const th = rad(p.angle);
    const tau = r0 * PUSH * Math.sin(th);
    const frees = tau >= STUCK - 1e-9;
    let phi = 0; // wrench rotation (CCW, rad)
    let w = 0;
    let done = false;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        sim.t += dt;
        if (frees) {
          const a = (tau - KINETIC_T) / WRENCH_I;
          phi += w * dt + 0.5 * a * dt * dt;
          w += a * dt;
          if (phi >= Math.PI / 2) done = true;
        }
        if (sim.t >= 2.5) done = true;
      },
      isDone: () => done,
      outcome() {
        if (frees) return { success: true, message: `Cracked it loose with ${f(tau, 1)} N·m!` };
        return { success: false, message: `Only ${f(tau, 1)} N·m. Stuck! ${p.angle < 60 ? "Push more across the handle," : ""} ${r0 < 0.3 ? "grip farther out." : ""}`.replace(/\s+/g, " ").trim() };
      },
      draw(r, ov) {
        r.clear("#e5e7eb", "#f9fafb");
        // wheel hub
        r.circle(0, 0, 0.1, "#374151", COLORS.ink);
        const along = new Vec2(Math.cos(phi), Math.sin(phi));
        const perp = along.perp();
        const end = along.scale(HANDLE);
        r.rotRect(end.x / 2, end.y / 2, HANDLE, 0.035, phi, "#94a3b8");
        r.circle(0, 0, 0.045, "#cbd5e1", COLORS.ink);
        // grip point and push
        const grip = along.scale(r0);
        r.circle(grip.x, grip.y, 0.022, "#e63946", COLORS.ink);
        // θ = 0 pushes along the handle toward the bolt; θ = 90° pushes straight across it
        const Fv = along.scale(-PUSH * Math.cos(th)).add(perp.scale(PUSH * Math.sin(th)));
        if (ov.forces) {
          // drawn so the arrow ends at your hand (0.9 mm of screen-world per newton)
          r.arrow(grip.sub(Fv.scale(0.0009)), Fv, 0.0009 * r.scale, COLORS.applied, "F");
          // perpendicular part (the bit that twists)
          r.arrow(grip, perp.scale(PUSH * Math.sin(th)), 0.0009 * r.scale, COLORS.friction, "F⊥");
        }
        r.line(0, 0, grip.x, grip.y, "#111827", 1, [3, 3]);
        r.text(`r = ${f(r0, 2)} m`, grip.x / 2 - perp.x * 0.05, grip.y / 2 - perp.y * 0.05 - 0.04, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
        r.hud([`τ = rF sin θ = ${f(tau, 1)} N·m`, frees ? (w > 0 ? "Turning!" : "Ready") : "Bolt needs 60 N·m"]);
      },
      readouts: () => [
        { label: "Your force F", value: `${PUSH} N` },
        { label: "Twisting part F sin θ", value: `${f(PUSH * Math.sin(th), 1)} N` },
        { label: "Torque τ", value: `${f(tau, 1)} N·m` },
        { label: "Needed", value: `${STUCK} N·m` },
      ],
      equation: () => String.raw`\tau = rF\sin\theta = (${n(r0, 2)})(200)\sin(${p.angle}^\circ) = ${n(tau, 1)}\text{ N·m}`,
      sample: () => [tau],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 11-3  Skater Spin   (L = Iω conserved)                               */
/* ------------------------------------------------------------------ */
const W_START = 2; // rad/s
const ARM_OUT = 0.9; // m
const I_BODY = 1; // kg·m²
const ARM_M = (4 - I_BODY) / (2 * ARM_OUT * ARM_OUT); // so I = 4 kg·m² with arms out
const TARGET_W = 6;
const skaterI = (r: number) => I_BODY + 2 * ARM_M * r * r;

const skaterSpin: Level = {
  id: "11-3",
  chapter: 11,
  title: "Skater Spin",
  hook: "A skater spins at 2.0 rad/s with arms out (I = 4.0 kg·m²). At t = 1 s she pulls her hands in.",
  goal: "Final spin of 6.0 rad/s (±0.2).",
  controls: [{ key: "r", label: "Hands pulled in to radius", min: 0.2, max: 0.9, step: 0.05, value: 0.9, unit: "m" }],
  predict: {
    prompt: "When she pulls her arms in and spins faster, her rotational kinetic energy ½Iω²…",
    options: ["Stays the same, like her angular momentum", "Increases", "Decreases"],
    correct: 1,
    why: "L = Iω stays fixed, so K = ½Iω² = L²/2I. Smaller I means more K. The extra energy comes from the work her muscles do pulling her arms in.",
  },
  explain: {
    prompt: "Why does pulling the arms in make her spin faster?",
    options: [
      "No outside torque acts, so L = Iω stays constant: smaller I forces a bigger ω",
      "Her arms push on the ice",
      "Pulling the arms in adds angular momentum",
    ],
    correct: 0,
    why: "With no external torque, L is conserved. I depends on how far mass is from the axis (Σmr²), so moving mass inward shrinks I and ω must grow to compensate.",
  },
  hints: [
    "Arms closer → smaller I → faster spin.",
    "L = I₀ω₀ = 4 · 2 = 8. Need I = L ÷ 6 ≈ 1.33 kg·m².",
    "I = 1.0 + 3.7 r² = 1.33 → r ≈ 0.30 m.",
  ],
  journal: {
    title: "Angular momentum",
    tex: String.raw`L = I\omega,\qquad I_i\omega_i = I_f\omega_f \;\;(\text{no outside torque})`,
    note: "Smaller I → faster spin.",
  },
  view: { xMin: -1.4, xMax: 1.4, yMin: -1.3, yMax: 1.3 },
  graph: { title: "Spin rate vs. time", yLabel: "ω (rad/s)", tMax: 4, yMin: 0, yMax: 8, series: [{ label: "ω", color: COLORS.velocity }], target: () => TARGET_W, targetLabel: "6 rad/s" },
  solution: { r: 0.3 },
  wrong: { r: 0.45 },
  create(p) {
    const rEnd = p.r;
    const L = skaterI(ARM_OUT) * W_START;
    const armR = (t: number) => {
      if (t <= 1) return ARM_OUT;
      if (t >= 2) return rEnd;
      const s = t - 1;
      const k = s * s * (3 - 2 * s); // smooth pull
      return ARM_OUT + (rEnd - ARM_OUT) * k;
    };
    let ang = 0;
    const T_END = 4;
    const omega = () => L / skaterI(armR(sim.t));
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= T_END) return;
        // midpoint rule for the angle
        const wMid = L / skaterI(armR(sim.t + dt / 2));
        ang += wMid * dt;
        sim.t += dt;
      },
      isDone: () => sim.t >= T_END - 1e-9,
      outcome() {
        const wf = L / skaterI(rEnd);
        if (Math.abs(wf - TARGET_W) <= 0.2) return { success: true, message: `Spinning at ${f(wf, 2)} rad/s. L stayed ${f(L, 1)} kg·m²/s the whole time.` };
        return { success: false, message: `Spinning at ${f(wf, 2)} rad/s. ${wf < TARGET_W ? "Pull the hands in closer." : "Don't pull in so far."}` };
      },
      draw(r, ov) {
        r.clear("#e0f2fe", "#f0f9ff");
        r.circle(0, 0, 1.25, "#f8fafc", "#bae6fd");
        const ra = armR(sim.t);
        const u = new Vec2(Math.cos(ang), Math.sin(ang));
        const hand1 = u.scale(ra);
        const hand2 = u.scale(-ra);
        r.line(hand2.x, hand2.y, hand1.x, hand1.y, "#CC79A7", 9);
        r.circle(hand1.x, hand1.y, 0.08, "#fcd34d", COLORS.ink);
        r.circle(hand2.x, hand2.y, 0.08, "#fcd34d", COLORS.ink);
        r.circle(0, 0, 0.22, "#CC79A7", COLORS.ink);
        r.circle(0, 0, 0.12, "#fcd34d", COLORS.ink);
        if (ov.velocity) r.arrow(hand1, u.perp().scale(omega() * ra), 30, COLORS.velocity, "v");
        if (ov.trail) {
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), ra * r.scale, 0, TAU);
          ctx.strokeStyle = "rgba(204,121,167,.35)";
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        r.hud([`t = ${f(sim.t, 2)} s   ω = ${f(omega(), 2)} rad/s`, `I = ${f(skaterI(ra), 2)} kg·m²   L = ${f(L, 1)}`]);
      },
      readouts: () => {
        const I = skaterI(armR(sim.t));
        const w = L / I;
        return [
          { label: "Moment of inertia I", value: `${f(I, 2)} kg·m²` },
          { label: "Spin rate ω", value: `${f(w, 2)} rad/s` },
          { label: "Angular momentum L = Iω", value: `${f(I * w, 2)} kg·m²/s` },
          { label: "Spin energy ½Iω²", value: `${f(0.5 * I * w * w, 1)} J` },
        ];
      },
      equation: () => {
        const I = skaterI(armR(sim.t));
        return String.raw`I_0\omega_0 = I\omega:\quad (4.00)(2.00) = (${n(I, 2)})(${n(L / I, 2)})`;
      },
      sample: () => [omega()],
    };
    return sim;
  },
};

export const chapter11 = [seesaw, rustyBolt, skaterSpin];
