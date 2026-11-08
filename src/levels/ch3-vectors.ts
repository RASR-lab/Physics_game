import { Body, G, crossFraction, stepBodies } from "../physics/core";
import { COLORS, gravity } from "../physics/forces";
import { maxHeight } from "../physics/analytic";
import { Vec2, rad } from "../physics/vec2";
import type { Sim } from "./types";
import { defineLevel, f, n, snap, Strobe } from "./util";

/* ------------------------------------------------------------------ */
/* 3-1  Drone Delivery   (components, magnitude, angle)                */
/* ------------------------------------------------------------------ */
const droneDelivery = defineLevel((v) => {
  const TX = v.num(30, 0);
  const TY = v.num(40, 0);
  const TARGET = new Vec2(TX, TY);
  const DRONE_SPEED = 8;
  const dEx = TARGET.len();
  const angEx = TARGET.angleDeg();
  const dc = { min: 0, max: 80, step: 1 };
  const ac = { min: 0, max: 90, step: 1 };
  const opts = [`${TX + TY} m`, `${f(dEx, 0)} m`, `${f((TX + TY) / 2, 0)} m`, `${Math.abs(TY - TX)} m`];
  return {
    id: "3-1",
    chapter: 3,
    title: "Drone Delivery",
    hook: `Fly medicine to a roof ${TX} m east, ${TY} m north. One straight line.`,
    goal: "Land within 1.5 m of the pad.",
    controls: [
      { key: "dist", label: "Flight distance |d|", ...dc, value: 30, unit: "m" },
      { key: "angle", label: "Direction θ (from east)", ...ac, value: 30, unit: "°" },
    ],
    predict: {
      prompt: `The rooftop is ${TX} m east and ${TY} m north. How far must the drone fly in one straight line?`,
      options: opts,
      correct: 1,
      why: `The straight-line path is the hypotenuse: |d| = √(${TX}² + ${TY}²) ≈ ${f(dEx, 1)} m. It's shorter than going ${TX} m and then ${TY} m.`,
    },
    explain: {
      prompt: `The drone flew about ${f(dEx, 0)} m. Why did it only end up ${TX} m east?`,
      options: [
        `Only the x-component counts for east: ${f(dEx, 0)} cos(${f(angEx, 0)}°) ≈ ${TX} m`,
        "The drone slowed down partway",
        "Wind pushed it back",
      ],
      correct: 0,
      why: "A vector splits into components: d_x = d cos θ and d_y = d sin θ. Each component tells you how far it went in that direction.",
    },
    hints: [
      `Picture a right triangle: ${TX} across, ${TY} up.`,
      "|d| = √(dₓ² + d_y²), θ = tan⁻¹(d_y/dₓ).",
      `About ${f(dEx, 0)} m at ${f(angEx, 0)}°.`,
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
    solution: { dist: snap(dc, dEx), angle: snap(ac, angEx) },
    wrong: { dist: snap(dc, TX + TY), angle: 45 },
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
          return { success: false, message: `Landed at (${f(drone.pos.x)}, ${f(drone.pos.y)}). Target: (${TX}, ${TY}).` };
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
});

/* ------------------------------------------------------------------ */
/* 3-2  River Crossing   (adding velocity vectors)                     */
/* ------------------------------------------------------------------ */
const riverCrossing = defineLevel((v) => {
  const RIVER_W = v.num(60, 0);
  const BOAT_V = v.num(5, 1);
  const CURRENT = v.num(3, 1);
  const hEx = 180 - (Math.acos(CURRENT / BOAT_V) * 180) / Math.PI;
  const hc = { min: 30, max: 150, step: 1 };
  return {
    id: "3-2",
    chapter: 3,
    title: "River Crossing",
    hook: `Ferry: ${f(BOAT_V, 1)} m/s. Current: ${f(CURRENT, 1)} m/s east. River: ${RIVER_W} m wide.`,
    goal: "Dock within 2 m of the pier straight across.",
    controls: [{ key: "heading", label: "Heading θ (from east)", ...hc, value: 90, unit: "°" }],
    predict: {
      prompt: "You point the ferry straight across (θ = 90°). Where does it reach the far bank?",
      options: ["Exactly at the pier", "Downstream (east) of the pier", "Upstream (west) of the pier"],
      correct: 1,
      why: "The ferry's velocity relative to the ground is its own velocity plus the current. The current keeps carrying it east the whole way across.",
    },
    explain: {
      prompt: "Why did aiming upstream get you to the pier?",
      options: [
        `The upstream (west) component of the ferry's velocity cancels the ${f(CURRENT, 1)} m/s current`,
        "Pointing upstream makes the ferry faster",
        "The current is weaker near the pier",
      ],
      correct: 0,
      why: `v_ground = v_boat + v_current. To go straight across you need ${f(BOAT_V, 1)} cos θ + ${f(CURRENT, 1)} = 0, so θ ≈ ${f(hEx, 0)}°. The leftover ${f(Math.sqrt(BOAT_V ** 2 - CURRENT ** 2), 1)} m/s carries you across.`,
    },
    hints: [
      "You move along v_ground, not where you point.",
      `Make the east–west speed zero: ${f(BOAT_V, 1)} cos θ + ${f(CURRENT, 1)} = 0.`,
      `cos θ = −${f(CURRENT, 1)}/${f(BOAT_V, 1)} → θ ≈ ${f(hEx, 0)}°.`,
    ],
    journal: {
      title: "Adding velocities",
      tex: String.raw`\vec v_{ground} = \vec v_{boat} + \vec v_{current} \qquad v_x = v\cos\theta + v_c,\; v_y = v\sin\theta`,
      note: "Add vectors by adding components.",
    },
    view: { xMin: -40, xMax: 70, yMin: -8, yMax: RIVER_W + 10 },
    graph: {
      title: "Ferry position vs. time",
      yLabel: "position (m)",
      tMax: 16,
      yMin: -10,
      yMax: RIVER_W,
      series: [
        { label: "x (downstream)", color: COLORS.current },
        { label: "y (across)", color: COLORS.gravity },
      ],
    },
    solution: { heading: snap(hc, hEx) },
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
          r.text(`current ${f(CURRENT, 1)} m/s →`, vis.xMin + 14, RIVER_W - 4, { size: 12, color: "#0c4a6e", bold: true });
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
          String.raw`v_x = ${n(BOAT_V)}\cos ${p.heading}^\circ + ${n(CURRENT)} = ${n(ferry.vel.x, 2)}\ \tfrac{m}{s},\qquad v_y = ${n(BOAT_V)}\sin ${p.heading}^\circ = ${n(ferry.vel.y, 2)}\ \tfrac{m}{s}`,
        sample: () => [ferry.pos.x, ferry.pos.y],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 3-3  Canyon Supply Drop   (projectile motion)                       */
/* ------------------------------------------------------------------ */
const canyonDrop = defineLevel((v) => {
  const NEAR_EDGE = 6;
  const Z0 = v.num(40, 0); // start of the drop zone, m
  const ZONE: [number, number] = [Z0, Z0 + 6];
  const FAR_EDGE = Z0 - 2;
  const FLOOR = -25;
  const vEx = Math.sqrt(G * (Z0 + 3)); // 45° launch to the middle of the zone
  const sc = { min: 5, max: 30, step: 0.5 };
  return {
    id: "3-3",
    chapter: 3,
    title: "Canyon Supply Drop",
    hook: "Launch supplies over a canyon to stranded hikers. No air.",
    goal: `Land in the green zone (${ZONE[0]}–${ZONE[1]} m).`,
    controls: [
      { key: "speed", label: "Launch speed v₀", ...sc, value: 15, unit: "m/s" },
      { key: "angle", label: "Launch angle θ", min: 10, max: 80, step: 1, value: 30, unit: "°" },
    ],
    predict: {
      prompt: "At the very top of its arc, what is the crate's velocity?",
      options: ["Zero. It stops for an instant", "Purely horizontal: vₓ is unchanged, v_y = 0", "Pointing straight down"],
      correct: 1,
      why: "Gravity only changes the vertical velocity. At the top v_y = 0, but vₓ = v₀ cos θ is the same as at launch.",
    },
    explain: {
      prompt: "On the graph, vₓ stayed perfectly flat while v_y dropped steadily. Why?",
      options: [
        "No horizontal force acts, so vₓ never changes. Gravity changes only v_y, by 9.81 m/s every second",
        "The launcher keeps pushing it forward",
        "Gravity pulls sideways as well as down",
      ],
      correct: 0,
      why: "Horizontal and vertical motions are independent. aₓ = 0 and a_y = −g.",
    },
    hints: [
      "Are the ghosts evenly spaced left-to-right?",
      "Range: R = v₀² sin 2θ / g. Best angle?",
      `45° and about ${f(vEx, 1)} m/s (R = v²/g at 45°).`,
    ],
    journal: {
      title: "Projectile motion",
      tex: String.raw`x = v_0\cos\theta\, t,\quad y = v_0\sin\theta\, t - \tfrac12 g t^2,\quad R = \frac{v_0^2\sin 2\theta}{g}`,
      note: "vₓ stays constant. v_y drops 9.81 m/s every second.",
    },
    view: { xMin: -4, xMax: ZONE[1] + 12, yMin: -27, yMax: 22 },
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
    solution: { speed: snap(sc, vEx), angle: 45 },
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
          r.ruler(0, ZONE[1] + 10, -1.6, 10);
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
          return { xMin: -4, xMax: ZONE[1] + 12, yMin: -27, yMax: Math.max(22, apex + 4), anchor: "bottom" };
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
});

/* ------------------------------------------------------------------ */
/* 3-4  Hiking Detour   (adding & subtracting displacement vectors)    */
/* ------------------------------------------------------------------ */
const hikingDetour = defineLevel((v) => {
  const L1 = v.num(60, 0); // first leg, due east (m)
  const CX = v.num(20, 0);
  const CY = v.num(50, 0);
  const leg2 = new Vec2(CX - L1, CY);
  const dEx = leg2.len();
  const angEx = leg2.angleDeg();
  const dc = { min: 0, max: 120, step: 1 };
  const ac = { min: 0, max: 180, step: 1 };
  const SPEED = 6;
  return {
    id: "3-4",
    chapter: 3,
    title: "Hiking Detour",
    hook: `You hiked ${L1} m due east, then checked the map: camp is ${CX} m east and ${CY} m north of the trailhead. Plan one straight second leg.`,
    goal: "Finish within 2 m of camp.",
    controls: [
      { key: "dist", label: "Leg 2 distance", ...dc, value: 30, unit: "m" },
      { key: "angle", label: "Leg 2 direction θ (from east)", ...ac, value: 90, unit: "°" },
    ],
    predict: {
      prompt: "Which way does your second leg have to point?",
      options: ["North-west (you overshot east)", "North-east", "Due north", "Due west"],
      correct: 0,
      why: `You're already ${L1} m east, but camp is only ${CX} m east. So leg 2 must go ${L1 - CX} m back west as well as ${CY} m north.`,
    },
    explain: {
      prompt: "How do you find the second leg?",
      options: [
        "Subtract: leg 2 = (camp) − (leg 1), one component at a time",
        "Add the two distances together",
        "Use the straight line from the trailhead to camp",
      ],
      correct: 0,
      why: `Displacements add tip to tail: leg 1 + leg 2 = camp. So leg 2 = (${CX} − ${L1}, ${CY} − 0) = (${CX - L1}, ${CY}) m.`,
    },
    hints: [
      "Leg 2 has to undo the extra distance east.",
      `Leg 2 components: x = ${CX} − ${L1} = ${CX - L1} m, y = ${CY} m.`,
      `|d| = √(${CX - L1}² + ${CY}²) ≈ ${f(dEx, 0)} m at θ ≈ ${f(angEx, 0)}°.`,
    ],
    journal: {
      title: "Adding displacements",
      tex: String.raw`\vec d_{total} = \vec d_1 + \vec d_2 \;\Rightarrow\; d_{2x} = d_x - d_{1x},\; d_{2y} = d_y - d_{1y}`,
      note: "Add or subtract vectors component by component.",
    },
    view: { xMin: -12, xMax: L1 + 16, yMin: -10, yMax: CY + 12 },
    graph: {
      title: "Position components vs. time",
      yLabel: "position (m)",
      tMax: 20,
      yMin: -10,
      yMax: Math.max(L1, CY) + 5,
      series: [
        { label: "x (east)", color: COLORS.applied },
        { label: "y (north)", color: COLORS.gravity },
      ],
    },
    solution: { dist: snap(dc, dEx), angle: snap(ac, angEx) },
    wrong: { dist: snap(dc, Math.hypot(CX, CY)), angle: snap(ac, (Math.atan2(CY, CX) * 180) / Math.PI) }, // aimed from the trailhead
    create(p) {
      const turn = new Vec2(L1, 0);
      const end = turn.add(Vec2.fromPolar(p.dist, p.angle));
      const t1 = L1 / SPEED;
      const t2 = t1 + p.dist / SPEED;
      let pos = Vec2.zero();
      const trail: Vec2[] = [pos];
      let done = false;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (done) return;
          sim.t += dt;
          if (sim.t < t1) pos = new Vec2(SPEED * sim.t, 0);
          else if (sim.t < t2) pos = turn.add(Vec2.fromPolar(SPEED * (sim.t - t1), p.angle));
          else {
            pos = end;
            done = true;
          }
          if (sim.t % (1 / 15) < dt) trail.push(pos);
        },
        isDone: () => done,
        outcome() {
          const miss = end.sub(new Vec2(CX, CY)).len();
          if (miss <= 2) return { success: true, message: `${f(miss, 1)} m from camp. Tents up!` };
          return { success: false, message: `Ended at (${f(end.x)}, ${f(end.y)}), ${f(miss, 1)} m from camp at (${CX}, ${CY}).` };
        },
        draw(r, ov) {
          r.clear("#ecfccb", "#f7fee7");
          const vis = r.visible();
          for (let x = Math.ceil(vis.xMin / 10) * 10; x < vis.xMax; x += 10) r.line(x, vis.yMin, x, vis.yMax, "#d9f99d", 1);
          for (let y = Math.ceil(vis.yMin / 10) * 10; y < vis.yMax; y += 10) r.line(vis.xMin, y, vis.xMax, y, "#d9f99d", 1);
          r.text("N ↑", vis.xMin + 3, vis.yMax - 3, { size: 12, bold: true });
          r.rect(-2, -2, 4, 4, "#a16207", "#713f12", 3);
          r.text("trailhead", 0, -5, { size: 11, bold: true });
          r.poly([[CX - 3, CY - 2], [CX + 3, CY - 2], [CX, CY + 3]], "#f97316", "#7c2d12");
          r.circle(CX, CY, 2, "rgba(0,158,115,.25)", COLORS.normal);
          r.text("camp", CX, CY + 5, { size: 11, bold: true });
          r.line(0, 0, CX, CY, "rgba(17,24,39,.35)", 1.5, [4, 6]);
          // leg 1 (pink) and leg 2 (purple)
          r.arrow(Vec2.zero(), turn, r.scale, COLORS.applied, "leg 1", 2.5);
          if (sim.t >= t1 && p.dist > 0) r.arrow(turn, Vec2.fromPolar(p.dist, p.angle), r.scale, COLORS.spring, "leg 2", 2.5);
          if (ov.trail) r.path(trail, "rgba(213,94,0,.7)", 2, [5, 4]);
          r.circle(pos.x, pos.y, 1.1, "#1d4ed8", "#fff");
          r.hud([`t = ${f(sim.t, 1)} s`, `position (${f(pos.x)}, ${f(pos.y)}) m`]);
        },
        readouts: () => [
          { label: "Leg 2 east part", value: `${f(p.dist * Math.cos((p.angle * Math.PI) / 180), 1)} m` },
          { label: "Leg 2 north part", value: `${f(p.dist * Math.sin((p.angle * Math.PI) / 180), 1)} m` },
          { label: "Where you end up", value: `(${f(end.x)}, ${f(end.y)}) m` },
          { label: "Camp", value: `(${CX}, ${CY}) m` },
        ],
        equation: () =>
          String.raw`\vec d_1 + \vec d_2 = (${L1}, 0) + (${n(end.x - L1)}, ${n(end.y)}) = (${n(end.x)}, ${n(end.y)})\text{ m}`,
        sample: () => [pos.x, pos.y],
      };
      return sim;
    },
  };
});

/* ------------------------------------------------------------------ */
/* 3-5  Off the Table   (horizontal launch: x and y are independent)   */
/* ------------------------------------------------------------------ */
const offTheTable = defineLevel((v) => {
  const H = v.num(1.2, 2); // table height, m
  const D = v.num(1.5, 2); // cup distance from the table edge, m
  const tFall = Math.sqrt((2 * H) / G);
  const vEx = D / tFall;
  const vc = { min: 0.5, max: 6, step: 0.02 };
  const CUP = 0.06;
  return {
    id: "3-5",
    chapter: 3,
    title: "Off the Table",
    hook: `A marble rolls off a ${f(H, 2)} m high table. A cup sits on the floor ${f(D, 2)} m from the table's edge.`,
    goal: "Land the marble in the cup.",
    controls: [{ key: "v", label: "Rolling speed at the edge", ...vc, value: 1, unit: "m/s" }],
    predict: {
      prompt: "At the same instant, a second marble is dropped straight down from the edge. Which reaches the floor first?",
      options: ["The rolling marble (it's faster)", "The dropped marble (shorter path)", "They land at the same time"],
      correct: 2,
      why: "Both start with zero vertical velocity and feel the same g, so their vertical motions are identical. The sideways speed doesn't change how fast you fall.",
    },
    explain: {
      prompt: "Why didn't a faster roll change the fall time?",
      options: [
        "Horizontal and vertical motion are independent: the fall time depends only on the height",
        "Faster marbles feel less gravity",
        "It did change, but too little to see",
      ],
      correct: 0,
      why: "y = h − ½gt² has no vₓ in it. Speed only sets how far you travel sideways during that fixed time: x = vₓt.",
    },
    hints: [
      "First: how long does the fall take?",
      "t = √(2h/g). Then D = v·t.",
      `t = √(2·${f(H, 2)}/9.81) ≈ ${f(tFall, 3)} s, so v ≈ ${f(D, 2)} ÷ ${f(tFall, 3)} ≈ ${f(vEx, 2)} m/s.`,
    ],
    journal: {
      title: "Horizontal launch",
      tex: String.raw`t = \sqrt{\frac{2h}{g}},\qquad x = v_x t`,
      note: "Same fall time whether you roll off or drop.",
    },
    view: { xMin: -0.9, xMax: D + 0.7, yMin: -0.15, yMax: H + 0.35, anchor: "bottom" },
    graph: {
      title: "Height vs. time",
      yLabel: "y (m)",
      tMax: 0.7,
      yMin: 0,
      yMax: Math.ceil(H * 10) / 10,
      series: [
        { label: "rolled", color: COLORS.velocity },
        { label: "dropped", color: COLORS.gravity },
      ],
    },
    solution: { v: snap(vc, vEx) },
    wrong: { v: snap(vc, Math.sqrt(2 * G * H)) }, // mixed up with the speed gained in the fall
    create(p) {
      const rolled = new Body(0.02, new Vec2(0, H), new Vec2(p.v, 0));
      const dropped = new Body(0.02, new Vec2(-0.04, H));
      rolled.forces = [gravity()];
      dropped.forces = [gravity()];
      const strobe = new Strobe(0.05);
      let landX: number | null = null;
      let tLand: number | null = null;
      const sim: Sim = {
        t: 0,
        step(dt) {
          if (landX !== null) return;
          strobe.record(sim.t, rolled.pos);
          const prev = rolled.pos;
          stepBodies([rolled, dropped], sim.t, dt);
          if (rolled.pos.y <= 0) {
            const fr = crossFraction(prev.y, rolled.pos.y, 0);
            landX = prev.x + (rolled.pos.x - prev.x) * fr;
            tLand = sim.t + dt * fr;
            rolled.pos = new Vec2(landX, 0);
            dropped.pos = new Vec2(dropped.pos.x, 0);
          }
          sim.t += dt;
        },
        isDone: () => landX !== null || sim.t > 5,
        outcome() {
          const x = landX ?? 0;
          if (Math.abs(x - D) <= CUP) return { success: true, message: `Plop! In the cup after ${f(tLand!, 3)} s, same time as the dropped marble.` };
          return { success: false, message: `Landed at ${f(x, 2)} m, ${x < D ? "short of" : "past"} the cup. ${x < D ? "Roll faster." : "Roll slower."}` };
        },
        draw(r, ov) {
          r.clear("#fef9c3", "#fefce8");
          r.rect(-3, -0.15, 8, 0.15, "#a8a29e");
          r.rect(-0.9, H - 0.05, 0.9, 0.05, "#92400e");
          r.rect(-0.8, 0, 0.06, H - 0.05, "#78350f");
          r.rect(-0.12, 0, 0.06, H - 0.05, "#78350f");
          r.rect(D - CUP, 0, 2 * CUP, 0.09, "#e63946", "#7f1d1d", 2);
          r.ruler(0, D + 0.5, -0.08, 0.5, "m");
          if (ov.trail) for (const s of strobe.pts) r.circle(s.x, s.y, 0.015, "rgba(213,94,0,.55)", undefined, 3);
          r.circle(dropped.pos.x, dropped.pos.y + 0.015, 0.015, "#0072B2", "#fff", 5);
          r.circle(rolled.pos.x, rolled.pos.y + 0.015, 0.015, "#D55E00", "#fff", 5);
          if (ov.velocity && landX === null) r.arrow(rolled.pos, rolled.vel, 25, COLORS.velocity, "v");
          if (ov.forces && landX === null) r.arrow(rolled.pos, new Vec2(0, -0.02 * G), 300, COLORS.gravity, "F_g");
          r.hud([`t = ${f(tLand ?? sim.t, 3)} s`, `rolled: y = ${f(rolled.pos.y, 2)} m · dropped: y = ${f(dropped.pos.y, 2)} m`]);
        },
        readouts: () => [
          { label: "Time", value: `${f(tLand ?? sim.t, 3)} s` },
          { label: "vₓ (never changes)", value: `${f(rolled.vel.x, 2)} m/s` },
          { label: "v_y (both marbles)", value: `${f(rolled.vel.y, 2)} m/s` },
          { label: "Distance from edge", value: `${f(rolled.pos.x, 2)} m` },
        ],
        equation: () => String.raw`x = v_x t = (${n(p.v, 2)})(${n(tLand ?? sim.t, 3)}) = ${n(rolled.pos.x, 2)}\text{ m}`,
        sample: () => [rolled.pos.y, dropped.pos.y],
      };
      return sim;
    },
  };
});

export const chapter3 = [droneDelivery, riverCrossing, canyonDrop, hikingDetour, offTheTable];
