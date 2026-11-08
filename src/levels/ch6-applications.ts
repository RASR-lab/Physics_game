import { Body, G, stepBodies } from "../physics/core";
import { COLORS, damping, gravity, spring } from "../physics/forces";
import { maxCurveSpeed } from "../physics/analytic";
import { Vec2, rad } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n } from "./util";

/* ------------------------------------------------------------------ */
/* 6-1  Will It Slide?   (static & kinetic friction on a ramp)         */
/* ------------------------------------------------------------------ */
const MU_S = 0.45;
const MU_K = 0.3;
const RAMP_L = 8;

const willItSlide: Level = {
  id: "6-1",
  chapter: 6,
  title: "Will It Slide?",
  hook: "A crate sits on a wooden ramp. μs = 0.45, μk = 0.30.",
  goal: "Steepest angle (≥ 23°) where it doesn't slide.",
  controls: [
    { key: "angle", label: "Ramp angle θ", min: 0, max: 40, step: 0.5, value: 10, unit: "°" },
    { key: "mass", label: "Crate mass", min: 1, max: 50, step: 1, value: 10, unit: "kg" },
  ],
  predict: {
    prompt: "Double the mass. The slip angle…",
    options: ["Gets steeper", "Stays the same", "Gets shallower"],
    correct: 1,
    why: "Pull and friction both double. Mass cancels: tan θ = μs.",
  },
  explain: {
    prompt: "Why doesn't mass matter?",
    options: ["Pull and max friction both grow with mass", "Friction ignores the normal force", "Heavier crates have lower μs"],
    correct: 0,
    why: "mg sin θ = μs mg cos θ → tan θ = μs.",
  },
  hints: [
    "Watch the orange friction arrow grow.",
    "Slips when mg sin θ > μs mg cos θ.",
    "tan θ = 0.45 → θ ≈ 24°.",
  ],
  journal: {
    title: "Friction",
    tex: String.raw`f_s \le \mu_s F_N,\qquad f_k = \mu_k F_N,\qquad \text{slips when } \tan\theta > \mu_s`,
    note: "Static friction adjusts, up to μs·N.",
  },
  view: { xMin: -1, xMax: 10, yMin: -1, yMax: 6.5, anchor: "bottom" },
  graph: { title: "Speed along the ramp", yLabel: "v (m/s)", tMax: 2.5, yMin: 0, yMax: 4, series: [{ label: "speed", color: COLORS.velocity }] },
  solution: { angle: 24, mass: 10 },
  wrong: { angle: 30, mass: 10 },
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
        if (slides) return { success: false, message: `Slid! tan θ = ${f(ratio, 2)} > 0.45. Lower it.` };
        if (p.angle < 23) return { success: false, message: "Held, but go steeper (≥ 23°)." };
        return { success: true, message: `Held at ${p.angle}°. Right at the edge!` };
      },
      draw(r, ov) {
        r.clear();
        r.rect(-5, -1, 20, 1, "#a3a3a3");
        const top = new Vec2(RAMP_L * Math.cos(th), RAMP_L * Math.sin(th));
        r.poly([[0, 0], [top.x, top.y], [top.x, 0]], "#d6a86b", "#7c4a1e");
        r.rect(top.x, 0, 1.2, top.y + 0.01, "#475569");
        // angle arc
        const ctx = r.ctx;
        ctx.beginPath();
        ctx.arc(r.sx(0), r.sy(0), 40, -th, 0);
        ctx.strokeStyle = "#111827";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        r.textPx(`θ = ${p.angle}°`, r.sx(0) + 62, r.sy(0) - 12, { size: 12, bold: true });
        const s = crate.pos.x;
        const along = new Vec2(Math.cos(th), Math.sin(th));
        const up = new Vec2(-Math.sin(th), Math.cos(th));
        const size = 0.55 + 0.012 * m;
        const c = along.scale(s).add(up.scale(size / 2));
        r.rotRect(c.x, c.y, size, size, th, "#b45309");
        r.text(`${m} kg`, c.x, c.y, { size: 10, color: "#fff", bold: true });
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

/* ------------------------------------------------------------------ */
/* 6-2  Spring Scale   (Hooke's law, F = −kΔx)                         */
/* ------------------------------------------------------------------ */
const K = 200;
const REST = 0.3;
const TARGET_STRETCH = 0.147;

const springScale: Level = {
  id: "6-2",
  chapter: 6,
  title: "Spring Scale",
  hook: "Spring scale, k = 200 N/m. Hang a bag to reach the red mark.",
  goal: "Settle on the red mark, 14.7 cm (±0.3).",
  controls: [{ key: "mass", label: "Mass of produce", min: 0.1, max: 5, step: 0.1, value: 1, unit: "kg" }],
  predict: {
    prompt: "Double the mass. The stretch…",
    options: ["Same", "2×", "4×", "Half"],
    correct: 1,
    why: "F = kΔx. 2× weight → 2× stretch.",
  },
  explain: {
    prompt: "Why does it settle there?",
    options: ["Spring force = weight, so net force is 0", "The spring runs out of stretch", "Gravity turns off"],
    correct: 0,
    why: "At rest: kΔx = mg.",
  },
  hints: [
    "Heavier → more stretch.",
    "At rest: kΔx = mg.",
    "m = 200 · 0.147 / 9.81 ≈ 3.0 kg.",
  ],
  journal: {
    title: "Hooke's law",
    tex: String.raw`\vec F_{spring} = -k\,\Delta\vec x \qquad \text{at rest: } k\Delta x = mg`,
    note: "Spring force ∝ stretch.",
  },
  view: { xMin: -0.5, xMax: 0.5, yMin: -0.75, yMax: 0.08 },
  graph: {
    title: "Stretch vs. time",
    yLabel: "stretch Δx (cm)",
    tMax: 6,
    yMin: 0,
    yMax: 20,
    series: [{ label: "stretch", color: COLORS.spring }],
    target: () => TARGET_STRETCH * 100,
    targetLabel: "red mark",
  },
  solution: { mass: 3 },
  wrong: { mass: 2 },
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
        r.clear("#fdf6e3", "#fffdf5");
        r.rect(-0.4, 0, 0.8, 0.05, "#57534e");
        // marks
        const yRest = -REST;
        const yMark = -REST - TARGET_STRETCH;
        r.line(-0.35, yRest, 0.35, yRest, "#9ca3af", 1.5, [5, 4]);
        r.text("relaxed", 0.36, yRest, { size: 11, align: "left", color: "#6b7280" });
        r.line(-0.35, yMark, 0.35, yMark, "#e63946", 2.5, [8, 4]);
        r.text("red mark (14.7 cm)", 0.36, yMark, { size: 11, align: "left", color: "#b91c1c", bold: true });
        // cm ruler
        for (let c = 0; c <= 40; c += 5) {
          const y = yRest - c / 100;
          r.line(-0.3, y, -0.27, y, "#4b5563", 1);
          r.text(`${c}`, -0.32, y, { size: 10, align: "right", color: "#4b5563" });
        }
        r.text("cm", -0.34, yRest + 0.03, { size: 10, align: "right", color: "#4b5563" });
        // spring zigzag
        const top = 0;
        const bot = bob.pos.y + 0.06;
        const coils = 14;
        const pts: Vec2[] = [new Vec2(0, top)];
        for (let i = 1; i < coils * 2; i++) {
          const y = top + ((bot - top) * i) / (coils * 2);
          pts.push(new Vec2(i % 2 ? 0.05 : -0.05, y));
        }
        pts.push(new Vec2(0, bot));
        r.path(pts, COLORS.spring, 2.5);
        // bag of produce
        const w = 0.09 + 0.02 * m;
        r.rect(-w / 2, bob.pos.y - w * 0.9, w, w * 0.9 + 0.06, "#65a30d", "#365314", 8);
        r.text(`${f(m, 1)} kg`, 0, bob.pos.y - w * 0.4, { size: 11, color: "#fff", bold: true });
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
        String.raw`F_s = k\Delta x = (200)(${n(stretch(), 3)}) = ${n(K * stretch(), 2)}\text{ N}\quad\text{vs.}\quad mg = ${n(m * G, 2)}\text{ N}`,
      sample: () => [stretch() * 100],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 6-3  Take the Curve   (friction as centripetal force)               */
/* ------------------------------------------------------------------ */
const R_CURVE = 50;
const MU_S_ROAD = 0.6;
const MU_K_ROAD = 0.5;
const CAR_M = 1200;
const ROAD_HALF = 4;
const MIN_FAST = 15.5;

const takeTheCurve: Level = {
  id: "6-3",
  chapter: 6,
  title: "Take the Curve",
  hook: "Set the speed sign for a flat curve: radius 50 m, μs = 0.6.",
  goal: "Fastest safe speed (at least 15.5 m/s).",
  controls: [{ key: "speed", label: "Car speed v", min: 5, max: 30, step: 0.5, value: 10, unit: "m/s" }],
  predict: {
    prompt: "Sudden ice (no friction). The car goes…",
    options: ["Straight ahead (tangent)", "Keeps curving", "Straight outward", "Spirals inward"],
    correct: 0,
    why: "No sideways force → straight line (1st law).",
  },
  explain: {
    prompt: "What keeps the car on the circle?",
    options: ["Friction, pointing to the center", "Centrifugal force, outward", "The engine"],
    correct: 0,
    why: "Turning needs mv²/r toward the center. Only friction supplies it.",
  },
  hints: [
    "Compare “needed” with “max” friction.",
    "v_max = √(μs g r).",
    "√(0.6 · 9.81 · 50) ≈ 17.2 m/s.",
  ],
  journal: {
    title: "Circular motion",
    tex: String.raw`f_c = ma_c = \frac{mv^2}{r} \le \mu_s mg \;\Rightarrow\; v_{max} = \sqrt{\mu_s g r}`,
    note: "Turning needs a force toward the center.",
  },
  view: { xMin: -20, xMax: 60, yMin: -58, yMax: 58 },
  graph: {
    title: "Sideways friction force",
    yLabel: "force (kN)",
    tMax: 10,
    yMin: 0,
    yMax: 12,
    series: [
      { label: "needed mv²/r", color: COLORS.friction },
      { label: "max μs·mg", color: COLORS.gravity },
    ],
  },
  solution: { speed: 16.5 },
  wrong: { speed: 20 },
  create(p) {
    const v = p.speed;
    const vmax = maxCurveSpeed(MU_S_ROAD, R_CURVE);
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
        if (v < MIN_FAST) return { success: false, message: "Safe, but too slow. Go ≥ 15.5 m/s." };
        return { success: true, message: `Made it at ${f(v)} m/s, using ${f(((v * v) / R_CURVE / (MU_S_ROAD * G)) * 100, 0)}% of the grip!` };
      },
      draw(r, ov) {
        r.clear("#bbf7d0", "#dcfce7");
        const ctx = r.ctx;
        const cx = r.sx(0),
          cy = r.sy(0);
        ctx.beginPath();
        ctx.arc(cx, cy, (R_CURVE + ROAD_HALF) * r.scale, 0, Math.PI * 2);
        ctx.arc(cx, cy, (R_CURVE - ROAD_HALF) * r.scale, 0, Math.PI * 2, true);
        ctx.fillStyle = "#6b7280";
        ctx.fill();
        ctx.beginPath();
        ctx.setLineDash([10, 10]);
        ctx.arc(cx, cy, R_CURVE * r.scale, 0, Math.PI * 2);
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        r.circle(0, 0, 1, "#111827");
        r.text("center", 0, -4, { size: 11 });
        r.line(0, 0, 0, -R_CURVE, "#374151", 1, [4, 4]);
        r.text("r = 50 m", 2, -25, { size: 11, align: "left" });
        r.rect(-14, -40, 10, 7, "#fff", "#111827", 3);
        r.text("SPEED", -9, -34.6, { size: 10, bold: true });
        r.text(`${f(v)} m/s`, -9, -37.6, { size: 12, bold: true });
        if (ov.trail) r.path(trail, "rgba(213,94,0,.8)", 2.5);
        const ang = Math.atan2(car.vel.y, car.vel.x);
        r.rotRect(car.pos.x, car.pos.y, 7, 3.4, ang, skids ? "#f97316" : "#2563eb"); // drawn ~1.5× size for visibility
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
        String.raw`\frac{mv^2}{r} = \frac{(1200)(${n(v)})^2}{50} = ${n((CAR_M * v * v) / R_CURVE, 0)}\text{ N}\; ${skids ? ">" : "\\le"}\; \mu_s mg = ${n(fmax, 0)}\text{ N}`,
      sample: () => [(CAR_M * v * v) / R_CURVE / 1000, fmax / 1000],
    };
    return sim;
  },
};

export const chapter6 = [willItSlide, springScale, takeTheCurve];
