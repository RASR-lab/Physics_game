import { G } from "../physics/core";
import { COLORS } from "../physics/forces";
import { Vec2, rad } from "../physics/vec2";
import type { Sim } from "./types";
import { ground, hillsScreen, sky, wall } from "../render/art/backdrops";
import { metalBar, person, personTop, plank } from "../render/art/props";
import { noisePattern, patternRect } from "../render/art/core";
import { bestOnGrid, defineLevel, f, n, snap } from "./util";
import { wheel } from "./ch10-rotation";

const TAU = 2 * Math.PI;

/* ------------------------------------------------------------------ */
/* 11-1  Seesaw Balance   (τ = rF, Στ = 0)                             */
/* ------------------------------------------------------------------ */
const seesaw = defineLevel((v) => {
  const KID_M = v.num(30, 0);
  const KID_R = v.num(2, 1);
  const PARENT_M = v.num(75, 0);
  const PLANK_HALF = 2.5;
  const PLANK_M = 20;
  const PIVOT_H = 0.55;
  const MAX_TILT = Math.asin(PIVOT_H / PLANK_HALF);
  const PIVOT_GRIP = 10; // N·m: a little friction at the pivot holds tiny imbalances
  const ratio = PARENT_M / KID_M;
  const dEx = (KID_M * KID_R) / PARENT_M;
  const dc = { min: 0.2, max: 2.5, step: 0.01 };
  return {
    id: "11-1",
    chapter: 11,
    title: "Seesaw Balance",
    hook: `A ${KID_M} kg kid sits ${f(KID_R, 1)} m left of the pivot. Where should their ${PARENT_M} kg parent sit so the seesaw balances?`,
    goal: `Plank stays level (net torque under ${PIVOT_GRIP} N·m).`,
    controls: [{ key: "d", label: "Parent's distance from pivot", ...dc, value: snap(dc, Math.min(2.4, dEx * 1.6)), unit: "m" }],
    predict: {
      prompt: `The parent is ${f(ratio, 1)} times heavier than the kid. To balance, the parent should sit…`,
      options: [`The same distance out (${f(KID_R, 1)} m)`, `${f(ratio, 1)} times closer to the pivot`, `${f(ratio, 1)} times farther out`, "Right on the pivot"],
      correct: 1,
      why: `Balance means equal torques: m₁gr₁ = m₂gr₂. If the weight is ${f(ratio, 1)}× bigger, the lever arm must be ${f(ratio, 1)}× smaller.`,
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
      `Balance: m_kid · g · ${f(KID_R, 1)} = m_parent · g · d.`,
      `d = ${KID_M} · ${f(KID_R, 1)} ÷ ${PARENT_M} ≈ ${f(dEx, 2)} m.`,
    ],
    journal: {
      title: "Torque & balance",
      tex: String.raw`\tau = rF_\perp = rF\sin\theta,\qquad \text{balance: } \sum\tau = 0`,
      note: "Force × lever arm, not force alone.",
    },
    view: { xMin: -3.2, xMax: 3.2, yMin: -0.2, yMax: 2.6, anchor: "bottom" },
    graph: { title: "Tilt vs. time", yLabel: "tilt (°)", tMax: 3, yMin: -12, yMax: 12, series: [{ label: "tilt", color: COLORS.applied }] },
    solution: { d: snap(dc, dEx) },
    wrong: { d: snap(dc, KID_R) }, // same distance as the kid
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
          const net = tauKid() - tauParent();
          const eff = Math.sign(net) * Math.max(0, Math.abs(net) - PIVOT_GRIP); // pivot friction
          const a = eff / I; // Στ = Iα
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
          if (Math.abs(net) <= PIVOT_GRIP) return { success: true, message: `Level! Kid ${f(KID_M * G * KID_R, 0)} N·m vs. parent ${f(PARENT_M * G * d, 0)} N·m.` };
          return {
            success: false,
            message: `${net > 0 ? "Kid's side went down" : "Parent's side went down"}: net torque ${f(Math.abs(net), 0)} N·m. ${net > 0 ? "Move the parent farther out." : "Move the parent closer in."}`,
          };
        },
        draw(r, ov) {
          sky(r, r.sy(0), "day");
          hillsScreen(r, r.sy(0), Math.min(r.h * 0.25, r.sy(0) * 0.45));
          ground(r, 0, "grass");
          r.poly([[-0.3, 0], [0.3, 0], [0, PIVOT_H]], "#64748b", COLORS.ink);
          const piv = new Vec2(0, PIVOT_H);
          const along = new Vec2(Math.cos(phi), -Math.sin(phi)); // toward the right end
          const up = new Vec2(Math.sin(phi), Math.cos(phi));
          plank(r, piv.x, piv.y + 0.06, 2 * PLANK_HALF, 0.12, -phi);
          // distance marks along the plank
          for (let x = -2.5; x <= 2.5001; x += 0.5) {
            const q = piv.add(along.scale(x)).add(up.scale(0.12));
            r.circle(q.x, q.y, 0.025, "#7c4a1e", undefined, 2);
          }
          r.circle(0, PIVOT_H, 0.06, "#cbd5e1", COLORS.ink);
          // riders sit on the plank at their distances from the pivot
          const seat = (dist: number) => piv.add(along.scale(dist)).add(up.scale(0.12));
          const kidSeat = seat(-KID_R),
            parSeat = seat(d);
          person(r, kidSeat.x, kidSeat.y - 0.45 * (1.2 / 1.75), 1.2, { pose: "sit", facing: 1, shirt: "#0072B2", hair: "#d4a373" });
          person(r, parSeat.x, parSeat.y - 0.45, 1.75, { pose: "sit", facing: -1, shirt: "#CC79A7" });
          r.text(`${KID_M} kg`, kidSeat.x, kidSeat.y + 0.85, { size: 10, color: "#fff", bold: true, bg: "#0072B2" });
          r.text(`${PARENT_M} kg`, parSeat.x, parSeat.y + 1.12, { size: 11, color: "#fff", bold: true, bg: "#CC79A7" });
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
        equation: () => String.raw`\sum\tau = (${KID_M})(9.81)(${n(KID_R)}) - (${PARENT_M})(9.81)(${n(d, 2)}) = ${n(KID_M * G * KID_R - PARENT_M * G * d, 1)}\text{ N·m}`,
        sample: () => [(phi * 180) / Math.PI],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 11-2  Rusty Bolt   (τ = rF sin θ)                                   */
/* ------------------------------------------------------------------ */
const rustyBolt = defineLevel((v) => {
  const PUSH = v.num(200, -1); // N, the most you can push
  const STUCK = v.num(60, 0); // N·m needed to break the bolt free
  const KINETIC_T = STUCK / 2; // N·m of friction once it's turning
  const WRENCH_I = 0.4; // kg·m² (wrench + your hand + bolt)
  const HANDLE = 0.52;
  const rc = { min: 0.05, max: 0.5, step: 0.01 };
  const angc = { min: 0, max: 90, step: 5 };
  // reference answer: hold near the end and push at the shallowest angle that still works
  const rSol = 0.45;
  const angSol = snap(angc, (Math.asin(Math.min(1, STUCK / (rSol * PUSH))) * 180) / Math.PI, "up");
  return {
    id: "11-2",
    chapter: 11,
    title: "Rusty Bolt",
    hook: `A rusted wheel bolt needs ${STUCK} N·m of torque to break free. You can push with ${PUSH} N, no more.`,
    goal: `Break the bolt loose (τ ≥ ${STUCK} N·m).`,
    controls: [
      { key: "r", label: "Grip distance from bolt r", ...rc, value: 0.15, unit: "m" },
      { key: "angle", label: "Push angle θ (from the handle)", ...angc, value: 30, unit: "°" },
    ],
    predict: {
      prompt: `You push with the full ${PUSH} N, but straight along the handle toward the bolt (θ = 0°). The torque is…`,
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
      `τ = r · F · sin θ must reach ${STUCK} N·m.`,
      `e.g. r = ${rSol} m, θ = ${angSol}°: ${rSol} · ${PUSH} · ${f(Math.sin((angSol * Math.PI) / 180), 2)} ≈ ${f(rSol * PUSH * Math.sin((angSol * Math.PI) / 180), 0)} N·m.`,
    ],
    journal: {
      title: "Lever arm",
      tex: String.raw`\tau = r F \sin\theta = r F_\perp`,
      note: "Push far out, at 90°, for most twist.",
    },
    view: { xMin: -0.25, xMax: 0.65, yMin: -0.2, yMax: 0.5 },
    graph: { title: "Torque you apply", yLabel: "τ (N·m)", tMax: 2.5, yMin: 0, yMax: Math.ceil((STUCK * 1.4) / 10) * 10, series: [{ label: "τ = rF sin θ", color: COLORS.applied }], target: () => STUCK, targetLabel: `needed ${STUCK} N·m` },
    solution: { r: rSol, angle: angSol },
    wrong: { r: rSol, angle: 15 }, // pushing almost along the handle
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
          return { success: false, message: `Only ${f(tau, 1)} N·m. Stuck! ${p.angle < 60 ? "Push more across the handle," : ""} ${r0 < 0.4 ? "grip farther out." : ""}`.replace(/\s+/g, " ").trim() };
        },
        draw(r, ov) {
          wall(r, "#cdb48f", "pegboard");
          // rusty steel plate with the stuck bolt
          r.rect(-0.16, -0.16, 0.32, 0.32, "#8b5a3c", "#5b3a1f", 6);
          r.ctx.fillStyle = noisePattern(r.ctx, "#9a5b32", { dark: 0.2, light: 0.08, seed: 9 });
          r.ctx.globalAlpha = 0.5;
          r.ctx.fillRect(r.sx(-0.16), r.sy(0.16), 0.32 * r.scale, 0.32 * r.scale);
          r.ctx.globalAlpha = 1;
          r.poly(
            Array.from({ length: 6 }, (_, i) => [0.085 * Math.cos((i * TAU) / 6 + phi), 0.085 * Math.sin((i * TAU) / 6 + phi)] as [number, number]),
            "#6b7280",
            COLORS.ink,
          );
          const along = new Vec2(Math.cos(phi), Math.sin(phi));
          const perp = along.perp();
          const end = along.scale(HANDLE);
          r.circle(0, 0, 0.1, "#cbd5e1", "#475569");
          metalBar(r, new Vec2(0, 0), end, 0.04, "#94a3b8");
          r.rect(end.x - 0.02, end.y - 0.025, 0.04, 0.05, "#1f2937", undefined, 3);
          r.circle(0, 0, 0.045, "#e2e8f0", COLORS.ink);
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
          r.hud([`τ = rF sin θ = ${f(tau, 1)} N·m`, frees ? (w > 0 ? "Turning!" : "Ready") : `Bolt needs ${STUCK} N·m`]);
        },
        readouts: () => [
          { label: "Your force F", value: `${PUSH} N` },
          { label: "Twisting part F sin θ", value: `${f(PUSH * Math.sin(th), 1)} N` },
          { label: "Torque τ", value: `${f(tau, 1)} N·m` },
          { label: "Needed", value: `${STUCK} N·m` },
        ],
        equation: () => String.raw`\tau = rF\sin\theta = (${n(r0, 2)})(${PUSH})\sin(${p.angle}^\circ) = ${n(tau, 1)}\text{ N·m}`,
        sample: () => [tau],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 11-3  Skater Spin   (L = Iω conserved)                               */
/* ------------------------------------------------------------------ */
const skaterSpin = defineLevel((v) => {
  const W_START = v.num(2, 1); // rad/s
  const ARM_OUT = 0.9; // m
  const I_BODY = 1; // kg·m²
  const I_OUT = 4; // kg·m² with arms out
  const ARM_M = (I_OUT - I_BODY) / (2 * ARM_OUT * ARM_OUT);
  const ratio = v.num(3, 1); // how many times faster she must spin
  const TARGET_W = Math.round(W_START * ratio * 10) / 10;
  const skaterI = (r: number) => I_BODY + 2 * ARM_M * r * r;
  const L0 = I_OUT * W_START;
  const iEx = L0 / TARGET_W;
  const rEx = Math.sqrt((iEx - I_BODY) / (2 * ARM_M));
  const rc = { min: 0.1, max: 0.9, step: 0.01 };
  return {
    id: "11-3",
    chapter: 11,
    title: "Skater Spin",
    hook: `A skater spins at ${f(W_START, 1)} rad/s with arms out (I = ${f(I_OUT, 1)} kg·m²). At t = 1 s she pulls her hands in.`,
    goal: `Final spin of ${f(TARGET_W, 1)} rad/s (±0.2).`,
    controls: [{ key: "r", label: "Hands pulled in to radius", ...rc, value: 0.9, unit: "m" }],
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
      `L = I₀ω₀ = ${f(I_OUT, 1)} · ${f(W_START, 1)} = ${f(L0, 2)}. Need I = L ÷ ${f(TARGET_W, 1)} ≈ ${f(iEx, 2)} kg·m².`,
      `I = 1.0 + ${f(2 * ARM_M, 2)} r² = ${f(iEx, 2)} → r ≈ ${f(rEx, 2)} m.`,
    ],
    journal: {
      title: "Angular momentum",
      tex: String.raw`L = I\omega,\qquad I_i\omega_i = I_f\omega_f \;\;(\text{no outside torque})`,
      note: "Smaller I → faster spin.",
    },
    view: { xMin: -1.4, xMax: 1.4, yMin: -1.3, yMax: 1.3 },
    graph: { title: "Spin rate vs. time", yLabel: "ω (rad/s)", tMax: 4, yMin: 0, yMax: Math.ceil(TARGET_W * 1.3), series: [{ label: "ω", color: COLORS.velocity }], target: () => TARGET_W, targetLabel: `${f(TARGET_W, 1)} rad/s` },
    solution: { r: bestOnGrid(rc, (r) => L0 / skaterI(r) - TARGET_W) },
    wrong: { r: snap(rc, rEx + 0.15) },
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
          r.ctx.fillStyle = noisePattern(r.ctx, "#e6f4fb", { light: 0.12, dark: 0.02, seed: 4 });
          r.ctx.fillRect(0, 0, r.w, r.h);
          // skate scratches
          r.ctx.strokeStyle = "rgba(255,255,255,.8)";
          r.ctx.lineWidth = 1;
          for (let i = 0; i < 14; i++) {
            r.ctx.beginPath();
            r.ctx.arc(r.sx(0), r.sy(0), (1.4 + i * 0.13) * r.scale, i, i + 1.2);
            r.ctx.stroke();
          }
          r.circle(0, 0, 1.25, "rgba(255,255,255,.6)", "#7dd3fc");
          const ra = armR(sim.t);
          const u = new Vec2(Math.cos(ang), Math.sin(ang));
          const hand1 = u.scale(ra);
          const hand2 = u.scale(-ra);
          r.line(hand2.x, hand2.y, hand1.x, hand1.y, "#CC79A7", 9);
          r.circle(hand1.x, hand1.y, 0.08, "#f1c27d", COLORS.ink);
          r.circle(hand2.x, hand2.y, 0.08, "#f1c27d", COLORS.ink);
          personTop(r, 0, 0, 0.5, ang, "#CC79A7", "#4a3426");
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
          return String.raw`I_0\omega_0 = I\omega:\quad (${n(I_OUT, 2)})(${n(W_START, 2)}) = (${n(I, 2)})(${n(L / I, 2)})`;
        },
        sample: () => [omega()],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 11-4  Swinging Door   (Στ = Iα, I = ⅓ML² for a door on hinges)        */
/* ------------------------------------------------------------------ */
const swingingDoor = defineLevel((v) => {
  const W = v.num(0.9, 2); // door width, m
  const M = v.num(30, 0); // door mass, kg
  const T_OPEN = v.num(2, 1); // s to swing 90°
  const I = (M * W * W) / 3;
  const rH = W - 0.06; // handle distance from the hinge
  const alphaEx = Math.PI / (T_OPEN * T_OPEN); // ½αt² = π/2
  const fEx = (I * alphaEx) / rH;
  const fc = { min: 0, max: 40, step: 0.1 };
  return {
    id: "11-4",
    chapter: 11,
    title: "Swinging Door",
    hook: `An automatic door (${M} kg, ${f(W, 2)} m wide, hinged on one edge) is pushed by a small motor arm at the handle, always at right angles.`,
    goal: `Open fully (90°) in ${f(T_OPEN, 1)} s (±0.1 s).`,
    controls: [{ key: "F", label: "Push at the handle F", ...fc, value: snap(fc, fEx * 0.4), unit: "N" }],
    predict: {
      prompt: "Same push, but applied halfway between the hinge and the handle. The door opens…",
      options: ["In the same time", "More slowly", "Faster"],
      correct: 1,
      why: "Half the lever arm gives half the torque, so half the angular acceleration (α = τ/I). The door takes √2 ≈ 1.4× as long.",
    },
    explain: {
      prompt: "Why is the door's moment of inertia ⅓ML² and not ML²?",
      options: [
        "Most of its mass is closer to the hinge than the far edge, and I adds up m·r² for every piece",
        "Doors are hollow",
        "Only a third of the door moves",
      ],
      correct: 0,
      why: "I = Σmr². Mass near the hinge barely counts; mass at the edge counts fully. Averaged over a uniform door that gives ⅓ML² (the 'thin rod about its end' on your sheet).",
    },
    hints: [
      "Too slow? Push harder.",
      "θ = ½αt² with θ = π/2 rad. Then τ = Iα and F = τ/r.",
      `α = π ÷ ${f(T_OPEN, 1)}² ≈ ${f(alphaEx, 3)} rad/s². I = ⅓·${M}·${f(W, 2)}² ≈ ${f(I, 2)} kg·m². F = Iα ÷ ${f(rH, 2)} ≈ ${f(fEx, 1)} N.`,
    ],
    journal: {
      title: "Newton's 2nd law for rotation",
      tex: String.raw`\sum\tau = I\alpha,\qquad I_{door} = \tfrac13 ML^2,\qquad \Delta\theta = \tfrac12\alpha t^2`,
      note: "Torque is to spinning what force is to moving.",
    },
    view: { xMin: -0.3, xMax: W + 0.3, yMin: -0.25, yMax: W + 0.2 },
    graph: { title: "Door angle vs. time", yLabel: "angle (°)", tMax: Math.ceil(T_OPEN + 1), yMin: 0, yMax: 100, series: [{ label: "angle", color: COLORS.applied }], target: () => 90, targetLabel: "fully open" },
    solution: { F: snap(fc, fEx) },
    wrong: { F: snap(fc, fEx * 3) }, // used I = ML² (all the mass at the edge)
    create(p) {
      const alpha = (p.F * rH) / I;
      let th = 0,
        w = 0;
      let tOpen: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (tOpen !== null || p.F <= 0) {
            sim.t += dt;
            return;
          }
          const th2 = th + w * dt + 0.5 * alpha * dt * dt;
          if (th2 >= Math.PI / 2) {
            const tIn = (-w + Math.sqrt(w * w + 2 * alpha * (Math.PI / 2 - th))) / alpha;
            tOpen = sim.t + tIn;
            th = Math.PI / 2;
            sim.t += tIn;
            return;
          }
          th = th2;
          w += alpha * dt;
          sim.t += dt;
        },
        isDone: () => tOpen !== null || sim.t > 20,
        outcome() {
          if (tOpen === null) return { success: false, message: "The door barely moved. Push harder." };
          const d = tOpen - T_OPEN;
          if (Math.abs(d) <= 0.1) return { success: true, message: `Fully open in ${f(tOpen, 2)} s with just ${f(p.F, 1)} N.` };
          return { success: false, message: `Opened in ${f(tOpen, 2)} s. ${d > 0 ? "Push harder." : "Push gentler."}` };
        },
        draw(r, ov) {
          // floor plan seen from above: wooden floor, plaster walls
          r.ctx.fillStyle = noisePattern(r.ctx, "#d2a679", { light: 0.04, dark: 0.06, seed: 6 });
          r.ctx.fillRect(0, 0, r.w, r.h);
          r.ctx.fillStyle = "rgba(90,55,25,.16)";
          for (let Y = 0; Y < r.h; Y += 46) r.ctx.fillRect(0, Y, r.w, 2);
          // wall (top view), hinge at the origin; the door swings from along +x up to +y
          r.rect(-0.3, -0.12, 0.3, 0.12, "#e7e5e4", "#57534e");
          r.rect(W + 0.02, -0.12, 0.3, 0.12, "#e7e5e4", "#57534e");
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), W * r.scale, -Math.PI / 2, 0);
          ctx.strokeStyle = "rgba(17,24,39,.3)";
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
          const u = new Vec2(Math.cos(th), Math.sin(th));
          plank(r, (u.x * W) / 2, (u.y * W) / 2, W, 0.05, th, "#8b5a2b");
          r.circle(0, 0, 0.03, "#94a3b8", COLORS.ink);
          const hp = u.scale(rH);
          r.circle(hp.x, hp.y, 0.025, "#facc15", COLORS.ink);
          r.line(0, 0, 0, W, "#6b7280", 1, [3, 3]);
          r.text("open", 0.05, W + 0.05, { size: 11, align: "left", bold: true, bg: "rgba(255,255,255,.85)" });
          if (ov.forces && tOpen === null) r.arrow(hp, u.perp().scale(p.F), 60 / Math.max(fEx, 1), COLORS.applied, "F");
          if (ov.velocity) r.arrow(u.scale(W), u.perp().scale(w * W), 80, COLORS.velocity, "v");
          r.hud([`t = ${f(tOpen ?? sim.t, 2)} s`, `angle ${f((th * 180) / Math.PI, 0)}°`]);
        },
        readouts: () => [
          { label: "Torque τ = rF", value: `${f(p.F * rH, 2)} N·m` },
          { label: "Moment of inertia I", value: `${f(I, 2)} kg·m²` },
          { label: "α = τ/I", value: `${f(alpha, 3)} rad/s²` },
          { label: "Angle", value: `${f((th * 180) / Math.PI, 1)}°` },
        ],
        equation: () => String.raw`\alpha = \frac{\tau}{I} = \frac{(${n(rH, 2)})(${n(p.F, 1)})}{${n(I, 2)}} = ${n(alpha, 3)}\ \tfrac{rad}{s^2}`,
        sample: () => [(th * 180) / Math.PI],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 11-5  Well Bucket   (rope on a heavy drum: τ = Iα, a = Rα)            */
/* ------------------------------------------------------------------ */
const wellBucket = defineLevel((v) => {
  const m = v.num(4, 1); // bucket, kg
  const D = v.num(6, 1); // depth to the water, m
  const T_GOAL = v.num(3, 1); // s
  const R = 0.15; // drum radius, m
  const aEx = (2 * D) / (T_GOAL * T_GOAL);
  const MEx = 2 * m * (G / aEx - 1); // a = mg / (m + M/2)
  const mc = { min: 0, max: 150, step: 0.5 };
  return {
    id: "11-5",
    chapter: 11,
    title: "Well Bucket",
    hook: `A ${f(m, 1)} kg bucket hangs from a rope wound on a solid drum (I = ½MR², R = ${R * 100} cm). Let go, and it falls ${f(D, 1)} m to the water.`,
    goal: `Pick the drum's mass so the bucket takes ${f(T_GOAL, 1)} s to reach the water (±0.1 s).`,
    controls: [{ key: "M", label: "Drum mass M", ...mc, value: 10, unit: "kg" }],
    predict: {
      prompt: "You swap in a heavier drum (same size). The bucket falls…",
      options: ["Faster", "Slower", "At the same rate, since it's in free fall"],
      correct: 1,
      why: "The rope has to spin the drum up. A heavier drum has more rotational inertia, so it takes more of the bucket's pull and the bucket accelerates less.",
    },
    explain: {
      prompt: "Why isn't the bucket in free fall?",
      options: [
        "The rope pulls up on it with tension T; that same T makes the torque TR that spins the drum (TR = Iα)",
        "Air resistance",
        "The drum's weight pulls the bucket up",
      ],
      correct: 0,
      why: "Bucket: mg − T = ma. Drum: TR = Iα = ½MR²·(a/R) → T = ½Ma. Together: a = mg/(m + M/2).",
    },
    hints: [
      "Too fast? Heavier drum.",
      "D = ½aT² → a. Then a = mg/(m + M/2).",
      `a = 2·${f(D, 1)} ÷ ${f(T_GOAL, 1)}² ≈ ${f(aEx, 3)} m/s² → M = 2m(g/a − 1) ≈ ${f(MEx, 1)} kg.`,
    ],
    journal: {
      title: "Massive pulley",
      tex: String.raw`mg - T = ma,\quad TR = I\alpha,\quad a = R\alpha \;\Rightarrow\; a = \frac{mg}{m + I/R^2}`,
      note: "Spinning the pulley takes part of the pull.",
    },
    view: { xMin: -1.2, xMax: 1.2, yMin: -D - 0.6, yMax: 1.0 },
    graph: { title: "Bucket speed vs. time", yLabel: "v (m/s)", tMax: Math.ceil(T_GOAL + 1), yMin: 0, yMax: Math.ceil(aEx * T_GOAL * 1.5), series: [{ label: "v", color: COLORS.velocity }] },
    solution: { M: snap(mc, MEx) },
    wrong: { M: snap(mc, MEx / 2) },
    create(p) {
      const a = (m * G) / (m + p.M / 2);
      const T = m * (G - a);
      let s = 0,
        vel = 0;
      let tHit: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (tHit !== null) return;
          const s2 = s + vel * dt + 0.5 * a * dt * dt;
          if (s2 >= D) {
            const tIn = (-vel + Math.sqrt(vel * vel + 2 * a * (D - s))) / a;
            tHit = sim.t + tIn;
            vel += a * tIn;
            s = D;
            sim.t += tIn;
            return;
          }
          s = s2;
          vel += a * dt;
          sim.t += dt;
        },
        isDone: () => tHit !== null || sim.t > 30,
        outcome() {
          if (tHit === null) return { success: false, message: "Still falling…" };
          const d = tHit - T_GOAL;
          if (Math.abs(d) <= 0.1) return { success: true, message: `Splash at ${f(tHit, 2)} s. Rope tension was ${f(T, 1)} N, less than mg = ${f(m * G, 1)} N.` };
          return { success: false, message: `Splash at ${f(tHit, 2)} s. ${d < 0 ? "Too fast: heavier drum." : "Too slow: lighter drum."}` };
        },
        draw(r, ov) {
          sky(r, r.sy(0), "day");
          hillsScreen(r, r.sy(0), Math.min(r.h * 0.12, r.sy(0) * 0.5));
          ground(r, 0, "dirt");
          // stone well shaft (cut-away)
          patternRect(r, -1.2, -D - 0.6, 0.7, D + 0.6, noisePattern(r.ctx, "#9ca3af", { dark: 0.14, light: 0.08, seed: 5 }));
          patternRect(r, 0.5, -D - 0.6, 0.7, D + 0.6, noisePattern(r.ctx, "#9ca3af", { dark: 0.14, light: 0.08, seed: 5 }));
          for (let y = 0; y > -D - 0.6; y -= 0.3) {
            r.line(-1.2, y, -0.5, y, "rgba(0,0,0,.18)", 1);
            r.line(0.5, y, 1.2, y, "rgba(0,0,0,.18)", 1);
          }
          r.rect(-0.5, -D - 0.6, 1.0, D + 0.6, "#3f3a36");
          r.rect(-0.5, -D - 0.6, 1.0, 0.45, "#3b82c4");
          r.rect(-0.5, -D - 0.17, 1.0, 0.04, "rgba(255,255,255,.35)");
          // stone rim
          r.rect(-1.25, -0.02, 0.75, 0.22, "#a8a29e", "#57534e", 3);
          r.rect(0.5, -0.02, 0.75, 0.22, "#a8a29e", "#57534e", 3);
          // drum (drawn 2× radius) on a wooden stand
          const RD = 0.3;
          r.line(-0.7, 0.2, -0.7, 0.55, "#7c4a1e", 6);
          r.line(0.7, 0.2, 0.7, 0.55, "#7c4a1e", 6);
          r.line(-0.7, 0.55, 0.7, 0.55, "#7c4a1e", 3);
          wheel(r, 0, 0.55, RD, s / R, "#b45309", 8);
          r.text(`${p.M} kg`, 0, 0.95, { size: 11, bold: true, bg: "rgba(255,255,255,.9)" });
          const by = -s - 0.15;
          r.line(RD, 0.55, RD, by + 0.2, "#a16207", 2);
          r.poly([[RD - 0.15, by + 0.2], [RD + 0.15, by + 0.2], [RD + 0.11, by - 0.1], [RD - 0.11, by - 0.1]], "#94a3b8", COLORS.ink);
          r.line(RD - 0.15, by + 0.12, RD + 0.15, by + 0.12, "rgba(0,0,0,.25)", 1.5);
          if (ov.forces) {
            const ppu = 0.6 / (m * G);
            r.arrow(new Vec2(RD - 0.3, by), new Vec2(0, -m * G), ppu * r.scale, COLORS.gravity, "mg");
            r.arrow(new Vec2(RD + 0.3, by + 0.2), new Vec2(0, T), ppu * r.scale, COLORS.applied, "T");
          }
          if (ov.velocity) r.arrow(new Vec2(RD + 0.55, by), new Vec2(0, -vel), 0.15 * r.scale, COLORS.velocity, "v");
          r.hud([`t = ${f(tHit ?? sim.t, 2)} s`, `fallen ${f(s, 2)} m of ${f(D, 1)} m`]);
        },
        readouts: () => [
          { label: "Acceleration", value: `${f(a, 3)} m/s²` },
          { label: "Rope tension T", value: `${f(T, 1)} N` },
          { label: "Drum spin ω = v/R", value: `${f(vel / R, 1)} rad/s` },
          { label: "Distance fallen", value: `${f(s, 2)} m` },
        ],
        equation: () => String.raw`a = \frac{mg}{m + M/2} = \frac{(${n(m)})(9.81)}{${n(m)} + ${n(p.M / 2, 2)}} = ${n(a, 3)}\ \tfrac{m}{s^2}`,
        sample: () => [vel],
      };
      return sim;
    },
  };
});

export const chapter11 = [seesaw, rustyBolt, skaterSpin, swingingDoor, wellBucket];
