/**
 * Themed backgrounds. Screen-space layers (sky, distant skyline, hills, space)
 * stay put when the camera zooms; world-space grounds line up with the physics.
 */
import type { Renderer } from "../renderer";
import { clock, inWorld, mulberry32, noisePattern, patternRect, reduceMotion, shade } from "./core";

type SkyKind = "day" | "desert" | "dusk";
const SKIES: Record<SkyKind, [string, string, string]> = {
  day: ["#7fb6ef", "#bfe0fb", "#fbe9d0"],
  desert: ["#78aee6", "#c9e1f2", "#fde3bf"],
  dusk: ["#5b6fb3", "#c39bc6", "#fbd3a8"],
};

/** Gradient sky with a soft sun and drifting clouds. `horizon` is a screen y (px). */
export function sky(r: Renderer, horizon = r.h, kind: SkyKind = "day", opts: { sun?: boolean; clouds?: number } = {}) {
  const c = r.ctx;
  const W = r.w,
    H = r.h;
  const [a, b, d] = SKIES[kind];
  const g = c.createLinearGradient(0, 0, 0, Math.max(40, horizon));
  g.addColorStop(0, a);
  g.addColorStop(0.65, b);
  g.addColorStop(1, d);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  if (opts.sun !== false) {
    const sx = W * 0.83,
      sy = Math.max(36, Math.min(horizon * 0.22, H * 0.2));
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, W * 0.22);
    glow.addColorStop(0, "rgba(255,244,214,0.95)");
    glow.addColorStop(0.12, "rgba(255,236,190,0.75)");
    glow.addColorStop(1, "rgba(255,236,190,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#fff6dc";
    c.beginPath();
    c.arc(sx, sy, Math.max(12, W * 0.02), 0, Math.PI * 2);
    c.fill();
  }
  const n = opts.clouds ?? 4;
  const drift = reduceMotion ? 0 : clock() * 6;
  const rnd = mulberry32(3);
  for (let i = 0; i < n; i++) {
    const fx = (i + 0.3 * rnd()) / n,
      fy = 0.08 + rnd() * 0.22,
      s = 0.6 + rnd() * 0.45;
    const span = W + 240;
    const x = ((fx * span + drift * s) % span) - 120;
    cloud(c, x, fy * Math.max(120, horizon), (Math.min(W, 1400) / 1400) * 70 * s + 18);
  }
}

export function cloud(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "rgba(255,255,255,0.85)";
  c.beginPath();
  c.ellipse(x, y, s, s * 0.32, 0, 0, Math.PI * 2);
  c.ellipse(x - s * 0.45, y + s * 0.05, s * 0.45, s * 0.3, 0, 0, Math.PI * 2);
  c.ellipse(x + s * 0.2, y - s * 0.2, s * 0.5, s * 0.38, 0, 0, Math.PI * 2);
  c.ellipse(x + s * 0.65, y + s * 0.05, s * 0.4, s * 0.25, 0, 0, Math.PI * 2);
  c.fill();
}

/* ---------------- distant scenery in screen space ---------------- */

/** Hazy city skyline sitting on screen row `horizon` (px). */
export function skylineScreen(r: Renderer, horizon: number, height = r.h * 0.4) {
  const c = r.ctx;
  const rnd = mulberry32(19);
  const u = Math.max(14, r.w / 46);
  // far layer
  for (let x = -u; x < r.w + u; ) {
    const w = u * (1.5 + rnd() * 2.2);
    const h = height * (0.45 + rnd() * 0.55);
    const g = c.createLinearGradient(0, horizon - h, 0, horizon);
    g.addColorStop(0, "rgba(176,198,224,0.9)");
    g.addColorStop(1, "rgba(200,218,238,0.6)");
    c.fillStyle = g;
    c.fillRect(x, horizon - h, w, h);
    c.fillStyle = "rgba(255,255,255,0.18)";
    for (let wx = x + u * 0.3; wx < x + w - u * 0.3; wx += u * 0.55) c.fillRect(wx, horizon - h + u * 0.5, u * 0.18, h - u);
    x += w + u * 0.12;
  }
  // near layer: warm low-rise buildings
  const pal = ["#f4c9a3", "#e9a98b", "#f5e2b8", "#c9d8c5", "#d8cfe6", "#f0d1c4"];
  for (let x = -u * 2; x < r.w + u; ) {
    const w = u * (2 + rnd() * 2.2);
    const h = height * (0.25 + rnd() * 0.35);
    const col = pal[Math.floor(rnd() * pal.length)];
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, col);
    g.addColorStop(1, shade(col, -0.1));
    c.fillStyle = g;
    c.fillRect(x, horizon - h, w, h);
    c.fillStyle = shade(col, -0.12);
    c.fillRect(x - 2, horizon - h - 4, w + 4, 5);
    for (let y = horizon - h + u * 0.5; y < horizon - u * 0.5; y += u * 0.7)
      for (let wx = x + u * 0.3; wx < x + w - u * 0.4; wx += u * 0.6) {
        c.fillStyle = "rgba(255,255,255,0.5)";
        c.fillRect(wx, y, u * 0.3, u * 0.35);
      }
    x += w + u * (0.8 + rnd() * 1.4);
  }
}

/** Rolling green hills with a few trees, sitting on screen row `horizon`. */
export function hillsScreen(r: Renderer, horizon: number, height = r.h * 0.22) {
  const c = r.ctx;
  const layers: [string, number, number][] = [
    ["#a9d39a", 1.0, 0.0012],
    ["#8cc47c", 0.62, 0.0021],
  ];
  layers.forEach(([col, hf, freq], i) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, horizon);
    for (let x = 0; x <= r.w + 10; x += 10) {
      const y = horizon - height * hf * (0.55 + 0.45 * Math.sin(x * freq * 6.28 + i * 2.1) * Math.cos(x * freq * 2.2 + i));
      c.lineTo(x, y);
    }
    c.lineTo(r.w, horizon);
    c.closePath();
    c.fill();
  });
  const rnd = mulberry32(5);
  const s = Math.max(10, r.h * 0.035);
  for (let i = 0; i < 9; i++) {
    const x = rnd() * r.w;
    const y = horizon - height * 0.25 * rnd();
    treeScreen(c, x, y, s * (0.7 + rnd() * 0.6));
  }
}

export function treeScreen(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#7a5c45";
  c.fillRect(x - s * 0.12, y - s * 1.6, s * 0.24, s * 1.6);
  const blobs: [number, number, number, string][] = [
    [0, -2.3, 1.15, "#4f9d69"],
    [-0.6, -1.9, 0.8, "#468f5e"],
    [0.65, -2.0, 0.85, "#468f5e"],
    [0.12, -2.8, 0.75, "#5fb27a"],
  ];
  for (const [dx, dy, rr, col] of blobs) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
    c.fill();
  }
}

/** Desert mesas for the canyon. */
export function mesasScreen(r: Renderer, horizon: number, height = r.h * 0.25) {
  const c = r.ctx;
  const rnd = mulberry32(11);
  const draw = (col: string, hf: number, seed: number) => {
    const rr = mulberry32(seed);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, horizon);
    let x = 0;
    while (x < r.w + 40) {
      const flat = 30 + rr() * 120;
      const h = height * hf * (0.4 + rr() * 0.6);
      c.lineTo(x + 18, horizon - h);
      c.lineTo(x + 18 + flat, horizon - h);
      c.lineTo(x + 36 + flat, horizon);
      x += 36 + flat + rr() * 80;
      c.lineTo(x, horizon);
    }
    c.lineTo(r.w, horizon);
    c.closePath();
    c.fill();
  };
  draw("#e8b98f", 1.0, 3);
  draw("#d99a6c", 0.6, 9);
  void rnd;
}

/** Starfield with a soft nebula; twinkles gently. */
export function space(r: Renderer, seed = 7) {
  const c = r.ctx;
  const W = r.w,
    H = r.h;
  const g = c.createLinearGradient(0, 0, W * 0.3, H);
  g.addColorStop(0, "#070b1f");
  g.addColorStop(0.55, "#121a3d");
  g.addColorStop(1, "#1c1446");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const rnd = mulberry32(seed);
  const neb: [number, number, number, string][] = [
    [0.18, 0.25, 0.45, "rgba(99,102,241,0.18)"],
    [0.8, 0.7, 0.5, "rgba(236,72,153,0.12)"],
    [0.55, 0.15, 0.35, "rgba(56,189,248,0.10)"],
  ];
  for (const [fx, fy, fr, col] of neb) {
    const x = fx * W,
      y = fy * H,
      rr = fr * Math.max(W, H);
    const ng = c.createRadialGradient(x, y, 0, x, y, rr);
    ng.addColorStop(0, col);
    ng.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = ng;
    c.fillRect(0, 0, W, H);
  }
  const t = reduceMotion ? 0 : clock();
  const n = Math.round((W * H) / 3500);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W,
      y = rnd() * H,
      big = rnd() > 0.93;
    const tw = 0.55 + 0.45 * Math.sin(t * (0.8 + rnd() * 2) + i);
    c.globalAlpha = big ? 0.9 * tw : 0.35 + 0.4 * tw * rnd();
    c.fillStyle = big ? "#fff8e1" : "#ffffff";
    const s = big ? 1.8 : 0.6 + rnd() * 0.9;
    c.beginPath();
    c.arc(x, y, s, 0, Math.PI * 2);
    c.fill();
    if (big) {
      c.globalAlpha *= 0.4;
      c.fillRect(x - 5, y - 0.4, 10, 0.8);
      c.fillRect(x - 0.4, y - 5, 0.8, 10);
    }
  }
  c.globalAlpha = 1;
}

type WallKind = "plain" | "panel" | "pegboard" | "wallpaper" | "tile" | "brick";
/** Indoor wall filling the whole canvas. */
export function wall(r: Renderer, color = "#efe7da", kind: WallKind = "plain") {
  const c = r.ctx;
  const g = c.createLinearGradient(0, 0, 0, r.h);
  g.addColorStop(0, shade(color, 0.12));
  g.addColorStop(1, shade(color, -0.06));
  c.fillStyle = g;
  c.fillRect(0, 0, r.w, r.h);
  c.save();
  if (kind === "wallpaper") {
    c.fillStyle = "rgba(255,255,255,0.18)";
    for (let x = 0; x < r.w; x += 34) c.fillRect(x, 0, 12, r.h);
    c.fillStyle = "rgba(160,110,60,0.08)";
    for (let x = 17; x < r.w; x += 34) for (let y = 14; y < r.h; y += 34) c.fillRect(x - 2, y - 2, 4, 4);
  } else if (kind === "pegboard") {
    c.fillStyle = "rgba(90,60,30,0.18)";
    for (let x = 10; x < r.w; x += 22) for (let y = 10; y < r.h; y += 22) {
      c.beginPath();
      c.arc(x, y, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  } else if (kind === "panel") {
    c.strokeStyle = "rgba(0,0,0,0.06)";
    c.lineWidth = 2;
    for (let x = 0; x < r.w; x += 120) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, r.h);
      c.stroke();
    }
  } else if (kind === "tile") {
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.lineWidth = 1;
    for (let x = 0; x < r.w; x += 40) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, r.h);
      c.stroke();
    }
    for (let y = 0; y < r.h; y += 40) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(r.w, y);
      c.stroke();
    }
  } else if (kind === "brick") {
    c.strokeStyle = "rgba(0,0,0,0.1)";
    c.lineWidth = 1;
    for (let y = 0, row = 0; y < r.h; y += 22, row++) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(r.w, y);
      c.stroke();
      for (let x = row % 2 ? 0 : 30; x < r.w; x += 60) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 22);
        c.stroke();
      }
    }
  }
  // soft vignette
  const v = c.createRadialGradient(r.w / 2, r.h * 0.45, Math.min(r.w, r.h) * 0.3, r.w / 2, r.h / 2, Math.max(r.w, r.h) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(60,40,20,0.12)");
  c.fillStyle = v;
  c.fillRect(0, 0, r.w, r.h);
  c.restore();
}

type GroundKind = "grass" | "asphalt" | "concrete" | "dirt" | "wood" | "ice" | "plaza";
const GROUND: Record<GroundKind, { base: string; lip: string; noise: { light?: number; dark?: number } }> = {
  grass: { base: "#7cbf6e", lip: "#5ea353", noise: { light: 0.08, dark: 0.08 } },
  asphalt: { base: "#5a6170", lip: "#3f4552", noise: {} },
  concrete: { base: "#c9c4bb", lip: "#a8a297", noise: { light: 0.05, dark: 0.06 } },
  dirt: { base: "#b98a5e", lip: "#9a6f47", noise: { light: 0.06, dark: 0.1 } },
  wood: { base: "#c99a6b", lip: "#a87a4f", noise: { light: 0.04, dark: 0.05 } },
  ice: { base: "#e6f4fb", lip: "#bfe2f3", noise: { light: 0.12, dark: 0.02 } },
  plaza: { base: "#d8d2c8", lip: "#b8b0a3", noise: { light: 0.05, dark: 0.05 } },
};

/** Ground band from world y = `top` down past the bottom of the screen. */
export function ground(r: Renderer, top: number, kind: GroundKind = "grass", x0?: number, x1?: number) {
  const v = r.visible();
  const xa = x0 ?? v.xMin - 1,
    xb = x1 ?? v.xMax + 1;
  const spec = GROUND[kind];
  const depth = top - v.yMin + 1;
  patternRect(r, xa, top - depth, xb - xa, depth, noisePattern(r.ctx, spec.base, spec.noise));
  // darken with depth
  const c = r.ctx;
  const Y0 = r.sy(top),
    Y1 = r.sy(top - depth);
  const g = c.createLinearGradient(0, Y0, 0, Y1);
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(0,0,0,0.18)");
  c.fillStyle = g;
  c.fillRect(r.sx(xa), Y0, (xb - xa) * r.scale, Y1 - Y0);
  // lip
  c.fillStyle = spec.lip;
  c.fillRect(r.sx(xa), Y0 - 1, (xb - xa) * r.scale, Math.max(3, Math.min(8, r.scale * 0.12)));
  if (kind === "wood") {
    c.strokeStyle = "rgba(90,55,25,0.18)";
    c.lineWidth = 1;
    const plank = Math.max(14, r.scale * 0.15);
    for (let y = Y0 + plank; y < Y1; y += plank) {
      c.beginPath();
      c.moveTo(r.sx(xa), y);
      c.lineTo(r.sx(xb), y);
      c.stroke();
    }
  }
  if (kind === "grass") {
    c.fillStyle = "#6aae5d";
    for (let X = r.sx(xa); X < r.sx(xb); X += 6) {
      const hgt = 3 + ((X * 7.3) % 4);
      c.fillRect(X, Y0 - hgt + 1, 2, hgt);
    }
  }
  if (kind === "ice") {
    c.strokeStyle = "rgba(255,255,255,0.7)";
    c.lineWidth = 1;
    const rnd = mulberry32(4);
    for (let i = 0; i < 18; i++) {
      const X = r.sx(xa) + rnd() * (xb - xa) * r.scale,
        Y = Y0 + 6 + rnd() * (Y1 - Y0 - 10);
      c.beginPath();
      c.moveTo(X, Y);
      c.lineTo(X + 20 + rnd() * 40, Y + (rnd() - 0.5) * 4);
      c.stroke();
    }
  }
}

/** Top-down lawn texture with mowing stripes (screen-filling). */
export function lawn(r: Renderer, base = "#9fd18b") {
  const c = r.ctx;
  c.fillStyle = noisePattern(c, base, { light: 0.07, dark: 0.07, seed: 12 });
  c.fillRect(0, 0, r.w, r.h);
  c.fillStyle = "rgba(255,255,255,0.06)";
  const stripe = Math.max(30, r.w / 16);
  for (let x = 0; x < r.w; x += stripe * 2) c.fillRect(x, 0, stripe, r.h);
}

/** A top-down tree canopy (world coords, radius in meters). */
export function treeTop(r: Renderer, x: number, y: number, rad: number) {
  inWorld(r, (c) => {
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.arc(x + rad * 0.25, y - rad * 0.25, rad, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(x - rad * 0.3, y + rad * 0.3, rad * 0.1, x, y, rad);
    g.addColorStop(0, "#6cc07f");
    g.addColorStop(1, "#3e8a57");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, rad, 0, Math.PI * 2);
    c.fill();
  });
}

/** Top-down water band between world y0 and y1, ripples flowing in +x at `flow` m/s. */
export function water(r: Renderer, y0: number, y1: number, t: number, flow = 0) {
  const v = r.visible();
  const c = r.ctx;
  const Y0 = r.sy(y1),
    Y1 = r.sy(y0);
  const g = c.createLinearGradient(0, Y0, 0, Y1);
  g.addColorStop(0, "#5fb4e3");
  g.addColorStop(0.5, "#3f9fd6");
  g.addColorStop(1, "#5fb4e3");
  c.fillStyle = g;
  c.fillRect(0, Y0, r.w, Y1 - Y0);
  // sand banks
  c.fillStyle = "#e9d8a6";
  c.fillRect(0, Y0 - 6, r.w, 6);
  c.fillRect(0, Y1, r.w, 6);
  // ripples
  const rnd = mulberry32(21);
  c.strokeStyle = "rgba(255,255,255,0.55)";
  c.lineWidth = 2;
  c.lineCap = "round";
  const span = v.xMax - v.xMin + 30;
  for (let i = 0; i < 60; i++) {
    const wy = y0 + 2 + rnd() * (y1 - y0 - 4);
    const wx = v.xMin - 15 + ((rnd() * span + flow * t * (0.8 + rnd() * 0.4)) % span);
    const L = 2 + rnd() * 4;
    const X = r.sx(wx),
      Y = r.sy(wy);
    c.beginPath();
    c.moveTo(X, Y);
    c.quadraticCurveTo(X + (L * r.scale) / 2, Y - 3, X + L * r.scale, Y);
    c.stroke();
  }
  c.lineCap = "butt";
}
