import { Body, crossFraction, stepBodies } from "../physics/core";
import { COLORS, gravity } from "../physics/forces";
import { maxHeight } from "../physics/analytic";
import { Vec2, rad } from "../physics/vec2";
import type { Level, Sim } from "./types";
import { f, n, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 3-1  Drone Delivery   (components, magnitude, angle)                */
/* ------------------------------------------------------------------ */
const TARGET = new Vec2(30, 40);
const DRONE_SPEED = 8;

const droneDelivery: Level = {
  id: "3-1",
  chapter: 3,
  title: "Drone Delivery",
  hook: "Fly medicine to a roof 30 m east, 40 m north. One straight line.",
  goal: "Land within 1.5 m of the pad.",
  controls: [
    { key: "dist", label: "Flight distance |d|", min: 0, max: 80, step: 1, value: 30, unit: "m" },
    { key: "angle", label: "Direction θ (from east)", min: 0, max: 90, step: 1, value: 30, unit: "°" },
  ],
  predict: {
    prompt: "How long is the straight-line flight?",
    options: ["70 m", "50 m", "35 m", "10 m"],
    correct: 1,
    why: "√(30² + 40²) = 50 m. The shortcut beats 30 + 40.",
  },
  explain: {
    prompt: "It flew 50 m. Why only 30 m east?",
    options: ["East part = 50 cos 53° ≈ 30 m", "It slowed down", "Wind pushed it"],
    correct: 0,
    why: "dₓ = d cos θ, d_y = d sin θ.",
  },
  hints: [
    "Picture a right triangle: 30 across, 40 up.",
    "|d| = √(dₓ² + d_y²), θ = tan⁻¹(d_y/dₓ).",
    "50 m at 53°.",
  ],
  journal: {
    title: "Vector components",
    tex: String.raw`d_x = d\cos\theta,\quad d_y = d\sin\theta,\quad |d| = \sqrt{d_x^2+d_y^2},\quad \theta=\tan^{-1}\!\frac{d_y}{d_x}`,
    note: "Measure θ from the x-axis.",
  },
  view: { xMin: -6, xMax: 56, yMin: -5, yMax: 52 },
  graph: {
    title: "Position components vs. time",
    yLabel: "position (m)",
    tMax: 8,
    yMin: 0,
    yMax: 50,
    series: [
      { label: "x (east)", color: COLORS.applied },
      { label: "y (north)", color: COLORS.gravity },
    ],
  },
  solution: { dist: 50, angle: 53 },
  wrong: { dist: 70, angle: 45 },
  create(p) {
    const dir = Vec2.fromPolar(1, p.angle);
    const drone = new Body(2, Vec2.zero(), dir.scale(DRONE_SPEED));
    const T = p.dist / DRONE_SPEED;
    const trail: Vec2[] = [Vec2.zero()];
    let done = p.dist === 0;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        stepBodies([drone], sim.t, dt);
        sim.t += dt;
        if (sim.t >= T) {
          drone.pos = dir.scale(p.dist);
          drone.vel = Vec2.zero();
          done = true;
        }
        trail.push(drone.pos);
      },
      isDone: () => done,
      outcome() {
        const miss = drone.pos.sub(TARGET).len();
        if (miss <= 1.5) return { success: true, message: `${f(miss, 2)} m from the pad. Delivered!` };
        return { success: false, message: `Landed at (${f(drone.pos.x)}, ${f(drone.pos.y)}). Target: (30, 40).` };
      },
      draw(r, ov) {
        r.clear("#e8f5e9", "#f1f8e9");
        for (let x = 0; x <= 50; x += 10) {
          r.line(x, 0, x, 50, "#c8e6c9", 1);
          r.text(`${x}`, x, -2, { size: 10, color: "#4b5563" });
        }
        for (let y = 0; y <= 50; y += 10) {
          r.line(0, y, 50, y, "#c8e6c9", 1);
          r.text(`${y}`, -2.5, y, { size: 10, color: "#4b5563" });
        }
        r.text("east (m) →", 46, -4, { size: 11, color: "#374151" });
        r.text("north ↑", -3.5, 49, { size: 11, color: "#374151", align: "left" });
        // rooftop
        r.rect(TARGET.x - 4, TARGET.y - 3, 8, 6, "#d6d3d1", "#57534e", 4);
        r.circle(TARGET.x, TARGET.y, 1.5, "rgba(0,158,115,.35)", COLORS.normal);
        r.text("H", TARGET.x, TARGET.y, { bold: true, color: COLORS.normal, size: 14 });
        r.rect(-2, -1, 4, 2, "#94a3b8", "#475569", 3);
        if (ov.trail) r.path(trail, "rgba(213,94,0,.7)", 2, [6, 4]);
        // components (always shown once flying — this is the lesson)
        const P = drone.pos;
        r.line(0, 0, P.x, 0, COLORS.applied, 3);
        r.line(P.x, 0, P.x, P.y, COLORS.gravity, 3);
        if (P.len() > 3) {
          r.text(`dₓ = ${f(P.x)} m`, P.x / 2, 2, { size: 11, color: "#fff", bg: COLORS.applied, bold: true });
          r.text(`d_y = ${f(P.y)} m`, P.x + 1, P.y / 2, { size: 11, color: "#fff", bg: COLORS.gravity, bold: true, align: "left" });
        }
        // drone
        r.rect(P.x - 1.2, P.y - 0.4, 2.4, 0.8, "#334155", undefined, 3);
        for (const dx of [-1.6, 1.6]) r.circle(P.x + dx, P.y + 0.5, 0.9, "rgba(148,163,184,.6)", "#334155");
        if (ov.velocity && !done) r.arrow(P, drone.vel, 6, COLORS.velocity, "v");
        r.hud([`t = ${f(sim.t, 2)} s`, `distance flown = ${f(P.len())} m`]);
      },
      readouts: () => [
        { label: "Distance flown", value: `${f(drone.pos.len(), 1)} m` },
        { label: "East (x)", value: `${f(drone.pos.x, 1)} m` },
        { label: "North (y)", value: `${f(drone.pos.y, 1)} m` },
        { label: "Miss distance", value: `${f(drone.pos.sub(TARGET).len(), 1)} m` },
      ],
      equation: () =>
        String.raw`d_x = ${n(p.dist, 0)}\cos ${p.angle}^\circ = ${n(p.dist * Math.cos(rad(p.angle)))}\text{ m},\quad d_y = ${n(p.dist, 0)}\sin ${p.angle}^\circ = ${n(p.dist * Math.sin(rad(p.angle)))}\text{ m}`,
      sample: () => [drone.pos.x, drone.pos.y],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 3-2  River Crossing   (adding velocity vectors)                     */
/* ------------------------------------------------------------------ */
const RIVER_W = 60;
const BOAT_V = 5;
const CURRENT = 3;

const riverCrossing: Level = {
  id: "3-2",
  chapter: 3,
  title: "River Crossing",
  hook: "Ferry: 5 m/s. Current: 3 m/s east. River: 60 m wide.",
  goal: "Dock within 2 m of the pier straight across.",
  controls: [{ key: "heading", label: "Heading θ (from east)", min: 30, max: 150, step: 1, value: 90, unit: "°" }],
  predict: {
    prompt: "Aim straight across. Where do you land?",
    options: ["At the pier", "Downstream (east)", "Upstream (west)"],
    correct: 1,
    why: "The current carries you east the whole way.",
  },
  explain: {
    prompt: "Why does aiming upstream work?",
    options: ["Its west part cancels the current", "It makes the ferry faster", "The current is weaker there"],
    correct: 0,
    why: "Need 5 cos θ + 3 = 0, so θ ≈ 127°.",
  },
  hints: [
    "You move along v_ground, not where you point.",
    "Make the east–west speed zero: 5 cos θ + 3 = 0.",
    "θ ≈ 127°.",
  ],
  journal: {
    title: "Adding velocities",
    tex: String.raw`\vec v_{ground} = \vec v_{boat} + \vec v_{current} \qquad v_x = v\cos\theta + v_c,\; v_y = v\sin\theta`,
    note: "Add vectors by adding components.",
  },
  view: { xMin: -40, xMax: 70, yMin: -8, yMax: 70 },
  graph: {
    title: "Ferry position vs. time",
    yLabel: "position (m)",
    tMax: 16,
    yMin: -10,
    yMax: 60,
    series: [
      { label: "x (downstream)", color: COLORS.current },
      { label: "y (across)", color: COLORS.gravity },
    ],
  },
  solution: { heading: 127 },
  wrong: { heading: 90 },
  create(p) {
    const vBoat = Vec2.fromPolar(BOAT_V, p.heading);
    const vCur = new Vec2(CURRENT, 0);
    const ferry = new Body(5000, Vec2.zero(), vBoat.add(vCur));
    const trail: Vec2[] = [Vec2.zero()];
    let done = false;
    let lost = false;
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        const y0 = ferry.pos.y,
          x0 = ferry.pos.x;
        stepBodies([ferry], sim.t, dt);
        sim.t += dt;
        if (ferry.pos.y >= RIVER_W) {
          const fr = crossFraction(y0, ferry.pos.y, RIVER_W);
          ferry.pos = new Vec2(x0 + (ferry.pos.x - x0) * fr, RIVER_W);
          done = true;
        } else if (Math.abs(ferry.pos.x) > 78) {
          done = lost = true;
        }
        trail.push(ferry.pos);
      },
      isDone: () => done || sim.t > 60,
      outcome() {
        if (lost) return { success: false, message: "Swept away! Aim more upstream." };
        const x = ferry.pos.x;
        if (Math.abs(x) <= 2) return { success: true, message: `Docked ${f(Math.abs(x), 2)} m from the pier!` };
        return { success: false, message: `${f(Math.abs(x))} m ${x > 0 ? "east" : "west"} of the pier. Aim ${x > 0 ? "more" : "less"} upstream.` };
      },
      draw(r, ov) {
        r.clear("#cfe8c9", "#cfe8c9");
        const vis = r.visible();
        r.rect(vis.xMin, 0, vis.xMax - vis.xMin, RIVER_W, "#7cc3e8");
        // current stripes (animated)
        for (let y = 6; y < RIVER_W; y += 12)
          for (let x = -60; x < 90; x += 18) {
            const xx = ((x + sim.t * CURRENT + 60) % 150) - 60;
            r.line(xx, y, xx + 6, y, "rgba(255,255,255,.7)", 2);
          }
        r.rect(vis.xMin, RIVER_W, vis.xMax - vis.xMin, 10, "#a7d49b");
        r.rect(vis.xMin, -10, vis.xMax - vis.xMin, 10, "#a7d49b");
        r.rect(-3, RIVER_W, 6, 4, "#8d6e63", "#4e342e");
        r.text("PIER", 0, RIVER_W + 6, { bold: true, size: 12 });
        r.rect(-3, -4, 6, 4, "#8d6e63", "#4e342e");
        r.text("current 3 m/s →", vis.xMin + 14, RIVER_W - 4, { size: 12, color: "#0c4a6e", bold: true });
        if (ov.trail) r.path(trail, "rgba(213,94,0,.8)", 2.5, [6, 4]);
        r.rotRect(ferry.pos.x, ferry.pos.y, 9, 3.6, rad(p.heading), "#f8fafc");
        const P = ferry.pos;
        if (ov.velocity && !done) {
          r.arrow(P, vBoat, 16, COLORS.applied, "v_boat");
          r.arrow(P.add(vBoat.scale(16 / r.scale)), vCur, 16, COLORS.current, "v_water");
          r.arrow(P, ferry.vel, 16, COLORS.velocity, "v_ground");
        }
        r.hud([`t = ${f(sim.t, 1)} s`, `drift = ${f(P.x, 1)} m`]);
      },
      readouts: () => [
        { label: "Heading", value: `${p.heading}°` },
        { label: "Ground speed", value: `${f(ferry.vel.len(), 2)} m/s` },
        { label: "Ground direction", value: `${f(ferry.vel.angleDeg(), 0)}°` },
        { label: "Drift (east)", value: `${f(ferry.pos.x, 1)} m` },
      ],
      equation: () =>
        String.raw`v_x = 5\cos ${p.heading}^\circ + 3 = ${n(ferry.vel.x, 2)}\ \tfrac{m}{s},\qquad v_y = 5\sin ${p.heading}^\circ = ${n(ferry.vel.y, 2)}\ \tfrac{m}{s}`,
      sample: () => [ferry.pos.x, ferry.pos.y],
    };
    return sim;
  },
};

/* ------------------------------------------------------------------ */
/* 3-3  Canyon Supply Drop   (projectile motion)                       */
/* ------------------------------------------------------------------ */
const NEAR_EDGE = 6;
const FAR_EDGE = 38;
const FLOOR = -25;
const ZONE: [number, number] = [40, 46];

const canyonDrop: Level = {
  id: "3-3",
  chapter: 3,
  title: "Canyon Supply Drop",
  hook: "Launch supplies over a canyon to stranded hikers. No air.",
  goal: "Land in the green zone (40–46 m).",
  controls: [
    { key: "speed", label: "Launch speed v₀", min: 5, max: 30, step: 0.5, value: 15, unit: "m/s" },
    { key: "angle", label: "Launch angle θ", min: 10, max: 80, step: 1, value: 30, unit: "°" },
  ],
  predict: {
    prompt: "At the top of the arc, the velocity is…",
    options: ["Zero", "Sideways only (v_y = 0)", "Straight down"],
    correct: 1,
    why: "Gravity only changes v_y. vₓ never changes.",
  },
  explain: {
    prompt: "Why did vₓ stay flat on the graph?",
    options: ["No sideways force", "The launcher keeps pushing", "Gravity pulls sideways"],
    correct: 0,
    why: "x and y are independent: aₓ = 0, a_y = −g.",
  },
  hints: [
    "Are the ghosts evenly spaced left-to-right?",
    "Range: R = v₀² sin 2θ / g. Best angle?",
    "45° and about 20.5 m/s.",
  ],
  journal: {
    title: "Projectile motion",
    tex: String.raw`x = v_0\cos\theta\, t,\quad y = v_0\sin\theta\, t - \tfrac12 g t^2,\quad R = \frac{v_0^2\sin 2\theta}{g}`,
    note: "vₓ stays constant. v_y drops 9.81 m/s every second.",
  },
  view: { xMin: -4, xMax: 62, yMin: -27, yMax: 22 },
  graph: {
    title: "Velocity components vs. time",
    yLabel: "velocity (m/s)",
    tMax: 4,
    yMin: -20,
    yMax: 25,
    series: [
      { label: "vₓ", color: COLORS.applied },
      { label: "v_y", color: COLORS.gravity },
    ],
  },
  solution: { speed: 20.5, angle: 45 },
  wrong: { speed: 15, angle: 30 },
  create(p) {
    const crate = new Body(10, Vec2.zero(), Vec2.fromPolar(p.speed, p.angle));
    crate.forces = [gravity()];
    const strobe = new Strobe(0.25);
    const trail: Vec2[] = [Vec2.zero()];
    let done = false;
    let inCanyon = false;
    const apex = maxHeight(p.speed, p.angle);
    const sim: Sim = {
      t: 0,
      step(dt) {
        if (done) return;
        strobe.record(sim.t, crate.pos);
        const prev = crate.pos;
        stepBodies([crate], sim.t, dt);
        sim.t += dt;
        const P = crate.pos;
        if (!inCanyon && P.y < 0) {
          const fr = crossFraction(prev.y, P.y, 0);
          const xHit = prev.x + (P.x - prev.x) * fr;
          if (xHit <= NEAR_EDGE || xHit >= FAR_EDGE) {
            crate.pos = new Vec2(xHit, 0);
            done = true;
          } else inCanyon = true;
        }
        if (inCanyon && !done) {
          if (P.x >= FAR_EDGE) {
            crate.pos = new Vec2(FAR_EDGE - 0.4, P.y);
            done = true;
          } else if (P.y <= FLOOR) {
            crate.pos = new Vec2(P.x, FLOOR);
            done = true;
          }
        }
        if (P.x > 120) done = true;
        if (done) crate.vel = Vec2.zero();
        trail.push(crate.pos);
      },
      isDone: () => done || sim.t > 20,
      outcome() {
        const x = crate.pos.x;
        if (inCanyon) return { success: false, message: `Fell into the canyon at ${f(x)} m. Go farther.` };
        if (x >= ZONE[0] && x <= ZONE[1]) return { success: true, message: `Landed at ${f(x)} m. Hikers saved!` };
        if (x < NEAR_EDGE) return { success: false, message: `Landed at ${f(x)} m, still on your side.` };
        return { success: false, message: `Landed at ${f(x)} m. ${x < ZONE[0] ? "A bit farther." : "Too far."}` };
      },
      draw(r, ov) {
        r.clear("#ffe9c7", "#fff7ea");
        const vis = r.visible();
        r.rect(vis.xMin, FLOOR - 5, NEAR_EDGE - vis.xMin, 5 - FLOOR, "#c2864f", "#8a5a2b");
        r.rect(NEAR_EDGE, FLOOR - 5, FAR_EDGE - NEAR_EDGE, 5, "#8a5a2b");
        r.rect(FAR_EDGE, FLOOR - 5, vis.xMax - FAR_EDGE + 5, 5 - FLOOR, "#c2864f", "#8a5a2b");
        r.rect(ZONE[0], -0.6, ZONE[1] - ZONE[0], 0.6, COLORS.normal);
        r.flag(ZONE[0] + 3, 0, 3.5, COLORS.normal, "DROP ZONE");
        r.ruler(0, 60, -1.6, 10);
        // launcher
        const dir = Vec2.fromPolar(1, p.angle);
        r.line(0, 0, dir.x * 2.4, dir.y * 2.4, "#374151", 8);
        r.circle(0, 0, 1, "#374151");
        if (ov.trail) {
          r.path(trail, "rgba(213,94,0,.5)", 1.5, [4, 4]);
          for (const s of strobe.pts) r.rect(s.x - 0.4, s.y - 0.4, 0.8, 0.8, "rgba(120,72,30,.35)");
        }
        const P = crate.pos;
        r.rect(P.x - 0.6, P.y, 1.2, 1.2, "#b45309", "#78350f", 2);
        const c = P.add(new Vec2(0, 0.6));
        if (ov.velocity && !done) {
          r.arrow(c, crate.vel, 3.5, COLORS.velocity, "v");
          r.arrow(c, new Vec2(crate.vel.x, 0), 3.5, COLORS.applied, "vₓ", 2);
          r.arrow(c, new Vec2(0, crate.vel.y), 3.5, COLORS.gravity, "v_y", 2);
        }
        if (ov.forces && !done) r.arrow(c, new Vec2(0, -crate.mass * 9.81), 0.4, COLORS.gravity, "F_g");
        r.hud([`t = ${f(sim.t, 2)} s`, `x = ${f(P.x, 1)} m, y = ${f(P.y, 1)} m`]);
      },
      view() {
        return { xMin: -4, xMax: 62, yMin: -27, yMax: Math.max(22, apex + 4), anchor: "bottom" };
      },
      readouts: () => [
        { label: "Time", value: `${f(sim.t, 2)} s` },
        { label: "vₓ", value: `${f(crate.vel.x, 2)} m/s` },
        { label: "v_y", value: `${f(crate.vel.y, 2)} m/s` },
        { label: "Height", value: `${f(crate.pos.y, 2)} m` },
      ],
      equation: () =>
        String.raw`x = (${n(p.speed)}\cos ${p.angle}^\circ)(${n(sim.t, 2)}) = ${n(crate.pos.x)}\text{ m},\quad y = (${n(p.speed)}\sin ${p.angle}^\circ)(${n(sim.t, 2)}) - \tfrac12(9.81)(${n(sim.t, 2)})^2 = ${n(crate.pos.y)}\text{ m}`,
      sample: () => [crate.vel.x, crate.vel.y],
    };
    return sim;
  },
};

export const chapter3 = [droneDelivery, riverCrossing, canyonDrop];
