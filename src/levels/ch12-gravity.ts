import { Body, stepBodies } from "../physics/core";
import { COLORS } from "../physics/forces";
import { EARTH_MOON, GM_EARTH, M_EARTH, M_MOON, R_EARTH, gAtAltitude } from "../physics/analytic";
import { Vec2 } from "../physics/vec2";
import type { Force } from "../physics/core";
import type { Level, Sim } from "./types";
import type { Renderer } from "../render/renderer";
import { f, n, seeded } from "./util";

const TAU = 2 * Math.PI;
const KM = 1000;
/** Drawing unit for planet-scale scenes: 1000 km. */
const MM = 1e6;
const GM_MOON = (GM_EARTH * M_MOON) / M_EARTH;
const R_MOON = 1.737e6;

/** Inverse-square pull toward a fixed point: F = GMm / r² (Newton's law of gravitation). */
function pullToward(center: Vec2, GM: number, label: string): Force {
  return {
    id: `grav-${label}`,
    label,
    color: COLORS.gravity,
    compute: (b) => {
      const d = center.sub(b.pos);
      const r = d.len();
      return d.norm().scale((GM * b.mass) / (r * r));
    },
  };
}

function space(r: Renderer, seed = 7) {
  r.clear("#0b1026", "#1e1b4b");
  const v = r.visible();
  const rnd = seeded(seed);
  for (let i = 0; i < 90; i++) {
    const x = v.xMin + rnd() * (v.xMax - v.xMin);
    const y = v.yMin + rnd() * (v.yMax - v.yMin);
    r.circle(x, y, 0, rnd() > 0.85 ? "#fde68a" : "#e5e7eb", undefined, rnd() * 1.4 + 0.4);
  }
}

function earth(r: Renderer, x = 0, y = 0, radius = R_EARTH / MM) {
  r.circle(x, y, radius, "#2563eb", "#93c5fd", 6);
  r.circle(x - radius * 0.3, y + radius * 0.25, radius * 0.35, "#16a34a", undefined, 2);
  r.circle(x + radius * 0.35, y - radius * 0.3, radius * 0.25, "#16a34a", undefined, 1);
}

/* ------------------------------------------------------------------ */
/* 12-1  Half Weight   (a_g = GM / (R + h)²)                            */
/* ------------------------------------------------------------------ */
const TARGET_G = 9.81 / 2;
const ASTRONAUT = 70;
const DROP_T = 1.5;

const halfWeight: Level = {
  id: "12-1",
  chapter: 12,
  title: "Half Weight",
  hook: "A space elevator climbs straight up from Earth. Stop it where a 70 kg astronaut weighs half as much as on the ground.",
  goal: "Gravity there = 4.91 m/s² (±0.05).",
  controls: [{ key: "h", label: "Elevator height above the ground h", min: 0, max: 6000, step: 10, value: 400, unit: "km" }],
  predict: {
    prompt: "The Space Station orbits 400 km up. How strong is gravity up there, compared with on the ground?",
    options: ["Zero (that's why astronauts float)", "About 10%", "About 50%", "About 90%"],
    correct: 3,
    why: "400 km is small next to Earth's 6371 km radius, so g = GM/(R+h)² is still about 8.7 m/s², roughly 90%. Astronauts float because they're falling around Earth along with the station, not because gravity is gone.",
  },
  explain: {
    prompt: "Why isn't the answer h = 6371 km (doubling your distance from Earth's center)?",
    options: [
      "Gravity goes as 1/r², so doubling r cuts it to a quarter. Half needs r only √2 times bigger",
      "Gravity goes as 1/r, so doubling r is exactly half",
      "Gravity doesn't depend on distance",
    ],
    correct: 0,
    why: "a_g ∝ 1/r². For half: (R/r)² = ½ → r = √2·R ≈ 9010 km from the center, about 2640 km above the ground.",
  },
  hints: [
    "Distance is measured from Earth's center, not the ground.",
    "Half gravity: (R + h)² = 2R² → R + h = √2·R.",
    "h = (1.414 − 1) × 6371 km ≈ 2640 km.",
  ],
  journal: {
    title: "Newton's gravity",
    tex: String.raw`F_g = \frac{Gm_1m_2}{r^2},\qquad a_g = \frac{GM_E}{(R_E + h)^2}`,
    note: "Inverse square: 2× distance → ¼ the pull.",
  },
  view: { xMin: -9, xMax: 9, yMin: -7.2, yMax: 13.2 },
  graph: {
    title: "Dropped wrench: distance fallen",
    yLabel: "fallen (m)",
    tMax: DROP_T,
    yMin: 0,
    yMax: 12,
    series: [{ label: "your height", color: COLORS.gravity }],
    target: (t) => 0.5 * TARGET_G * t * t,
    targetLabel: "half-g target",
  },
  solution: { h: 2640 },
  wrong: { h: 6370 },
  create(p) {
    const h = p.h * KM;
    const r0 = R_EARTH + h;
    // A wrench dropped from rest inside the elevator (simulated with the full 1/r² force).
    const wrench = new Body(0.5, new Vec2(0, r0));
    wrench.forces = [pullToward(Vec2.zero(), GM_EARTH, "F_g")];
    const g = gAtAltitude(h);
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (sim.t >= DROP_T) return;
        stepBodies([wrench], sim.t, dt);
        sim.t += dt;
      },
      isDone: () => sim.t >= DROP_T - 1e-9,
      outcome() {
        const gm = (2 * (r0 - wrench.pos.y)) / (sim.t * sim.t); // measured from the drop
        if (Math.abs(gm - TARGET_G) <= 0.05) return { success: true, message: `g = ${f(gm, 2)} m/s². The astronaut weighs ${f(ASTRONAUT * gm, 0)} N, half of ${f(ASTRONAUT * 9.81, 0)} N!` };
        return { success: false, message: `g = ${f(gm, 2)} m/s² (${f((gm / 9.81) * 100, 0)}% of ground). ${gm > TARGET_G ? "Go higher." : "Go lower."}` };
      },
      draw(r, ov) {
        space(r);
        earth(r);
        const top = R_EARTH / MM + p.h / 1000;
        r.line(0, R_EARTH / MM, 0, 13, "#9ca3af", 2, [6, 4]);
        // ISS orbit for reference
        const ctx = r.ctx;
        ctx.beginPath();
        ctx.arc(r.sx(0), r.sy(0), ((R_EARTH + 400 * KM) / MM) * r.scale, 0, TAU);
        ctx.strokeStyle = "rgba(253,230,138,.5)";
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        r.textPx("dotted ring = Space Station orbit (400 km)", 14, r.h - 16, { size: 11, align: "left", color: "#fde68a" });
        r.rect(-0.35, top - 0.3, 0.7, 0.6, "#e5e7eb", "#111827", 4);
        r.text(`h = ${p.h} km`, 0.6, top, { size: 12, bold: true, align: "left", color: "#fff" });
        r.text(`r = R + h = ${f((R_EARTH + h) / KM, 0)} km`, 0.6, top - 0.75, { size: 11, align: "left", color: "#cbd5e1" });
        r.line(0, 0, -6.371 * Math.cos(0.6), -6.371 * Math.sin(0.6), "#fff", 1.5, [4, 3]);
        r.text("R = 6371 km", -2.6, -2.5, { size: 11, color: "#fff", bg: "rgba(15,23,42,.6)" });
        if (ov.forces) {
          r.arrow(new Vec2(-0.5, top), new Vec2(0, -ASTRONAUT * g), 0.12, COLORS.acceleration, "weight");
          // weight bars: on the ground vs. here (screen space, top-right)
          const W = 150;
          const x0 = r.w - W - 20;
          const bar = (y: number, frac: number, label: string, color: string) => {
            r.ctx.fillStyle = "rgba(255,255,255,.15)";
            r.ctx.fillRect(x0, y, W, 14);
            r.ctx.fillStyle = color;
            r.ctx.fillRect(x0, y, W * frac, 14);
            r.textPx(label, x0 - 6, y + 7, { size: 11, align: "right", color: "#fff", bold: true });
          };
          bar(16, 1, `ground ${f(ASTRONAUT * 9.81, 0)} N`, "rgba(86,180,233,.55)");
          bar(38, g / 9.81, `here ${f(ASTRONAUT * g, 0)} N`, COLORS.acceleration);
          r.ctx.fillStyle = "#e63946";
          r.ctx.fillRect(x0 + W / 2 - 1, 12, 2, 44);
          r.textPx("½", x0 + W / 2, 66, { size: 11, color: "#fca5a5", bold: true });
        }
        r.hud([`g here = ${f(g, 2)} m/s²`, `astronaut weighs ${f(ASTRONAUT * g, 0)} N`]);
      },
      readouts: () => [
        { label: "Distance from center r", value: `${f((R_EARTH + h) / KM, 0)} km` },
        { label: "Gravity here a_g", value: `${f(g, 3)} m/s²` },
        { label: "Fraction of ground g", value: `${f((g / 9.81) * 100, 1)} %` },
        { label: "Wrench has fallen", value: `${f(r0 - wrench.pos.y, 2)} m` },
      ],
      equation: () => String.raw`a_g = \frac{GM_E}{(R_E+h)^2} = \frac{3.98\times10^{14}}{(${n((R_EARTH + h) / 1e6, 3)}\times10^{6})^2} = ${n(g, 2)}\text{ m/s}^2`,
      sample: () => [r0 - wrench.pos.y],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 12-2  Into Orbit   (GMm/r² = mv²/r)                                  */
/* ------------------------------------------------------------------ */
const ALT0 = 400 * KM;
const ORBIT_TS = 600; // each game second is 10 minutes of mission time

const intoOrbit: Level = {
  id: "12-2",
  chapter: 12,
  title: "Into Orbit",
  hook: "Your rocket lifts a satellite to 400 km and points it sideways. How fast must it go to circle Earth without falling back?",
  goal: "One full orbit, staying 350–450 km up.",
  controls: [{ key: "v", label: "Sideways speed v", min: 5000, max: 11000, step: 10, value: 6000, unit: "m/s" }],
  predict: {
    prompt: "A satellite twice as heavy wants the same 400 km circular orbit. It needs to go…",
    options: ["Faster", "Slower", "The same speed"],
    correct: 2,
    why: "GMm/r² = mv²/r. The satellite's mass m is on both sides and cancels: v = √(GM/r) only depends on the planet and the radius.",
  },
  explain: {
    prompt: "What is a satellite in orbit really doing?",
    options: [
      "Falling the whole time, but moving sideways so fast that Earth's surface curves away beneath it",
      "Floating because there's no gravity in space",
      "Being pushed outward by a centrifugal force that cancels gravity",
    ],
    correct: 0,
    why: "Gravity is the centripetal force. It bends the path into a circle when mv²/r exactly matches GMm/r². Too slow and the fall wins; too fast and it swings out (or escapes).",
  },
  hints: [
    "Too slow → crash. Too fast → swings out wide.",
    "Gravity = centripetal force: GM/r² = v²/r → v = √(GM/r).",
    "r = 6771 km: v = √(3.98×10¹⁴ ÷ 6.771×10⁶) ≈ 7670 m/s.",
  ],
  journal: {
    title: "Orbits",
    tex: String.raw`\frac{GMm}{r^2} = \frac{mv^2}{r} \;\Rightarrow\; v = \sqrt{\frac{GM}{r}}`,
    note: "An orbit is falling sideways forever.",
  },
  view: { xMin: -9, xMax: 9, yMin: -9, yMax: 9 },
  graph: { title: "Altitude vs. time", yLabel: "altitude (km)", tMax: 12, yMin: 0, yMax: 800, series: [{ label: "altitude", color: COLORS.velocity }], target: () => 400, targetLabel: "400 km" },
  solution: { v: 7670 },
  wrong: { v: 7000 },
  create(p) {
    const sat = new Body(1000, new Vec2(0, R_EARTH + ALT0), new Vec2(-p.v, 0));
    sat.forces = [pullToward(Vec2.zero(), GM_EARTH, "F_g")];
    const trail: Vec2[] = [new Vec2(0, (R_EARTH + ALT0) / MM)];
    let swept = 0;
    let prevAng = Math.atan2(sat.pos.y, sat.pos.x);
    let minAlt = ALT0,
      maxAlt = ALT0;
    let crashed = false,
      escaped = false,
      done = false;
    const alt = () => sat.pos.len() - R_EARTH;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        stepBodies([sat], sim.t * ORBIT_TS, dt * ORBIT_TS);
        sim.t += dt;
        const a = alt();
        minAlt = Math.min(minAlt, a);
        maxAlt = Math.max(maxAlt, a);
        const ang = Math.atan2(sat.pos.y, sat.pos.x);
        let d = ang - prevAng;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        swept += Math.abs(d);
        prevAng = ang;
        if (sim.t % (1 / 30) < dt) trail.push(sat.pos.scale(1 / MM));
        if (a <= 0) crashed = done = true;
        else if (sat.pos.len() > 4 * R_EARTH) escaped = done = true;
        else if (swept >= TAU) done = true;
        else if (sim.t > 20) done = true;
      },
      isDone: () => done,
      outcome() {
        if (crashed) return { success: false, message: `Fell back to Earth after ${f((sim.t * ORBIT_TS) / 60, 0)} minutes. Go faster.` };
        if (escaped) return { success: false, message: "Escaped Earth's pull entirely! Way too fast." };
        if (minAlt < 350 * KM) return { success: false, message: `Orbit dipped to ${f(minAlt / KM, 0)} km. A bit faster.` };
        if (maxAlt > 450 * KM) return { success: false, message: `Orbit swung out to ${f(maxAlt / KM, 0)} km. A bit slower.` };
        return { success: true, message: `Orbit complete in ${f((sim.t * ORBIT_TS) / 60, 0)} min, staying ${f(minAlt / KM, 0)}–${f(maxAlt / KM, 0)} km up!` };
      },
      draw(r, ov) {
        space(r, 11);
        earth(r);
        const ctx = r.ctx;
        ctx.beginPath();
        ctx.arc(r.sx(0), r.sy(0), ((R_EARTH + ALT0) / MM) * r.scale, 0, TAU);
        ctx.strokeStyle = "rgba(0,158,115,.45)";
        ctx.lineWidth = Math.max(3, ((100 * KM) / MM) * r.scale); // the 350–450 km safe band
        ctx.stroke();
        if (ov.trail) r.path(trail, "rgba(253,186,116,.9)", 2);
        const P = sat.pos.scale(1 / MM);
        r.rotRect(P.x, P.y, 0.45, 0.22, Math.atan2(sat.vel.y, sat.vel.x), "#e5e7eb");
        if (ov.velocity && !crashed) r.arrow(P, sat.vel, 0.008, COLORS.velocity, "v");
        if (ov.forces && !crashed) r.arrow(P, sat.lastForces[0]?.value ?? sat.pos.scale(-1), 6, COLORS.gravity, "F_g");
        r.hud([`mission time ${f((sim.t * ORBIT_TS) / 60, 0)} min`, `altitude ${f(alt() / KM, 0)} km`]);
      },
      readouts: () => {
        const rr = sat.pos.len();
        return [
          { label: "Speed v", value: `${f(sat.vel.len(), 0)} m/s` },
          { label: "Altitude", value: `${f(alt() / KM, 0)} km` },
          { label: "Gravity GM/r²", value: `${f(GM_EARTH / (rr * rr), 2)} m/s²` },
          { label: "Needed v²/r", value: `${f(sat.vel.dot(sat.vel) / rr, 2)} m/s²` },
        ];
      },
      equation: () => {
        const rr = sat.pos.len();
        return String.raw`\frac{GM}{r^2} = ${n(GM_EARTH / (rr * rr), 2)}\;\text{vs.}\;\frac{v^2}{r} = \frac{(${n(sat.vel.len(), 0)})^2}{${n(rr / 1e6, 3)}\times10^6} = ${n(sat.vel.dot(sat.vel) / rr, 2)}\text{ m/s}^2`;
      },
      sample: () => [alt() / KM],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 12-3  Tug of War in Space   (F = Gm₁m₂/r², superposition)            */
/* ------------------------------------------------------------------ */
const NEUTRAL_TS = 10800; // 8 game seconds = 1 day
const NEUTRAL_END = 8;
const PROBE_M = 500;

const tugOfWar: Level = {
  id: "12-3",
  chapter: 12,
  title: "Tug of War in Space",
  hook: "Earth and the Moon (81 times lighter) are 384,400 km apart. Park a probe where their pulls cancel. (We freeze the Moon in place for this test.)",
  goal: "Probe drifts less than 1000 km in a day.",
  controls: [{ key: "d", label: "Probe distance from Earth", min: 100, max: 380, step: 1, value: 300, unit: "×1000 km" }],
  predict: {
    prompt: "Where do Earth's pull and the Moon's pull cancel?",
    options: ["Exactly halfway", "Closer to Earth", "Closer to the Moon", "Nowhere: Earth always wins"],
    correct: 2,
    why: "Earth is much heavier, so to cancel its pull you have to be much farther from it, and much closer to the Moon. It's about 90% of the way there.",
  },
  explain: {
    prompt: "The Moon is 81 times less massive. Why is the balance point only 9 times closer to the Moon (not 81)?",
    options: [
      "Pull goes as m/r², so 1/81 the mass is balanced by being 1/9 the distance (since 9² = 81)",
      "Pull goes as m/r, so you need 1/81 the distance",
      "The Moon's gravity works differently from Earth's",
    ],
    correct: 0,
    why: "GM_E/d_E² = GM_M/d_M² → d_E/d_M = √(M_E/M_M) = √81 = 9. The probe sits 9× farther from Earth than from the Moon.",
  },
  hints: [
    "Watch the two blue arrows. Make them the same length.",
    "Equal pulls: M_E/d_E² = M_M/d_M², so d_E = 9·d_M.",
    "d_E = 384,400 × 9/10 ≈ 346,000 km.",
  ],
  journal: {
    title: "Adding gravity",
    tex: String.raw`\frac{GM_E m}{d_E^2} = \frac{GM_M m}{d_M^2} \;\Rightarrow\; \frac{d_E}{d_M} = \sqrt{\frac{M_E}{M_M}}`,
    note: "Pulls add as vectors; mass and distance² both matter.",
  },
  view: { xMin: -20, xMax: 400, yMin: -60, yMax: 60 },
  graph: { title: "Drift from where you parked it", yLabel: "drift (km)", tMax: NEUTRAL_END, yMin: -1500, yMax: 1500, series: [{ label: "drift", color: COLORS.velocity }] },
  solution: { d: 346 },
  wrong: { d: 192 },
  create(p) {
    const x0 = p.d * MM;
    const moonAt = new Vec2(EARTH_MOON, 0);
    const probe = new Body(PROBE_M, new Vec2(x0, 0));
    const fE = pullToward(Vec2.zero(), GM_EARTH, "F_Earth");
    const fM = pullToward(moonAt, GM_MOON, "F_Moon");
    probe.forces = [fE, fM];
    let done = false;
    let hit = "";
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        stepBodies([probe], sim.t * NEUTRAL_TS, dt * NEUTRAL_TS);
        sim.t += dt;
        if (probe.pos.x <= R_EARTH) (hit = "Earth"), (done = true);
        else if (EARTH_MOON - probe.pos.x <= R_MOON) (hit = "the Moon"), (done = true);
        else if (sim.t >= NEUTRAL_END) done = true;
      },
      isDone: () => done,
      outcome() {
        if (hit) return { success: false, message: `Crashed into ${hit}! ${hit === "Earth" ? "Earth's pull won. Move closer to the Moon." : "The Moon's pull won. Move toward Earth."}` };
        const drift = (probe.pos.x - x0) / KM;
        if (Math.abs(drift) < 1000) return { success: true, message: `Drifted only ${f(Math.abs(drift), 0)} km in a whole day. Balanced!` };
        return { success: false, message: `Drifted ${f(Math.abs(drift), 0)} km toward ${drift < 0 ? "Earth. Move closer to the Moon." : "the Moon. Move toward Earth."}` };
      },
      draw(r, ov) {
        space(r, 3);
        r.circle(0, 0, 0, "#2563eb", "#93c5fd", 14);
        r.text("Earth", 0, -22, { size: 12, bold: true, color: "#fff" });
        r.circle(EARTH_MOON / MM, 0, R_MOON / MM, "#d1d5db", "#f9fafb", 7);
        r.text("Moon", EARTH_MOON / MM, -22, { size: 12, bold: true, color: "#fff" });
        r.line(0, -40, EARTH_MOON / MM, -40, "#64748b", 1);
        r.text("384,400 km", EARTH_MOON / MM / 2, -46, { size: 11, color: "#cbd5e1" });
        r.line(EARTH_MOON / MM / 2, -36, EARTH_MOON / MM / 2, 36, "#475569", 1, [4, 4]);
        r.text("halfway", EARTH_MOON / MM / 2, 40, { size: 10, color: "#94a3b8" });
        const P = probe.pos.scale(1 / MM);
        r.line(x0 / MM, -12, x0 / MM, 12, "#fde68a", 1.5, [3, 3]);
        r.circle(P.x, P.y, 0, "#fbbf24", "#111827", 7);
        if (ov.forces && !hit) {
          const FE = probe.lastForces[0]?.value ?? fE.compute(probe, 0);
          const FM = probe.lastForces[1]?.value ?? fM.compute(probe, 0);
          const big = Math.max(FE.len(), FM.len());
          const ppu = 80 / big;
          r.arrow(P.add(new Vec2(0, 8)), FE, ppu, COLORS.gravity, "Earth");
          r.arrow(P.add(new Vec2(0, -8)), FM, ppu, COLORS.acceleration, "Moon");
        }
        if (ov.velocity) r.arrow(P.add(new Vec2(0, 20)), probe.vel, 0.6, COLORS.velocity, "v");
        r.hud([`elapsed ${f((sim.t * NEUTRAL_TS) / 3600, 1)} h`, `drift ${f((probe.pos.x - x0) / KM, 0)} km`]);
      },
      readouts: () => {
        const x = probe.pos.x;
        const FE = (GM_EARTH * PROBE_M) / (x * x);
        const FM = (GM_MOON * PROBE_M) / ((EARTH_MOON - x) * (EARTH_MOON - x));
        return [
          { label: "Earth's pull", value: `${f(FE * 1000, 3)} mN` },
          { label: "Moon's pull", value: `${f(FM * 1000, 3)} mN` },
          { label: "Net force (+ toward Moon)", value: `${f((FM - FE) * 1000, 3)} mN` },
          { label: "Distance to Moon", value: `${f((EARTH_MOON - x) / KM, 0)} km` },
        ];
      },
      equation: () => {
        const x = probe.pos.x;
        const FE = (GM_EARTH * PROBE_M) / (x * x);
        const FM = (GM_MOON * PROBE_M) / ((EARTH_MOON - x) * (EARTH_MOON - x));
        return String.raw`\frac{GM_E m}{d_E^2} = ${n(FE * 1000, 3)}\text{ mN}\quad\text{vs.}\quad\frac{GM_M m}{d_M^2} = ${n(FM * 1000, 3)}\text{ mN}`;
      },
      sample: () => [(probe.pos.x - x0) / KM],
    };
    return sim;
  },
};

export const chapter12 = [halfWeight, intoOrbit, tugOfWar];
