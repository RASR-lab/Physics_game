import { Body, G, stepBodies } from "../physics/core";
import { COLORS, damping, gravity, spring } from "../physics/forces";
import { slideAngleDeg } from "../physics/analytic";
import { Vec2, rad } from "../physics/vec2";
import type { Sim } from "./types";
import { ground, hillsScreen, lawn, sky, treeTop, wall } from "../render/art/backdrops";
import { carTop, coil, crate as crateArt, groceryBag, person, plank, ramp, tyre } from "../render/art/props";
import { noisePattern } from "../render/art/core";
import { defineLevel, f, n, roundTo, snap } from "./util";

/* ------------------------------------------------------------------ */
/* 6-1  Will It Slide?   (static & kinetic friction on a ramp)         */
/* ------------------------------------------------------------------ */
const willItSlide = defineLevel((v) => {
  const MU_S = v.num(0.45, 2);
  const MU_K = roundTo(MU_S * 0.67, 2);
  const RAMP_L = 8;
  const thC = slideAngleDeg(MU_S); // slips above this angle
  const MIN_A = roundTo(thC - 1.2, 1); // "steep enough"
  const ac = { min: 0, max: 40, step: 0.5 };
  return {
    id: "6-1",
    chapter: 6,
    title: "Will It Slide?",
    hook: `A crate sits on a wooden ramp. μs = ${f(MU_S, 2)}, μk = ${f(MU_K, 2)}.`,
    goal: `Steepest angle (≥ ${f(MIN_A, 1)}°) where it doesn't slide.`,
    controls: [
      { key: "angle", label: "Ramp angle θ", ...ac, value: 10, unit: "°" },
      { key: "mass", label: "Crate mass", min: 1, max: 50, step: 1, value: 10, unit: "kg" },
    ],
    predict: {
      prompt: "If you make the crate twice as heavy, the steepest angle before it slides…",
      options: ["Gets steeper (heavier crates hold better)", "Stays the same", "Gets shallower (heavier crates slide sooner)"],
      correct: 1,
      why: "The downhill pull mg sin θ and the maximum friction μs mg cos θ both double, so the mass cancels: the crate slips when tan θ > μs.",
    },
    explain: {
      prompt: "Why doesn't the crate's mass change the slipping angle?",
      options: [
        "Downhill pull and maximum friction both grow with mass, so mass cancels out: tan θ = μs",
        "Friction doesn't depend on the normal force",
        "Heavier crates have a smaller μs",
      ],
      correct: 0,
      why: "Slipping starts when mg sin θ = μs mg cos θ. Divide both sides by mg cos θ and you get tan θ = μs.",
    },
    hints: [
      "Watch the orange friction arrow grow.",
      "Slips when mg sin θ > μs mg cos θ.",
      `tan θ = ${f(MU_S, 2)} → θ ≈ ${f(thC, 1)}°. That's where it starts to slip: stay just below it.`,
    ],
    journal: {
      title: "Friction",
      tex: String.raw`f_s \le \mu_s F_N,\qquad f_k = \mu_k F_N,\qquad \text{slips when } \tan\theta > \mu_s`,
      note: "Static friction adjusts, up to μs·N.",
    },
    view: { xMin: -1, xMax: 10, yMin: -1, yMax: 6.5, anchor: "bottom" },
    graph: { title: "Speed along the ramp", yLabel: "v (m/s)", tMax: 2.5, yMin: 0, yMax: 4, series: [{ label: "speed", color: COLORS.velocity }] },
    solution: { angle: snap(ac, thC, "down"), mass: 10 },
    wrong: { angle: snap(ac, thC + 5), mass: 10 },
    create(p) {
      const th = rad(p.angle);
      const m = p.mass;
      const slides = Math.tan(th) > MU_S;
      // 1D body: pos.x = distance from the bottom of the ramp, measured up the slope.
      const crate = new Body(m, new Vec2(RAMP_L - 1, 0));
      const fg = { id: "gravity", label: "F_g", color: COLORS.gravity, compute: () => new Vec2(-m * G * Math.sin(th), 0) };
      const fr = {
        id: "friction",
        label: slides ? "f_k" : "f_s",
        color: COLORS.friction,
        compute: (b: Body) => {
          if (!slides) return new Vec2(m * G * Math.sin(th), 0); // static: exactly balances
          return b.vel.x < 0 ? new Vec2(MU_K * m * G * Math.cos(th), 0) : Vec2.zero();
        },
      };
      crate.forces = [fg, fr];
      let done = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (done) return;
          stepBodies([crate], sim.t, dt);
          sim.t += dt;
          if (crate.pos.x <= 0.6) {
            crate.pos = new Vec2(0.6, 0);
            crate.vel = Vec2.zero();
            done = true;
          }
          if (sim.t >= 2.5) done = true;
        },
        isDone: () => done,
        outcome() {
          const ratio = Math.tan(th);
          if (slides) return { success: false, message: `Slid! tan θ = ${f(ratio, 2)} > ${f(MU_S, 2)}. Lower it.` };
          if (p.angle < MIN_A) return { success: false, message: `Held, but go steeper (≥ ${f(MIN_A, 1)}°).` };
          return { success: true, message: `Held at ${p.angle}°. Right at the edge!` };
        },
        draw(r, ov) {
          sky(r, r.sy(0), "day");
          hillsScreen(r, r.sy(0), Math.min(r.h * 0.2, r.sy(0) * 0.4));
          ground(r, 0, "grass");
          const top = new Vec2(RAMP_L * Math.cos(th), RAMP_L * Math.sin(th));
          ramp(r, [
            [0, 0],
            [top.x, top.y],
            [top.x, 0],
          ]);
          r.rect(top.x, 0, 1.2, top.y + 0.01, "#9ca3af", "#475569", 2);
          // angle arc
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), 40, -th, 0);
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          r.textPx(`θ = ${p.angle}°`, r.sx(0) + 62, r.sy(0) - 12, { size: 12, bold: true, bg: "rgba(255,255,255,.85)" });
          const s = crate.pos.x;
          const along = new Vec2(Math.cos(th), Math.sin(th));
          const up = new Vec2(-Math.sin(th), Math.cos(th));
          const size = 0.55 + 0.012 * m;
          const c = along.scale(s).add(up.scale(size / 2));
          crateArt(r, c.x, c.y, size, size, th);
          r.text(`${m} kg`, c.x, c.y, { size: 10, bold: true, bg: "rgba(255,255,255,.85)" });
          if (ov.forces) {
            const ppu = 85 / (m * G);
            r.arrow(c, new Vec2(0, -m * G), ppu, COLORS.gravity, "F_g");
            r.arrow(c, up.scale(m * G * Math.cos(th)), ppu, COLORS.normal, "F_N");
            const fv = crate.lastForces[1]?.value.x ?? m * G * Math.sin(th);
            r.arrow(c.sub(up.scale(size / 2)), along.scale(fv), ppu, COLORS.friction, slides ? "f_k" : "f_s");
          }
          if (ov.velocity) r.arrow(c.add(up.scale(size)), along.scale(crate.vel.x), 25, COLORS.velocity, "v");
          r.hud([`tan θ = ${f(Math.tan(th), 3)}   μs = ${MU_S}`, slides ? "Sliding: kinetic friction" : "Holding: static friction"]);
        },
        readouts: () => [
          { label: "Downhill pull mg sin θ", value: `${f(m * G * Math.sin(th), 1)} N` },
          { label: "Max static friction μs·N", value: `${f(MU_S * m * G * Math.cos(th), 1)} N` },
          { label: "Normal force N", value: `${f(m * G * Math.cos(th), 1)} N` },
          { label: "Speed", value: `${f(-crate.vel.x, 2)} m/s` },
        ],
        equation: () =>
          String.raw`mg\sin\theta = ${n(m * G * Math.sin(th))}\text{ N} \;${slides ? ">" : "\\le"}\; \mu_s mg\cos\theta = ${n(MU_S * m * G * Math.cos(th))}\text{ N}`,
        sample: () => [-crate.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 6-2  Spring Scale   (Hooke's law, F = −kΔx)                         */
/* ------------------------------------------------------------------ */
const springScale = defineLevel((v) => {
  const K = v.num(200, 0);
  const REST = 0.3;
  const TARGET_STRETCH = v.num(14.7, 1) / 100; // m
  const mEx = (K * TARGET_STRETCH) / G;
  const mc = { min: 0.1, max: 6, step: 0.05 };
  return {
    id: "6-2",
    chapter: 6,
    title: "Spring Scale",
    hook: `Spring scale, k = ${K} N/m. Hang a bag to reach the red mark.`,
    goal: `Settle on the red mark, ${f(TARGET_STRETCH * 100, 1)} cm (±0.3).`,
    controls: [{ key: "mass", label: "Mass of produce", ...mc, value: 1, unit: "kg" }],
    predict: {
      prompt: "If you hang twice as much mass on the spring, it stretches…",
      options: ["The same amount", "Twice as far", "Four times as far", "Half as far"],
      correct: 1,
      why: "Hooke's law: spring force is proportional to stretch (F = kΔx). Twice the weight needs twice the stretch to balance it.",
    },
    explain: {
      prompt: "Why does the mass stop bouncing at exactly that point?",
      options: [
        "There the spring force kΔx equals the weight mg, so the net force is zero",
        "The spring runs out of stretch",
        "Gravity switches off once the mass stops",
      ],
      correct: 0,
      why: "At equilibrium ΣF = 0: kΔx = mg. The small bounce dies away because of a little air resistance (damping).",
    },
    hints: [
      "Heavier → more stretch.",
      "At rest: kΔx = mg.",
      `m = ${K} · ${f(TARGET_STRETCH, 3)} ÷ 9.81 ≈ ${f(mEx, 2)} kg.`,
    ],
    journal: {
      title: "Hooke's law",
      tex: String.raw`\vec F_{spring} = -k\,\Delta\vec x \qquad \text{at rest: } k\Delta x = mg`,
      note: "Spring force ∝ stretch.",
    },
    view: { xMin: -0.5, xMax: 0.5, yMin: -0.8, yMax: 0.08 },
    graph: {
      title: "Stretch vs. time",
      yLabel: "stretch Δx (cm)",
      tMax: 6,
      yMin: 0,
      yMax: 22,
      series: [{ label: "stretch", color: COLORS.spring }],
      target: () => TARGET_STRETCH * 100,
      targetLabel: "red mark",
    },
    solution: { mass: snap(mc, mEx) },
    wrong: { mass: snap(mc, mEx * 0.67) },
    create(p) {
      const m = p.mass;
      const anchor = Vec2.zero();
      const bob = new Body(m, new Vec2(0, -REST));
      bob.forces = [gravity(), spring(anchor, K, REST), damping(8)];
      const T_END = 6;
      const stretch = () => -bob.pos.y - REST;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          stepBodies([bob], sim.t, dt);
          sim.t += dt;
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const s = stretch();
          const diff = (s - TARGET_STRETCH) * 100;
          if (Math.abs(diff) <= 0.3) return { success: true, message: `Settled at ${f(s * 100, 1)} cm. On the mark!` };
          return { success: false, message: `Settled at ${f(s * 100, 1)} cm. ${diff < 0 ? "Add mass." : "Less mass."}` };
        },
        draw(r, ov) {
          wall(r, "#f2e6cf", "wallpaper");
          // ruler board behind the scale markings
          r.rect(-0.37, -REST - 0.43, 0.12, 0.47, "#fffdf5", "#d6c7a8", 3);
          plank(r, 0, 0.035, 0.9, 0.07, 0, "#a47148");
          r.circle(0, 0, 0.012, "#64748b", undefined, 3);
          // marks
          const yRest = -REST;
          const yMark = -REST - TARGET_STRETCH;
          r.line(-0.35, yRest, 0.35, yRest, "#9ca3af", 1.5, [5, 4]);
          r.text("relaxed", 0.36, yRest, { size: 11, align: "left", color: "#6b7280" });
          r.line(-0.35, yMark, 0.35, yMark, "#e63946", 2.5, [8, 4]);
          r.text(`red mark (${f(TARGET_STRETCH * 100, 1)} cm)`, 0.36, yMark, { size: 11, align: "left", color: "#b91c1c", bold: true });
          // cm ruler
          for (let c = 0; c <= 40; c += 5) {
            const y = yRest - c / 100;
            r.line(-0.3, y, -0.27, y, "#4b5563", 1);
            r.text(`${c}`, -0.32, y, { size: 10, align: "right", color: "#4b5563" });
          }
          r.text("cm", -0.34, yRest + 0.03, { size: 10, align: "right", color: "#4b5563" });
          // spring + bag of produce
          const bot = bob.pos.y + 0.06;
          coil(r, new Vec2(0, 0), new Vec2(0, bot), 14, 0.1, COLORS.spring);
          const w = 0.09 + 0.02 * m;
          groceryBag(r, 0, bot, w * 1.15);
          r.text(`${f(m, 1)} kg`, 0, bob.pos.y - w * 0.4, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
          const c = new Vec2(0, bob.pos.y - w * 0.4);
          if (ov.forces) {
            r.arrow(c.add(new Vec2(-0.1, 0)), new Vec2(0, -m * G), 1.6, COLORS.gravity, "mg");
            const fs = bob.lastForces[1]?.value ?? Vec2.zero();
            r.arrow(c.add(new Vec2(0.1, 0)), fs, 1.6, COLORS.spring, "kΔx");
          }
          if (ov.velocity) r.arrow(c.add(new Vec2(0.22, 0)), bob.vel, 120, COLORS.velocity, "v");
          r.hud([`t = ${f(sim.t, 2)} s`, `stretch = ${f(stretch() * 100, 1)} cm`]);
        },
        readouts: () => [
          { label: "Stretch Δx", value: `${f(stretch() * 100, 2)} cm` },
          { label: "Spring force kΔx", value: `${f(K * stretch(), 2)} N` },
          { label: "Weight mg", value: `${f(m * G, 2)} N` },
          { label: "Velocity", value: `${f(bob.vel.y, 3)} m/s` },
        ],
        equation: () =>
          String.raw`F_s = k\Delta x = (${K})(${n(stretch(), 3)}) = ${n(K * stretch(), 2)}\text{ N}\quad\text{vs.}\quad mg = ${n(m * G, 2)}\text{ N}`,
        sample: () => [stretch() * 100],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 6-3  Take the Curve   (friction as centripetal force)               */
/* ------------------------------------------------------------------ */
const takeTheCurve = defineLevel((v) => {
  const R_CURVE = v.num(50, 0);
  const MU_S_ROAD = v.num(0.6, 2);
  const MU_K_ROAD = roundTo(MU_S_ROAD * 0.83, 2);
  const CAR_M = 1200;
  const ROAD_HALF = 4;
  const vmax = Math.sqrt(MU_S_ROAD * G * R_CURVE);
  const MIN_FAST = roundTo(vmax - 1.6, 1);
  const sc = { min: 5, max: 30, step: 0.5 };
  return {
    id: "6-3",
    chapter: 6,
    title: "Take the Curve",
    hook: `Set the speed sign for a flat curve: radius ${R_CURVE} m, μs = ${f(MU_S_ROAD, 2)}.`,
    goal: `Fastest safe speed (at least ${f(MIN_FAST, 1)} m/s).`,
    controls: [{ key: "speed", label: "Car speed v", ...sc, value: 10, unit: "m/s" }],
    predict: {
      prompt: "Halfway around, the road turns to perfect ice (no friction at all). Which way does the car go?",
      options: [
        "Straight ahead, along the tangent to the curve",
        "Keeps following the curve",
        "Straight outward, away from the center",
        "Spirals in toward the center",
      ],
      correct: 0,
      why: "With no sideways force there's nothing to turn the car, so by Newton's 1st law it continues in a straight line in whatever direction it was moving: along the tangent.",
    },
    explain: {
      prompt: "What force keeps the car moving in a circle?",
      options: [
        "Static friction from the road, pointing toward the center of the curve",
        "A centrifugal force pushing outward",
        "The engine pushing the car forward",
      ],
      correct: 0,
      why: "Circular motion needs a net force toward the center: f = mv²/r. On a flat road only friction can supply it, and it can't exceed μs mg.",
    },
    hints: [
      "Compare “needed” with “max” friction.",
      "v_max = √(μs g r).",
      `√(${f(MU_S_ROAD, 2)} · 9.81 · ${R_CURVE}) ≈ ${f(vmax, 1)} m/s. That's where it starts to skid: stay just under it.`,
    ],
    journal: {
      title: "Circular motion",
      tex: String.raw`f_c = ma_c = \frac{mv^2}{r} \le \mu_s mg \;\Rightarrow\; v_{max} = \sqrt{\mu_s g r}`,
      note: "Turning needs a force toward the center.",
    },
    view: { xMin: -0.4 * R_CURVE, xMax: R_CURVE + 10, yMin: -R_CURVE - 8, yMax: R_CURVE + 8 },
    graph: {
      title: "Sideways friction force",
      yLabel: "force (kN)",
      tMax: 10,
      yMin: 0,
      yMax: Math.ceil((MU_S_ROAD * CAR_M * G * 1.5) / 1000),
      series: [
        { label: "needed mv²/r", color: COLORS.friction },
        { label: "max μs·mg", color: COLORS.gravity },
      ],
    },
    solution: { speed: snap(sc, vmax, "down") },
    wrong: { speed: snap(sc, vmax + 3) },
    create(p) {
      const v = p.speed;
      const skids = v > vmax;
      const car = new Body(CAR_M, new Vec2(0, -R_CURVE), new Vec2(v, 0));
      const fmax = MU_S_ROAD * CAR_M * G;
      car.forces = [
        {
          id: "friction",
          label: skids ? "f_k" : "f_s",
          color: COLORS.friction,
          compute: (b) => {
            const sp = b.vel.len();
            const left = b.vel.perp().norm(); // toward the inside of a CCW turn
            if (!skids) return b.pos.scale(-1).norm().scale((b.mass * sp * sp) / b.pos.len());
            return left.scale(MU_K_ROAD * b.mass * G);
          },
        },
      ];
      const trail: Vec2[] = [car.pos];
      let done = false;
      let offRoad = false;
      let swept = 0;
      let prevAng = Math.atan2(car.pos.y, car.pos.x);
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (done) return;
          stepBodies([car], sim.t, dt);
          sim.t += dt;
          const ang = Math.atan2(car.pos.y, car.pos.x);
          let d = ang - prevAng;
          if (d > Math.PI) d -= 2 * Math.PI;
          if (d < -Math.PI) d += 2 * Math.PI;
          swept += d;
          prevAng = ang;
          if (Math.abs(car.pos.len() - R_CURVE) > ROAD_HALF) {
            offRoad = true;
            done = true;
          }
          if (swept >= Math.PI) done = true;
          if (sim.t % (1 / 30) < dt) trail.push(car.pos);
        },
        isDone: () => done || sim.t > 60,
        outcome() {
          if (offRoad) return { success: false, message: `Skidded! Needed ${f((CAR_M * v * v) / R_CURVE / 1000, 1)} kN, road gives ${f(fmax / 1000, 1)} kN.` };
          if (v < MIN_FAST) return { success: false, message: `Safe, but too slow. Go ≥ ${f(MIN_FAST, 1)} m/s.` };
          return { success: true, message: `Made it at ${f(v)} m/s, using ${f(((v * v) / R_CURVE / (MU_S_ROAD * G)) * 100, 0)}% of the grip!` };
        },
        draw(r, ov) {
          lawn(r);
          const ctx = r.ctx;
          const cx = r.sx(0),
            cy = r.sy(0);
          const ring = (rad: number) => {
            ctx.beginPath();
            ctx.arc(cx, cy, rad * r.scale, 0, Math.PI * 2);
          };
          // asphalt ring
          ctx.beginPath();
          ctx.arc(cx, cy, (R_CURVE + ROAD_HALF) * r.scale, 0, Math.PI * 2);
          ctx.arc(cx, cy, (R_CURVE - ROAD_HALF) * r.scale, 0, Math.PI * 2, true);
          ctx.fillStyle = noisePattern(ctx, "#5a6170");
          ctx.fill();
          // red/white kerbs on both edges
          for (const rad of [R_CURVE + ROAD_HALF, R_CURVE - ROAD_HALF]) {
            ring(rad);
            ctx.strokeStyle = "#f8fafc";
            ctx.lineWidth = Math.max(3, r.scale * 0.6);
            ctx.stroke();
            ring(rad);
            ctx.setLineDash([Math.max(6, r.scale * 1.2), Math.max(6, r.scale * 1.2)]);
            ctx.strokeStyle = "#dc2626";
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ring(R_CURVE);
          ctx.setLineDash([10, 10]);
          ctx.strokeStyle = "rgba(250,214,92,.95)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          // infield trees
          for (const [fx, fy, fr] of [
            [-0.4, 0.36, 0.08],
            [0.32, 0.44, 0.07],
            [0.44, -0.24, 0.09],
            [0.2, 0.7, 0.06],
            [0.6, 0.2, 0.06],
          ] as [number, number, number][])
            treeTop(r, fx * R_CURVE, fy * R_CURVE, fr * R_CURVE);
          r.circle(0, 0, 1, "#334155");
          r.text("center", 0, -4, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
          r.line(0, 0, 0, -R_CURVE, "#374151", 1, [4, 4]);
          r.text(`r = ${R_CURVE} m`, 2, -R_CURVE / 2, { size: 11, align: "left", bold: true, bg: "rgba(255,255,255,.85)" });
          const sy = -0.8 * R_CURVE;
          r.rect(-14, sy, 10, 7, "#ffffff", "#475569", 4);
          r.text("SPEED", -9, sy + 5.4, { size: 10, bold: true });
          r.text(`${f(v)} m/s`, -9, sy + 2.4, { size: 12, bold: true });
          if (ov.trail) r.path(trail, "rgba(213,94,0,.8)", 2.5);
          const ang = Math.atan2(car.vel.y, car.vel.x);
          carTop(r, car.pos.x, car.pos.y, 7, 3.4, ang, skids ? "#f97316" : "#2563eb"); // drawn ~1.5× size for visibility
          const P = car.pos;
          if (ov.forces && !done) {
            const fv = car.lastForces[0]?.value ?? Vec2.zero();
            r.arrow(P, fv, 70 / fmax, COLORS.friction, skids ? "f_k" : "f_s");
          }
          if (ov.velocity && !done) r.arrow(P, car.vel, 4, COLORS.velocity, "v");
          r.hud([`t = ${f(sim.t, 1)} s`, `needed: ${f((CAR_M * v * v) / R_CURVE / 1000, 1)} kN   max: ${f(fmax / 1000, 1)} kN`]);
        },
        readouts: () => [
          { label: "Speed", value: `${f(car.vel.len(), 1)} m/s` },
          { label: "Needed mv²/r", value: `${f((CAR_M * v * v) / R_CURVE / 1000, 2)} kN` },
          { label: "Max friction μs·mg", value: `${f(fmax / 1000, 2)} kN` },
          { label: "Distance from center", value: `${f(car.pos.len(), 1)} m` },
        ],
        equation: () =>
          String.raw`\frac{mv^2}{r} = \frac{(1200)(${n(v)})^2}{${R_CURVE}} = ${n((CAR_M * v * v) / R_CURVE, 0)}\text{ N}\; ${skids ? ">" : "\\le"}\; \mu_s mg = ${n(fmax, 0)}\text{ N}`,
        sample: () => [(CAR_M * v * v) / R_CURVE / 1000, fmax / 1000],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 6-4  Steady Push   (kinetic friction, constant velocity → ΣF = 0)   */
/* ------------------------------------------------------------------ */
const steadyPush = defineLevel((v) => {
  const M = v.num(40, 0);
  const MU_K = v.num(0.3, 2);
  const V0 = v.num(1.2, 1);
  const fk = MU_K * M * G;
  const T_END = 4;
  const fc = { min: 0, max: 300, step: 0.5 };
  return {
    id: "6-4",
    chapter: 6,
    title: "Steady Push",
    hook: `You give a ${M} kg crate a shove to ${f(V0, 1)} m/s across a floor with μk = ${f(MU_K, 2)}, then keep pushing horizontally.`,
    goal: "Keep it sliding at a steady speed for 4 s (speed changes < 0.05 m/s).",
    controls: [{ key: "F", label: "Your push F", ...fc, value: snap(fc, fk * 0.45), unit: "N" }],
    predict: {
      prompt: "To keep the crate sliding at a constant speed, your push must be…",
      options: ["Bigger than friction", "Exactly equal to friction", "A bit smaller than friction", "Zero: it keeps going by itself"],
      correct: 1,
      why: "Constant velocity means zero acceleration, so the net force must be zero. Your push only has to cancel friction, not beat it.",
    },
    explain: {
      prompt: "Why doesn't steady motion need a push bigger than friction?",
      options: [
        "a = 0 means ΣF = 0, so push and friction cancel; a bigger push would make it speed up",
        "Bigger pushes are wasted as heat",
        "Friction disappears once the crate is moving",
      ],
      correct: 0,
      why: "A net force changes velocity. With push = friction the crate keeps whatever speed it already has (Newton's 1st law).",
    },
    hints: [
      "Speeding up? Push less. Slowing down? Push more.",
      "Kinetic friction: f = μk·N = μk·m·g.",
      `f = ${f(MU_K, 2)} · ${M} · 9.81 ≈ ${f(fk, 1)} N.`,
    ],
    journal: {
      title: "Kinetic friction",
      tex: String.raw`f_k = \mu_k F_N = \mu_k mg,\qquad v = \text{const} \iff \sum F = 0`,
      note: "Steady motion: push = friction.",
    },
    view: { xMin: -1, xMax: 9, yMin: -0.6, yMax: 2.4, anchor: "bottom" },
    graph: { title: "Speed vs. time", yLabel: "v (m/s)", tMax: T_END, yMin: 0, yMax: Math.ceil(V0 * 2 * 10) / 10, series: [{ label: "speed", color: COLORS.velocity }], target: () => V0, targetLabel: "starting speed" },
    solution: { F: snap(fc, fk) },
    wrong: { F: snap(fc, fk * 1.3) },
    create(p) {
      const crate = new Body(M, Vec2.zero(), new Vec2(V0, 0));
      crate.forces = [
        { id: "push", label: "F", color: COLORS.applied, compute: () => new Vec2(p.F, 0) },
        { id: "friction", label: "f_k", color: COLORS.friction, compute: (b) => (b.vel.x > 1e-9 ? new Vec2(-fk, 0) : Vec2.zero()) },
      ];
      let vMin = V0,
        vMax = V0;
      let stopped = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END) return;
          if (!stopped) {
            stepBodies([crate], sim.t, dt);
            if (crate.vel.x <= 0) {
              crate.vel = Vec2.zero();
              stopped = p.F <= fk; // it can't restart if you push no harder than friction
            }
          }
          vMin = Math.min(vMin, crate.vel.x);
          vMax = Math.max(vMax, crate.vel.x);
          sim.t += dt;
        },
        isDone: () => sim.t >= T_END - 1e-9,
        outcome() {
          const change = crate.vel.x - V0;
          if (vMax - vMin < 0.05) return { success: true, message: `Steady at ${f(crate.vel.x, 2)} m/s. Push ${f(p.F, 1)} N = friction ${f(fk, 1)} N.` };
          return { success: false, message: `Speed ${change > 0 ? "rose" : "fell"} to ${f(crate.vel.x, 2)} m/s. ${change > 0 ? "Push less." : "Push more."}` };
        },
        draw(r, ov) {
          wall(r, "#cbd5e1", "brick");
          const vis = r.visible();
          // warehouse shelving in the background (moves with the floor)
          for (let sx = Math.floor(vis.xMin / 4) * 4; sx < vis.xMax; sx += 4) {
            r.rect(sx + 0.2, 0, 2.6, 2.3, "rgba(71,85,105,.35)", undefined, 2);
            for (const sy of [0.7, 1.45, 2.2]) r.rect(sx + 0.2, sy, 2.6, 0.08, "#64748b");
            for (const [bx, by, bw] of [
              [0.4, 0.06, 0.7],
              [1.3, 0.06, 0.5],
              [0.6, 0.78, 0.6],
              [1.9, 0.78, 0.6],
              [0.3, 1.53, 0.5],
            ])
              r.rect(sx + bx, by, bw, 0.55, "#c9a27e", undefined, 2);
          }
          ground(r, 0, "concrete");
          for (let x = Math.floor(vis.xMin); x < vis.xMax; x += 1) {
            r.line(x, 0, x, -0.15, "#57534e", 1);
            r.text(`${x} m`, x, -0.35, { size: 10, color: "#44403c" });
          }
          const x = crate.pos.x;
          crateArt(r, x, 0.4, 0.8, 0.8, 0);
          r.text(`${M} kg`, x, 0.4, { size: 11, bold: true, bg: "rgba(255,255,255,.85)" });
          // person pushing
          person(r, x - 0.88, 0, 1.7, { pose: "push", shirt: "#0ea5e9", pants: "#1e40af" });
          if (ov.forces) {
            const ppu = 70 / Math.max(fk, p.F, 1);
            r.arrow(new Vec2(x + 0.4, 0.55), new Vec2(p.F, 0), ppu, COLORS.applied, "F");
            if (crate.vel.x > 0) r.arrow(new Vec2(x, 0.02), new Vec2(-fk, 0), ppu, COLORS.friction, "f_k");
          }
          if (ov.velocity) r.arrow(new Vec2(x, 1.0), crate.vel, 50, COLORS.velocity, "v");
          r.hud([`t = ${f(sim.t, 2)} s`, `net force ${f(crate.vel.x > 0 ? p.F - fk : 0, 1)} N`]);
        },
        view() {
          const c = crate.pos.x + 2;
          return { xMin: c - 5, xMax: c + 5, yMin: -0.6, yMax: 2.4, anchor: "bottom" };
        },
        readouts: () => [
          { label: "Your push", value: `${f(p.F, 1)} N` },
          { label: "Friction μk·mg", value: `${f(fk, 1)} N` },
          { label: "Net force", value: `${f(crate.vel.x > 0 ? p.F - fk : 0, 1)} N` },
          { label: "Speed", value: `${f(crate.vel.x, 3)} m/s` },
        ],
        equation: () => String.raw`\sum F = F - \mu_k mg = ${n(p.F, 1)} - ${n(fk, 1)} = ${n(p.F - fk, 1)}\text{ N}`,
        sample: () => [crate.vel.x],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 6-5  Banked Curve   (normal force supplies the centripetal force)   */
/* ------------------------------------------------------------------ */
const bankedCurve = defineLevel((v) => {
  const R = v.num(80, 0);
  const V = v.num(20, 0);
  const thEx = (Math.atan((V * V) / (R * G)) * 180) / Math.PI;
  const ac = { min: 0, max: 45, step: 0.25 };
  const T_END = 5;
  const LANE = 1;
  return {
    id: "6-5",
    chapter: 6,
    title: "Banked Curve",
    hook: `An icy bobsled turn (no friction at all) has radius ${R} m. Sleds take it at ${V} m/s. Tilt the track so they don't slide up or down.`,
    goal: "Sled stays within 1 m of its lane for 5 s.",
    controls: [{ key: "bank", label: "Bank angle θ", ...ac, value: 10, unit: "°" }],
    predict: {
      prompt: "With zero friction, what pushes the sled toward the center of the turn?",
      options: ["The sideways part of the normal force from the tilted track", "Friction", "Gravity's downhill pull", "A centrifugal force"],
      correct: 0,
      why: "On a tilted surface the normal force leans toward the center. Its horizontal part, N sin θ, is the centripetal force.",
    },
    explain: {
      prompt: "Why is there only one right angle for a given speed?",
      options: [
        "Only at that angle does N sin θ exactly equal mv²/r while N cos θ holds up the weight",
        "Steeper is always safer",
        "The angle depends on the sled's mass",
      ],
      correct: 0,
      why: "N cos θ = mg and N sin θ = mv²/r. Divide: tan θ = v²/(rg). Mass cancels. Too steep and the sled slides down; too flat and it slides up and out.",
    },
    hints: [
      "Sliding outward? Bank more. Sliding inward? Bank less.",
      "tan θ = v² / (r g).",
      `tan θ = ${V}² ÷ (${R} · 9.81) ≈ ${f(Math.tan((thEx * Math.PI) / 180), 3)} → θ ≈ ${f(thEx, 1)}°.`,
    ],
    journal: {
      title: "Banked curve",
      tex: String.raw`N\sin\theta = \frac{mv^2}{r},\quad N\cos\theta = mg \;\Rightarrow\; \tan\theta = \frac{v^2}{rg}`,
      note: "A tilted road's normal force does the turning.",
    },
    view: { xMin: -4, xMax: 4, yMin: -2.6, yMax: 2.6 },
    graph: { title: "Drift across the track", yLabel: "drift (m)", tMax: T_END, yMin: -1.5, yMax: 1.5, series: [{ label: "drift (+ = outward)", color: COLORS.velocity }] },
    solution: { bank: snap(ac, thEx) },
    wrong: { bank: snap(ac, thEx + 8) },
    create(p) {
      const th = (p.bank * Math.PI) / 180;
      // acceleration along the slope (+ = up the bank, i.e. outward)
      const aS = ((V * V) / R) * Math.cos(th) - G * Math.sin(th);
      let sPos = 0,
        sVel = 0;
      let off = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (sim.t >= T_END || off) return;
          sPos += sVel * dt + 0.5 * aS * dt * dt;
          sVel += aS * dt;
          sim.t += dt;
          if (Math.abs(sPos) > LANE) off = true;
        },
        isDone: () => off || sim.t >= T_END - 1e-9,
        outcome() {
          if (!off) return { success: true, message: `Held the line: drift only ${f(Math.abs(sPos) * 100, 0)} cm. N sin θ = mv²/r!` };
          return { success: false, message: `Slid ${sPos > 0 ? "up and outward" : "down and inward"}. ${sPos > 0 ? "Bank it more." : "Bank it less."}` };
        },
        draw(r, ov) {
          sky(r, r.sy(-1.2), "day");
          hillsScreen(r, r.sy(-1.2), r.h * 0.18);
          ground(r, -1.2, "grass");
          // cross-section: center of the turn is to the LEFT
          const up = new Vec2(Math.cos(th), Math.sin(th)); // along the slope, outward and up
          const nrm = new Vec2(-Math.sin(th), Math.cos(th));
          const a = up.scale(-3.2),
            b = up.scale(3.2);
          r.poly([[a.x, a.y], [b.x, b.y], [b.x, -2.6], [a.x, -2.6]], "#cbd5e1", "#64748b");
          r.poly([[a.x, a.y], [b.x, b.y], [b.x + nrm.x * -0.12, b.y - 0.12 * nrm.y], [a.x - nrm.x * 0.12, a.y - 0.12 * nrm.y]], "#4b5563");
          r.line(a.x, a.y, b.x, b.y, "#374151", 3);
          const l1 = up.scale(-LANE),
            l2 = up.scale(LANE);
          r.line(l1.x, l1.y, l1.x + nrm.x * 0.3, l1.y + nrm.y * 0.3, "#e63946", 3);
          r.line(l2.x, l2.y, l2.x + nrm.x * 0.3, l2.y + nrm.y * 0.3, "#e63946", 3);
          r.textPx("← center of the turn", 16, r.h - 18, { size: 12, align: "left", bold: true, color: "#fff", bg: "#1e3a8a" });
          // race car seen from behind, tilted with the bank
          const c = up.scale(sPos).add(nrm.scale(0.25));
          const wL = up.scale(sPos - 0.32).add(nrm.scale(0.1)),
            wR = up.scale(sPos + 0.32).add(nrm.scale(0.1));
          tyre(r, wL.x, wL.y, 0.11);
          tyre(r, wR.x, wR.y, 0.11);
          r.rotRect(c.x, c.y, 0.9, 0.36, th, "#D55E00");
          const cab = c.add(nrm.scale(0.22));
          r.rotRect(cab.x, cab.y, 0.5, 0.18, th, "#2c3e57");
          const tl = c.add(up.scale(-0.36)),
            tr = c.add(up.scale(0.36));
          r.circle(tl.x, tl.y, 0.04, "#ff3b3b", undefined, 3);
          r.circle(tr.x, tr.y, 0.04, "#ff3b3b", undefined, 3);
          if (ov.forces) {
            const mg = 9.81;
            const N = mg * Math.cos(th) + ((V * V) / R) * Math.sin(th); // per kg
            r.arrow(c, new Vec2(0, -mg), 9, COLORS.gravity, "mg");
            r.arrow(c, nrm.scale(N), 9, COLORS.normal, "N");
            r.arrow(c.add(new Vec2(0, -0.6)), new Vec2(-N * Math.sin(th), 0), 9, COLORS.acceleration, "N sin θ");
          }
          if (ov.velocity) r.arrow(c.add(nrm.scale(0.4)), up.scale(sVel), 60, COLORS.velocity, "drift v");
          r.hud([`θ = ${f(p.bank, 2)}°   t = ${f(sim.t, 2)} s`, `needed inward: ${f((V * V) / R, 2)} m/s²`]);
        },
        readouts: () => [
          { label: "Needed v²/r", value: `${f((V * V) / R, 2)} m/s²` },
          { label: "Supplied g·tan θ", value: `${f(G * Math.tan(th), 2)} m/s²` },
          { label: "Drift across track", value: `${f(sPos * 100, 1)} cm` },
          { label: "Bank angle", value: `${f(p.bank, 2)}°` },
        ],
        equation: () => String.raw`\tan\theta = ${n(Math.tan(th), 3)}\quad\text{vs.}\quad\frac{v^2}{rg} = \frac{${V}^2}{(${R})(9.81)} = ${n((V * V) / (R * G), 3)}`,
        sample: () => [sPos],
      };
      return sim;
    },
  };
});

export const chapter6 = [willItSlide, springScale, takeTheCurve, steadyPush, bankedCurve];
