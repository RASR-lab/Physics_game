import { Body, stepBodies } from "../physics/core";
import { COLORS } from "../physics/forces";
import { EARTH_MOON as REAL_EARTH_MOON, GM_EARTH, M_EARTH, M_MOON, R_EARTH, gAtAltitude } from "../physics/analytic";
import { Vec2 } from "../physics/vec2";
import type { Force } from "../physics/core";
import type { Sim } from "./types";
import { space as spaceArt } from "../render/art/backdrops";
import { earth as earthArt, moon as moonArt, satellite } from "../render/art/props";
import type { Renderer } from "../render/renderer";
import { bestOnGrid, defineLevel, f, n, snap } from "./util";

const TAU = 2 * Math.PI;
const KM = 1000;
/** Drawing unit for planet-scale scenes: 1000 km. */
const MM = 1e6;
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
  spaceArt(r, seed);
}

function earth(r: Renderer, x = 0, y = 0, radius = R_EARTH / MM) {
  earthArt(r, x, y, radius, 6);
}

/* ------------------------------------------------------------------ */
/* 12-1  Half Weight   (a_g = GM / (R + h)²)                            */
/* ------------------------------------------------------------------ */
const halfWeight = defineLevel((v) => {
  const FRAC = v.num(0.5, 2); // fraction of ground weight wanted
  const TARGET_G = 9.81 * FRAC;
  const ASTRONAUT = v.num(70, 0);
  const DROP_T = 1.5;
  const hEx = R_EARTH * (1 / Math.sqrt(FRAC) - 1); // m
  const hc = { min: 0, max: 10000, step: 10 };
  const pct = `${f(FRAC * 100, 0)}%`;
  return {
    id: "12-1",
    chapter: 12,
    title: "Half Weight",
    hook: `A space elevator climbs straight up from Earth. Stop it where a ${ASTRONAUT} kg astronaut weighs ${FRAC === 0.5 ? "half" : pct} as much as on the ground.`,
    goal: `Gravity there = ${f(TARGET_G, 2)} m/s² (±0.05).`,
    controls: [{ key: "h", label: "Elevator height above the ground h", ...hc, value: 400, unit: "km" }],
    predict: {
      prompt: "The Space Station orbits 400 km up. How strong is gravity up there, compared with on the ground?",
      options: ["Zero (that's why astronauts float)", "About 10%", "About 50%", "About 90%"],
      correct: 3,
      why: "400 km is small next to Earth's 6371 km radius, so g = GM/(R+h)² is still about 8.7 m/s², roughly 90%. Astronauts float because they're falling around Earth along with the station, not because gravity is gone.",
    },
    explain: {
      prompt: `To get ${pct} of ground gravity, why don't you go to ${f(1 / FRAC, 2)}× your distance from Earth's center?`,
      options: [
        `Gravity goes as 1/r², so r only has to grow by √(1/${f(FRAC, 2)}) ≈ ${f(1 / Math.sqrt(FRAC), 2)}×`,
        "Gravity goes as 1/r, so that would be exactly right",
        "Gravity doesn't depend on distance",
      ],
      correct: 0,
      why: `a_g ∝ 1/r². For ${pct}: (R/r)² = ${f(FRAC, 2)} → r ≈ ${f((R_EARTH + hEx) / KM, 0)} km from the center, about ${f(hEx / KM, 0)} km above the ground.`,
    },
    hints: [
      "Distance is measured from Earth's center, not the ground.",
      `(R/(R + h))² = ${f(FRAC, 2)} → R + h = R ÷ √${f(FRAC, 2)}.`,
      `h = (${f(1 / Math.sqrt(FRAC), 3)} − 1) × 6371 km ≈ ${f(hEx / KM, 0)} km.`,
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
      targetLabel: "target",
    },
    solution: { h: snap(hc, hEx / KM) },
    wrong: { h: snap(hc, (R_EARTH * (1 / FRAC - 1)) / KM) }, // as if gravity went as 1/r
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
          if (Math.abs(gm - TARGET_G) <= 0.05) return { success: true, message: `g = ${f(gm, 2)} m/s². The astronaut weighs ${f(ASTRONAUT * gm, 0)} N, ${pct} of ${f(ASTRONAUT * 9.81, 0)} N!` };
          return { success: false, message: `g = ${f(gm, 2)} m/s² (${f((gm / 9.81) * 100, 0)}% of ground). ${gm > TARGET_G ? "Go higher." : "Go lower."}` };
        },
        draw(r, ov) {
          space(r);
          earth(r);
          const top = R_EARTH / MM + p.h / 1000;
          r.line(0, R_EARTH / MM, 0, 30, "#9ca3af", 2, [6, 4]);
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
          r.rect(-0.22, top - 0.12, 0.44, 0.26, "#38bdf8");
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
            r.ctx.fillRect(x0 + W * FRAC - 1, 12, 2, 44);
            r.textPx(pct, x0 + W * FRAC, 66, { size: 11, color: "#fca5a5", bold: true });
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
        view: () => ({ xMin: -9, xMax: 9, yMin: -7.2, yMax: Math.max(13.2, R_EARTH / MM + p.h / 1000 + 2) }),
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 12-2  Into Orbit   (GMm/r² = mv²/r)                                  */
/* ------------------------------------------------------------------ */
const intoOrbit = defineLevel((v) => {
  const ALT_KM = v.num(400, -1);
  const ALT0 = ALT_KM * KM;
  const ORBIT_TS = 600; // each game second is 10 minutes of mission time
  const vEx = Math.sqrt(GM_EARTH / (R_EARTH + ALT0));
  const vc = { min: 5000, max: 11000, step: 10 };
  return {
    id: "12-2",
    chapter: 12,
    title: "Into Orbit",
    hook: `Your rocket lifts a satellite to ${ALT_KM} km and points it sideways. How fast must it go to circle Earth without falling back?`,
    goal: `One full orbit, staying ${ALT_KM - 50}–${ALT_KM + 50} km up.`,
    controls: [{ key: "v", label: "Sideways speed v", ...vc, value: 6000, unit: "m/s" }],
    predict: {
      prompt: `A satellite twice as heavy wants the same ${ALT_KM} km circular orbit. It needs to go…`,
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
      `r = ${6371 + ALT_KM} km: v = √(3.98×10¹⁴ ÷ ${f((R_EARTH + ALT0) / 1e6, 3)}×10⁶) ≈ ${f(vEx, 0)} m/s.`,
    ],
    journal: {
      title: "Orbits",
      tex: String.raw`\frac{GMm}{r^2} = \frac{mv^2}{r} \;\Rightarrow\; v = \sqrt{\frac{GM}{r}}`,
      note: "An orbit is falling sideways forever.",
    },
    view: { xMin: -9, xMax: 9, yMin: -9, yMax: 9 },
    graph: { title: "Altitude vs. time", yLabel: "altitude (km)", tMax: 12, yMin: 0, yMax: 800, series: [{ label: "altitude", color: COLORS.velocity }], target: () => ALT_KM, targetLabel: `${ALT_KM} km` },
    solution: { v: snap(vc, vEx) },
    wrong: { v: snap(vc, vEx * 0.91) },
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
          if (minAlt < ALT0 - 50 * KM) return { success: false, message: `Orbit dipped to ${f(minAlt / KM, 0)} km. A bit faster.` };
          if (maxAlt > ALT0 + 50 * KM) return { success: false, message: `Orbit swung out to ${f(maxAlt / KM, 0)} km. A bit slower.` };
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
          satellite(r, P.x, P.y, 0.3, Math.atan2(sat.vel.y, sat.vel.x), 10);
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
});

/* ------------------------------------------------------------------ */
/* 12-3  Tug of War in Space   (F = Gm₁m₂/r², superposition)            */
/* ------------------------------------------------------------------ */
const tugOfWar = defineLevel((v) => {
  const NEUTRAL_TS = 10800; // 8 game seconds = 1 day
  const NEUTRAL_END = 8;
  const PROBE_M = 500;
  // textbook version: the real Earth–Moon numbers; other versions are "what-if" moons
  const RATIO = v.num(M_EARTH / M_MOON, 0);
  const EARTH_MOON = v.num(REAL_EARTH_MOON / KM, -2) * KM;
  const GM_MOON = GM_EARTH / RATIO;
  const k = Math.sqrt(RATIO);
  const dEx = EARTH_MOON / (1 + 1 / k);
  const dc = { min: 100, max: 470, step: 1 };
  const D_TXT = `${Math.round(EARTH_MOON / KM).toLocaleString("en-US")} km`;
  const R_TXT = f(RATIO, 0);
  return {
    id: "12-3",
    chapter: 12,
    title: "Tug of War in Space",
    hook: `${v.isFixed ? "Earth and the Moon" : "In a what-if solar system, Earth and a moon"} (${R_TXT} times lighter) are ${D_TXT} apart. Park a probe where their pulls cancel. (We freeze the moon in place for this test.)`,
    goal: "Probe drifts less than 1000 km in a day.",
    controls: [{ key: "d", label: "Probe distance from Earth", ...dc, value: snap(dc, (dEx / MM) * 0.86), unit: "×1000 km" }],
    predict: {
      prompt: "Where do Earth's pull and the Moon's pull cancel?",
      options: ["Exactly halfway", "Closer to Earth", "Closer to the Moon", "Nowhere: Earth always wins"],
      correct: 2,
      why: `Earth is much heavier, so to cancel its pull you have to be much farther from it, and much closer to the Moon. It's about ${f((dEx / EARTH_MOON) * 100, 0)}% of the way there.`,
    },
    explain: {
      prompt: `The Moon is ${R_TXT} times less massive. Why is the balance point only about ${f(k, 1)} times closer to the Moon (not ${R_TXT})?`,
      options: [
        `Pull goes as m/r², so 1/${R_TXT} the mass is balanced by being 1/${f(k, 1)} the distance (since ${f(k, 1)}² ≈ ${R_TXT})`,
        `Pull goes as m/r, so you need 1/${R_TXT} the distance`,
        "The Moon's gravity works differently from Earth's",
      ],
      correct: 0,
      why: `GM_E/d_E² = GM_M/d_M² → d_E/d_M = √(M_E/M_M) = √${R_TXT} ≈ ${f(k, 2)}. The probe sits ${f(k, 1)}× farther from Earth than from the Moon.`,
    },
    hints: [
      "Watch the two blue arrows. Make them the same length.",
      `Equal pulls: M_E/d_E² = M_M/d_M², so d_E = ${f(k, 2)}·d_M.`,
      `d_E = ${D_TXT} × ${f(k, 2)}/${f(k + 1, 2)} ≈ ${(Math.round(dEx / 1e6) * 1000).toLocaleString("en-US")} km.`,
    ],
    journal: {
      title: "Adding gravity",
      tex: String.raw`\frac{GM_E m}{d_E^2} = \frac{GM_M m}{d_M^2} \;\Rightarrow\; \frac{d_E}{d_M} = \sqrt{\frac{M_E}{M_M}}`,
      note: "Pulls add as vectors; mass and distance² both matter.",
    },
    view: { xMin: -20, xMax: EARTH_MOON / MM + 16, yMin: -60, yMax: 60 },
    graph: { title: "Drift from where you parked it", yLabel: "drift (km)", tMax: NEUTRAL_END, yMin: -1500, yMax: 1500, series: [{ label: "drift", color: COLORS.velocity }] },
    solution: { d: bestOnGrid(dc, (x) => x * MM - dEx) },
    wrong: { d: snap(dc, EARTH_MOON / MM / 2) }, // "exactly halfway"
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
          earthArt(r, 0, 0, 0, 22);
          r.text("Earth", 0, -26, { size: 12, bold: true, color: "#fff" });
          moonArt(r, EARTH_MOON / MM, 0, R_MOON / MM, 11);
          r.text("Moon", EARTH_MOON / MM, -22, { size: 12, bold: true, color: "#fff" });
          r.line(0, -40, EARTH_MOON / MM, -40, "#64748b", 1);
          r.text(D_TXT, EARTH_MOON / MM / 2, -46, { size: 11, color: "#cbd5e1" });
          r.line(EARTH_MOON / MM / 2, -36, EARTH_MOON / MM / 2, 36, "#475569", 1, [4, 4]);
          r.text("halfway", EARTH_MOON / MM / 2, 40, { size: 10, color: "#94a3b8" });
          const P = probe.pos.scale(1 / MM);
          r.line(x0 / MM, -12, x0 / MM, 12, "#fde68a", 1.5, [3, 3]);
          satellite(r, P.x, P.y, 0, 0, 12);
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
});

/* ------------------------------------------------------------------ */
/* 12-4  Sky Tracker   (orbital period: higher → slower and longer)    */
/* ------------------------------------------------------------------ */
const skyTracker = defineLevel((v) => {
  const P_H = v.num(12, 1); // wanted period, hours
  const P = P_H * 3600;
  const rEx = Math.cbrt((GM_EARTH * P * P) / (4 * Math.PI * Math.PI));
  const hEx = (rEx - R_EARTH) / KM;
  const hc = { min: 1000, max: 40000, step: 100 };
  const TS = 4320; // 1 game second = 72 min
  return {
    id: "12-4",
    chapter: 12,
    title: "Sky Tracker",
    hook: `A navigation satellite must circle Earth exactly once every ${f(P_H, 1)} hours. Choose its altitude; the rocket gives it the right circular speed.`,
    goal: `Orbit period ${f(P_H, 1)} h (±1%).`,
    controls: [{ key: "h", label: "Orbit altitude h", ...hc, value: 2000, unit: "km" }],
    predict: {
      prompt: "Compared with a satellite in a low orbit, one in a much higher orbit moves…",
      options: ["Faster", "Slower", "At the same speed"],
      correct: 1,
      why: "v = √(GM/r): gravity is weaker farther out, so less speed is needed to stay in a circle. Higher satellites are slower AND have farther to go.",
    },
    explain: {
      prompt: "Why does a higher orbit take so much longer?",
      options: [
        "The circle is bigger (2πr) and the speed is lower (√(GM/r)), so T = 2πr/v grows quickly with r",
        "Higher satellites have to fight more air",
        "They have more mass",
      ],
      correct: 0,
      why: "T = 2πr / √(GM/r) = 2π√(r³/GM). Doubling r makes the period 2√2 ≈ 2.8 times longer.",
    },
    hints: [
      "Period too short? Go higher.",
      "T = 2πr/v with v = √(GM/r) → r³ = GM·T²/4π².",
      `r = ∛(3.98×10¹⁴ · ${f(P, 0)}² ÷ 4π²) ≈ ${f(rEx / KM, 0)} km → h ≈ ${f(hEx, 0)} km.`,
    ],
    journal: {
      title: "Orbital period",
      tex: String.raw`v = \sqrt{\frac{GM}{r}},\qquad T = \frac{2\pi r}{v} = 2\pi\sqrt{\frac{r^3}{GM}}`,
      note: "Higher orbit → slower and longer.",
    },
    view: { xMin: -48, xMax: 48, yMin: -48, yMax: 48 },
    graph: {
      title: "Orbits completed vs. time",
      yLabel: "orbits",
      tMax: Math.ceil((P / TS) * 1.2),
      yMin: 0,
      yMax: 1.2,
      series: [{ label: "your satellite", color: COLORS.velocity }],
      target: (t) => (t * TS) / P,
      targetLabel: "perfect period",
    },
    solution: { h: snap(hc, hEx) },
    wrong: { h: snap(hc, hEx * 0.6) },
    create(p) {
      const r0 = R_EARTH + p.h * KM;
      const sat = new Body(500, new Vec2(r0, 0), new Vec2(0, Math.sqrt(GM_EARTH / r0)));
      sat.forces = [pullToward(Vec2.zero(), GM_EARTH, "F_g")];
      const trail: Vec2[] = [sat.pos.scale(1 / MM)];
      let swept = 0;
      let prevAng = 0;
      let period: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (period !== null) return;
          stepBodies([sat], sim.t * TS, dt * TS);
          const ang = Math.atan2(sat.pos.y, sat.pos.x);
          let d = ang - prevAng;
          if (d < -Math.PI) d += TAU;
          if (d > Math.PI) d -= TAU;
          if (swept + d >= TAU) {
            period = (sim.t + (dt * (TAU - swept)) / d) * TS;
            swept = TAU;
          } else swept += d;
          prevAng = ang;
          sim.t += dt;
          if (sim.t % (1 / 20) < dt) trail.push(sat.pos.scale(1 / MM));
        },
        isDone: () => period !== null || sim.t > 60,
        outcome() {
          if (period === null) return { success: false, message: "Didn't finish an orbit. Try lower." };
          const err = (period - P) / P;
          if (Math.abs(err) <= 0.01) return { success: true, message: `One orbit every ${f(period / 3600, 2)} h at ${f(sat.vel.len(), 0)} m/s.` };
          return { success: false, message: `Period ${f(period / 3600, 2)} h. ${err < 0 ? "Too quick: go higher." : "Too slow: go lower."}` };
        },
        draw(r, ov) {
          space(r, 5);
          earth(r);
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), (rEx / MM) * r.scale, 0, TAU);
          ctx.strokeStyle = "rgba(0,158,115,.55)";
          ctx.setLineDash([5, 6]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          if (ov.trail) r.path(trail, "rgba(253,186,116,.9)", 2);
          const S = sat.pos.scale(1 / MM);
          satellite(r, S.x, S.y, 0.9, Math.atan2(sat.vel.y, sat.vel.x), 12);
          if (ov.velocity) r.arrow(S, sat.vel, 0.012, COLORS.velocity, "v");
          if (ov.forces) r.arrow(S, sat.pos.scale(-1), 30 / sat.pos.len(), COLORS.gravity, "F_g");
          r.hud([`mission time ${f((sim.t * TS) / 3600, 1)} h`, `orbit ${f((swept / TAU) * 100, 0)}% done`]);
        },
        view() {
          const R = Math.max(14, (r0 / MM) * 1.15);
          return { xMin: -R, xMax: R, yMin: -R, yMax: R };
        },
        readouts: () => [
          { label: "Orbit radius r", value: `${f(r0 / KM, 0)} km` },
          { label: "Speed √(GM/r)", value: `${f(sat.vel.len(), 0)} m/s` },
          { label: "Predicted period 2πr/v", value: `${f((TAU * r0) / Math.sqrt(GM_EARTH / r0) / 3600, 2)} h` },
          { label: "Wanted", value: `${f(P_H, 1)} h` },
        ],
        equation: () => String.raw`T = 2\pi\sqrt{\frac{r^3}{GM}} = 2\pi\sqrt{\frac{(${n(r0 / 1e7, 3)}\times10^7)^3}{3.98\times10^{14}}} = ${n((TAU * Math.sqrt((r0 * r0 * r0) / GM_EARTH)) / 3600, 2)}\text{ h}`,
        sample: () => [swept / TAU],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 12-5  Moon Hop   (energy with U = −GMm/r, not mgh)                    */
/* ------------------------------------------------------------------ */
const moonHop = defineLevel((v) => {
  const GM_M = GM_EARTH * (M_MOON / M_EARTH);
  const RM = 1.737e6;
  const g0 = GM_M / (RM * RM);
  const H_KM = v.num(870, -1);
  const H = H_KM * KM;
  const vEx = Math.sqrt(2 * GM_M * (1 / RM - 1 / (RM + H)));
  const vc = { min: 500, max: 3000, step: 5 };
  const TS = 300; // 1 game second = 5 minutes
  return {
    id: "12-5",
    chapter: 12,
    title: "Moon Hop",
    hook: `A probe on the Moon (radius 1737 km, surface gravity ${f(g0, 2)} m/s²) must be fired straight up to peek over a ridge, peaking ${H_KM} km above the surface. No air on the Moon.`,
    goal: `Peak at ${H_KM} km (±3%).`,
    controls: [{ key: "v", label: "Launch speed v₀", ...vc, value: 800, unit: "m/s" }],
    predict: {
      prompt: "You use Ch 2's v² = 2gH with the Moon's surface gravity. The launch speed you get is…",
      options: ["Too big: the probe would overshoot", "Too small: it would fall short", "Exactly right"],
      correct: 0,
      why: `v² = 2gH assumes g stays ${f(g0, 2)} m/s² all the way up. But ${H_KM} km up, gravity is much weaker, so the probe needs less speed than that formula says.`,
    },
    explain: {
      prompt: "Why use U = −GMm/r here instead of mgh?",
      options: [
        "mgh assumes g is constant; over hundreds of km, gravity weakens a lot, and −GMm/r accounts for that",
        "mgh only works on Earth",
        "The Moon has no potential energy",
      ],
      correct: 0,
      why: "½mv₀² − GMm/R = 0 − GMm/(R+H). Near the surface this reduces to mgh, but for big heights you need the 1/r form.",
    },
    hints: [
      "Overshot? Launch slower.",
      "Energy: ½v₀² − GM/R = −GM/(R + H).",
      `v₀ = √(2GM(1/R − 1/(R+H))) ≈ ${f(vEx, 0)} m/s (mgh would say ${f(Math.sqrt(2 * g0 * H), 0)} m/s).`,
    ],
    journal: {
      title: "Gravitational potential energy",
      tex: String.raw`U_g = -\frac{GMm}{r},\qquad \tfrac12mv_0^2 - \frac{GMm}{R} = -\frac{GMm}{R+H}`,
      note: "mgh only works when g barely changes.",
    },
    view: { xMin: -3, xMax: 3, yMin: -2, yMax: 3.4 },
    graph: { title: "Altitude vs. time", yLabel: "altitude (km)", tMax: 10, yMin: 0, yMax: Math.ceil((H_KM * 1.6) / 100) * 100, series: [{ label: "altitude", color: COLORS.velocity }], target: () => H_KM, targetLabel: "ridge top" },
    solution: { v: snap(vc, vEx) },
    wrong: { v: snap(vc, Math.sqrt(2 * g0 * H)) }, // constant-g formula
    create(p) {
      const probe = new Body(100, new Vec2(0, RM), new Vec2(0, p.v));
      probe.forces = [pullToward(Vec2.zero(), GM_M, "F_g")];
      let apex: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (apex !== null) return;
          const vy0 = probe.vel.y;
          stepBodies([probe], sim.t * TS, dt * TS);
          sim.t += dt;
          if (vy0 > 0 && probe.vel.y <= 0) apex = probe.pos.y - RM;
        },
        isDone: () => apex !== null || sim.t > 40,
        outcome() {
          if (apex === null) return { success: false, message: "It never came back down. Way too fast!" };
          const err = (apex - H) / H;
          if (Math.abs(err) <= 0.03) return { success: true, message: `Peaked at ${f(apex / KM, 0)} km, right over the ridge.` };
          return { success: false, message: `Peaked at ${f(apex / KM, 0)} km. ${err > 0 ? "Too high: launch slower." : "Too low: launch faster."}` };
        },
        draw(r, ov) {
          space(r, 9);
          moonArt(r, 0, 0, RM / MM);
          
          
          const ctx = r.ctx;
          ctx.beginPath();
          ctx.arc(r.sx(0), r.sy(0), ((RM + H) / MM) * r.scale, 0, TAU);
          ctx.strokeStyle = "rgba(0,158,115,.6)";
          ctx.setLineDash([5, 6]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
          r.text(`target ${H_KM} km`, 0.15, (RM + H) / MM + 0.12, { size: 11, color: "#6ee7b7", align: "left", bold: true });
          const P = probe.pos.scale(1 / MM);
          r.line(0, RM / MM, P.x, P.y, "rgba(253,186,116,.7)", 2, [4, 4]);
          satellite(r, P.x, P.y, 0.1, Math.PI / 2, 10);
          if (ov.velocity) r.arrow(P.add(new Vec2(0.2, 0)), probe.vel, 0.05, COLORS.velocity, "v");
          if (ov.forces) r.arrow(P.add(new Vec2(-0.2, 0)), new Vec2(0, -GM_M / probe.pos.dot(probe.pos)), 30, COLORS.gravity, "g here");
          const y = probe.pos.y;
          r.hud([`time ${f((sim.t * TS) / 60, 0)} min   altitude ${f((y - RM) / KM, 0)} km`, `gravity here: ${f(GM_M / (y * y), 2)} m/s²`]);
        },
        readouts: () => {
          const y = probe.pos.y;
          return [
            { label: "Altitude", value: `${f((y - RM) / KM, 0)} km` },
            { label: "Speed", value: `${f(probe.vel.y, 0)} m/s` },
            { label: "Gravity here", value: `${f(GM_M / (y * y), 3)} m/s²` },
            { label: "KE + U per kg", value: `${f((0.5 * probe.vel.y * probe.vel.y - GM_M / y) / 1e6, 4)} MJ/kg` },
          ];
        },
        equation: () => {
          const y = probe.pos.y;
          return String.raw`\tfrac12 v^2 - \frac{GM}{r} = \tfrac12(${n(probe.vel.y, 0)})^2 - \frac{4.90\times10^{12}}{${n(y / 1e6, 3)}\times10^6} = ${n((0.5 * probe.vel.y ** 2 - GM_M / y) / 1e6, 4)}\times10^6\ \tfrac{J}{kg}`;
        },
        sample: () => [(probe.pos.y - RM) / KM],
      };
      return sim;
    },
  };
});

export const chapter12 = [halfWeight, intoOrbit, tugOfWar, skyTracker, moonHop];
