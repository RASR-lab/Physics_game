/**
 * Illustrated props. All sizes and positions are in world meters (y up), so props
 * line up exactly with the physics they represent.
 */
import type { Renderer } from "../renderer";
import { Vec2 } from "../../physics/vec2";
import { clock, inWorld, mulberry32, reduceMotion, roundRectPath, shade } from "./core";

/* ------------------------------------------------------------------ */
/* Car (side view)                                                    */
/* ------------------------------------------------------------------ */
export interface CarOpts {
  /** Bottom-centre x (m). */
  x: number;
  y?: number;
  /** Length (m); the art is designed at 4.5 m and scaled. */
  length?: number;
  /** Distance rolled (m) → wheel angle (rolling without slipping). */
  rolled?: number;
  braking?: boolean;
  /** Body pitch (rad, negative = nose down in the facing direction). */
  pitch?: number;
  color?: string;
  facing?: 1 | -1;
}
export const CAR_WHEEL_R = 0.36;

export function car(r: Renderer, o: CarOpts) {
  const L = 4.5;
  const k = (o.length ?? L) / L;
  const body = o.color ?? "#e4572e";
  const facing = o.facing ?? 1;
  const wr = CAR_WHEEL_R;
  inWorld(r, (c) => {
    c.translate(o.x, o.y ?? 0);
    c.scale(k * facing, k);
    // ground shadow
    const sh = c.createRadialGradient(0, 0, 0.2, 0, 0, L * 0.6);
    sh.addColorStop(0, "rgba(0,0,0,0.32)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    c.save();
    c.scale(1, 0.14);
    c.fillStyle = sh;
    c.beginPath();
    c.arc(0, 0, L * 0.6, 0, Math.PI * 2);
    c.fill();
    c.restore();

    const wx = 1.45;
    c.fillStyle = "#1f2430";
    for (const sx of [-wx, wx]) {
      c.beginPath();
      c.arc(sx, wr, wr + 0.1, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(-wx, wr);
    c.rotate(o.pitch ?? 0);
    c.translate(wx, -wr);
    const g = c.createLinearGradient(0, 0.3, 0, 1.8);
    g.addColorStop(0, shade(body, -0.28));
    g.addColorStop(0.45, body);
    g.addColorStop(1, shade(body, 0.22));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-2.15, 0.32);
    c.lineTo(-2.25, 0.85);
    c.quadraticCurveTo(-2.25, 1.12, -1.95, 1.16);
    c.lineTo(-1.45, 1.2);
    c.quadraticCurveTo(-1.15, 1.68, -0.8, 1.72);
    c.lineTo(0.45, 1.74);
    c.quadraticCurveTo(0.8, 1.72, 1.25, 1.2);
    c.lineTo(1.95, 1.1);
    c.quadraticCurveTo(2.27, 1.04, 2.27, 0.78);
    c.lineTo(2.2, 0.32);
    c.closePath();
    c.fill();
    c.fillStyle = "#1f2430";
    for (const sx of [-wx, wx]) {
      c.beginPath();
      c.arc(sx, wr, wr + 0.1, 0, Math.PI, false);
      c.fill();
    }
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.lineWidth = 0.05;
    c.beginPath();
    c.moveTo(-2.0, 1.02);
    c.lineTo(1.9, 0.98);
    c.stroke();
    const win = c.createLinearGradient(-1, 1.2, 0.5, 1.7);
    win.addColorStop(0, "#2c3e57");
    win.addColorStop(1, "#5d7fa6");
    c.fillStyle = win;
    c.beginPath();
    c.moveTo(-1.3, 1.22);
    c.quadraticCurveTo(-1.05, 1.6, -0.75, 1.62);
    c.lineTo(0.42, 1.64);
    c.quadraticCurveTo(0.7, 1.6, 1.08, 1.22);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.28)";
    c.beginPath();
    c.moveTo(-0.55, 1.22);
    c.lineTo(-0.25, 1.62);
    c.lineTo(-0.05, 1.62);
    c.lineTo(-0.35, 1.22);
    c.closePath();
    c.fill();
    c.fillStyle = shade(body, -0.15);
    c.fillRect(0.02, 1.22, 0.1, 0.42);
    c.strokeStyle = "rgba(0,0,0,0.18)";
    c.lineWidth = 0.03;
    c.beginPath();
    c.moveTo(0.07, 1.2);
    c.lineTo(0.07, 0.4);
    c.moveTo(-1.25, 1.18);
    c.lineTo(-1.25, 0.45);
    c.stroke();
    c.fillStyle = "rgba(0,0,0,0.25)";
    c.fillRect(-0.4, 0.98, 0.28, 0.05);
    c.fillRect(0.75, 0.97, 0.28, 0.05);
    c.fillStyle = shade(body, -0.2);
    c.beginPath();
    c.ellipse(1.15, 1.25, 0.14, 0.09, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff4c4";
    c.beginPath();
    c.ellipse(2.17, 0.88, 0.09, 0.12, 0, 0, Math.PI * 2);
    c.fill();
    if (o.braking) {
      const bl = c.createRadialGradient(-2.2, 0.92, 0, -2.2, 0.92, 0.9);
      bl.addColorStop(0, "rgba(255,40,40,0.75)");
      bl.addColorStop(1, "rgba(255,40,40,0)");
      c.fillStyle = bl;
      c.beginPath();
      c.arc(-2.2, 0.92, 0.9, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = o.braking ? "#ff3b3b" : "#a32020";
    roundRectPath(c, -2.28, 0.8, 0.14, 0.24, 0.04);
    c.fill();
    c.fillStyle = "rgba(0,0,0,0.22)";
    c.fillRect(-2.18, 0.32, 0.5, 0.12);
    c.fillRect(1.75, 0.32, 0.47, 0.12);
    c.restore();
    // facing is folded into the x-scale, so a car driving left still rolls forward
    const ang = -(o.rolled ?? 0) * facing / (wr * k);
    for (const sx of [-wx, wx]) wheelArt(c, sx, wr, wr, ang);
  });
}

/** Tyre + alloy rim, in the current (world) transform. */
export function wheelArt(c: CanvasRenderingContext2D, x: number, y: number, R: number, ang: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "#23272f";
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#3a404b";
  c.lineWidth = R * 0.1;
  c.beginPath();
  c.arc(0, 0, R * 0.86, 0, Math.PI * 2);
  c.stroke();
  const rim = c.createRadialGradient(-R * 0.15, R * 0.15, 0, 0, 0, R * 0.6);
  rim.addColorStop(0, "#f1f3f6");
  rim.addColorStop(1, "#a5adb9");
  c.fillStyle = rim;
  c.beginPath();
  c.arc(0, 0, R * 0.6, 0, Math.PI * 2);
  c.fill();
  c.rotate(ang);
  c.fillStyle = "#6b7482";
  for (let i = 0; i < 5; i++) {
    c.rotate((Math.PI * 2) / 5);
    c.beginPath();
    c.moveTo(-R * 0.1, R * 0.12);
    c.lineTo(R * 0.1, R * 0.12);
    c.lineTo(R * 0.15, R * 0.55);
    c.lineTo(-R * 0.15, R * 0.55);
    c.closePath();
    c.fill();
  }
  c.fillStyle = "#cfd5dd";
  c.beginPath();
  c.arc(0, 0, R * 0.14, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** A stand-alone tyre (e.g. suspension demo). */
export function tyre(r: Renderer, x: number, y: number, R: number, ang = 0) {
  inWorld(r, (c) => wheelArt(c, x, y, R, ang));
}

/** Car seen from above, centred at (x, y), heading `ang` (rad). */
export function carTop(r: Renderer, x: number, y: number, L: number, W: number, ang: number, color = "#2563eb") {
  inWorld(r, (c) => {
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "rgba(0,0,0,0.25)";
    roundRectPath(c, -L / 2 + L * 0.04, -W / 2 - W * 0.12, L, W, W * 0.3);
    c.fill();
    c.fillStyle = "#1f2430";
    for (const sx of [-0.3, 0.3]) for (const sy of [-0.5, 0.5]) c.fillRect(sx * L - L * 0.09, sy * W - W * 0.08, L * 0.18, W * 0.16);
    const g = c.createLinearGradient(0, -W / 2, 0, W / 2);
    g.addColorStop(0, shade(color, 0.2));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.25));
    c.fillStyle = g;
    roundRectPath(c, -L / 2, -W / 2, L, W, W * 0.35);
    c.fill();
    c.fillStyle = "#2c3e57";
    roundRectPath(c, L * 0.05, -W * 0.36, L * 0.18, W * 0.72, W * 0.12);
    c.fill();
    roundRectPath(c, -L * 0.33, -W * 0.34, L * 0.12, W * 0.68, W * 0.1);
    c.fill();
    c.fillStyle = shade(color, 0.12);
    roundRectPath(c, -L * 0.2, -W * 0.36, L * 0.25, W * 0.72, W * 0.1);
    c.fill();
    c.fillStyle = "#fff4c4";
    c.fillRect(L / 2 - L * 0.04, -W * 0.4, L * 0.03, W * 0.18);
    c.fillRect(L / 2 - L * 0.04, W * 0.22, L * 0.03, W * 0.18);
  });
}

/* ------------------------------------------------------------------ */
/* Boxes, balls, weights                                              */
/* ------------------------------------------------------------------ */

/** Wooden crate centred at (cx, cy), rotated by `ang` (rad, CCW). */
export function crate(r: Renderer, cx: number, cy: number, w: number, h: number, ang = 0, tint = "#c98a4b") {
  inWorld(r, (c, px) => {
    c.translate(cx, cy);
    c.rotate(ang);
    const g = c.createLinearGradient(0, h / 2, 0, -h / 2);
    g.addColorStop(0, shade(tint, 0.12));
    g.addColorStop(1, shade(tint, -0.15));
    c.fillStyle = g;
    roundRectPath(c, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.06);
    c.fill();
    // planks
    c.strokeStyle = shade(tint, -0.3);
    c.lineWidth = Math.max(px, Math.min(w, h) * 0.02);
    for (let i = 1; i < 3; i++) {
      const y = -h / 2 + (h * i) / 3;
      c.beginPath();
      c.moveTo(-w / 2, y);
      c.lineTo(w / 2, y);
      c.stroke();
    }
    // frame + brace
    const f = Math.min(w, h) * 0.13;
    c.strokeStyle = shade(tint, -0.38);
    c.lineWidth = f;
    c.strokeRect(-w / 2 + f / 2, -h / 2 + f / 2, w - f, h - f);
    c.lineWidth = f * 0.8;
    c.beginPath();
    c.moveTo(-w / 2 + f, -h / 2 + f);
    c.lineTo(w / 2 - f, h / 2 - f);
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.18)";
    c.fillRect(-w / 2, h / 2 - f * 0.45, w, f * 0.45);
  });
}

type BallKind = "plain" | "bowling" | "tennis" | "brass" | "rubber";
/** Shaded ball. `minPx` keeps tiny balls visible. */
export function ball(r: Renderer, x: number, y: number, rad: number, color = "#2563eb", kind: BallKind = "plain", minPx = 0, spin = 0) {
  const R = Math.max(rad, minPx / r.scale);
  inWorld(r, (c) => {
    c.translate(x, y);
    const base = kind === "tennis" ? "#c6e83a" : kind === "brass" ? "#d6a23a" : color;
    const g = c.createRadialGradient(-R * 0.35, R * 0.4, R * 0.05, 0, 0, R);
    g.addColorStop(0, shade(base, 0.55));
    g.addColorStop(0.45, base);
    g.addColorStop(1, shade(base, -0.45));
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, R, 0, Math.PI * 2);
    c.fill();
    c.rotate(spin);
    if (kind === "tennis") {
      c.strokeStyle = "rgba(255,255,255,0.9)";
      c.lineWidth = R * 0.1;
      c.beginPath();
      c.arc(-R * 1.1, 0, R * 0.8, -0.9, 0.9);
      c.stroke();
      c.beginPath();
      c.arc(R * 1.1, 0, R * 0.8, Math.PI - 0.9, Math.PI + 0.9);
      c.stroke();
    }
    if (kind === "bowling") {
      c.fillStyle = "rgba(0,0,0,0.55)";
      for (const [dx, dy, rr] of [
        [0.15, 0.35, 0.13],
        [0.42, 0.18, 0.11],
        [0.36, 0.5, 0.11],
      ])
        c.beginPath(), c.arc(dx * R, dy * R, rr * R, 0, Math.PI * 2), c.fill();
    }
    c.rotate(-spin);
    c.fillStyle = "rgba(255,255,255,0.5)";
    c.beginPath();
    c.ellipse(-R * 0.35, R * 0.42, R * 0.22, R * 0.13, -0.6, 0, Math.PI * 2);
    c.fill();
  });
}

/** Cast-iron / steel weight block with a handle; (x, yTop) is top-centre. */
export function weight(r: Renderer, x: number, yTop: number, w: number, h: number, color = "#64748b") {
  inWorld(r, (c) => {
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, shade(color, -0.25));
    g.addColorStop(0.35, shade(color, 0.35));
    g.addColorStop(1, shade(color, -0.3));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w * 0.38, yTop);
    c.lineTo(x + w * 0.38, yTop);
    c.lineTo(x + w / 2, yTop - h);
    c.lineTo(x - w / 2, yTop - h);
    c.closePath();
    c.fill();
    c.strokeStyle = shade(color, -0.3);
    c.lineWidth = w * 0.08;
    c.beginPath();
    c.arc(x, yTop, w * 0.18, Math.PI, 0, true);
    c.stroke();
  });
}

/** Paper grocery bag with produce; (x, yTop) is the hook point. */
export function groceryBag(r: Renderer, x: number, yTop: number, w: number) {
  const h = w * 1.0;
  inWorld(r, (c) => {
    c.strokeStyle = "#8a6a4f";
    c.lineWidth = w * 0.05;
    c.beginPath();
    c.moveTo(x - w * 0.3, yTop - h * 0.22);
    c.quadraticCurveTo(x, yTop + h * 0.05, x + w * 0.3, yTop - h * 0.22);
    c.stroke();
    // produce peeking out
    const bits: [number, number, number, string][] = [
      [-0.25, -0.18, 0.18, "#e63946"],
      [0.05, -0.12, 0.2, "#65a30d"],
      [0.28, -0.2, 0.16, "#f59e0b"],
    ];
    for (const [dx, dy, rr, col] of bits) {
      const g = c.createRadialGradient(x + (dx - 0.05) * w, yTop + (dy + 0.05) * h, 0, x + dx * w, yTop + dy * h, rr * w);
      g.addColorStop(0, shade(col, 0.4));
      g.addColorStop(1, col);
      c.fillStyle = g;
      c.beginPath();
      c.arc(x + dx * w, yTop + dy * h, rr * w, 0, Math.PI * 2);
      c.fill();
    }
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "#c49a6c");
    g.addColorStop(0.5, "#ddb88c");
    g.addColorStop(1, "#b78a5c");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w / 2, yTop - h * 0.25);
    c.lineTo(x + w / 2, yTop - h * 0.25);
    c.lineTo(x + w * 0.46, yTop - h);
    c.lineTo(x - w * 0.46, yTop - h);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(0,0,0,0.08)";
    c.fillRect(x - w / 2, yTop - h * 0.32, w, h * 0.06);
  });
}

/* ------------------------------------------------------------------ */
/* Springs, rods, planks                                              */
/* ------------------------------------------------------------------ */

/** Metal coil spring from a to b (world). `width` = coil diameter (m). */
export function coil(r: Renderer, a: Vec2, b: Vec2, coils: number, width: number, color = "#7B4FA0") {
  const d = b.sub(a);
  const L = d.len();
  if (L < 1e-9) return;
  const u = d.scale(1 / L);
  const n = new Vec2(-u.y, u.x);
  const pts: Vec2[] = [a];
  const lead = Math.min(L * 0.08, width * 0.6);
  pts.push(a.add(u.scale(lead)));
  const N = coils * 2;
  for (let i = 1; i < N; i++) {
    const s = lead + ((L - 2 * lead) * i) / N;
    pts.push(a.add(u.scale(s)).add(n.scale(((i % 2 ? 1 : -1) * width) / 2)));
  }
  pts.push(b.sub(u.scale(lead)));
  pts.push(b);
  const c = r.ctx;
  const lw = Math.max(2, Math.min(6, width * r.scale * 0.16));
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  const stroke = (col: string, w: number, off = 0) => {
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(r.sx(p.x) + off, r.sy(p.y) - off) : c.moveTo(r.sx(p.x) + off, r.sy(p.y) - off)));
    c.strokeStyle = col;
    c.lineWidth = w;
    c.stroke();
  };
  stroke(shade(color, -0.35), lw + 2);
  stroke(color, lw);
  stroke("rgba(255,255,255,0.45)", Math.max(1, lw * 0.3), -lw * 0.2);
  c.restore();
}

/** Wooden plank centred at (cx, cy), length L, thickness t, rotated `ang`. */
export function plank(r: Renderer, cx: number, cy: number, L: number, t: number, ang = 0, tint = "#d6a86b") {
  inWorld(r, (c, px) => {
    c.translate(cx, cy);
    c.rotate(ang);
    c.fillStyle = "rgba(0,0,0,0.15)";
    roundRectPath(c, -L / 2 + t * 0.15, -t / 2 - t * 0.25, L, t, t * 0.3);
    c.fill();
    const g = c.createLinearGradient(0, t / 2, 0, -t / 2);
    g.addColorStop(0, shade(tint, 0.18));
    g.addColorStop(1, shade(tint, -0.22));
    c.fillStyle = g;
    roundRectPath(c, -L / 2, -t / 2, L, t, t * 0.3);
    c.fill();
    c.strokeStyle = "rgba(120,72,30,0.25)";
    c.lineWidth = Math.max(px, t * 0.05);
    const rnd = mulberry32(8);
    for (let i = 0; i < 4; i++) {
      const y = -t / 2 + t * (0.2 + 0.6 * rnd());
      c.beginPath();
      c.moveTo(-L / 2 + L * rnd() * 0.3, y);
      c.lineTo(L / 2 - L * rnd() * 0.3, y + t * 0.05);
      c.stroke();
    }
  });
}

/** Shiny metal bar / rod from a to b with thickness `t` (m). */
export function metalBar(r: Renderer, a: Vec2, b: Vec2, t: number, color = "#94a3b8") {
  const d = b.sub(a);
  const L = d.len();
  const ang = Math.atan2(d.y, d.x);
  inWorld(r, (c) => {
    c.translate(a.x, a.y);
    c.rotate(ang);
    const g = c.createLinearGradient(0, t / 2, 0, -t / 2);
    g.addColorStop(0, shade(color, 0.45));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.35));
    c.fillStyle = g;
    roundRectPath(c, 0, -t / 2, L, t, t / 2);
    c.fill();
  });
}

/** Wooden ramp: right triangle with base on y = y0. */
export function ramp(r: Renderer, pts: [number, number][], tint = "#d6a86b") {
  inWorld(r, (c, px) => {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    const ys = pts.map((p) => p[1]);
    const g = c.createLinearGradient(0, Math.max(...ys), 0, Math.min(...ys));
    g.addColorStop(0, shade(tint, 0.15));
    g.addColorStop(1, shade(tint, -0.15));
    c.fillStyle = g;
    c.fill();
    c.save();
    c.clip();
    c.strokeStyle = "rgba(120,72,30,0.22)";
    c.lineWidth = 2 * px;
    const xs = pts.map((p) => p[0]);
    const x0 = Math.min(...xs),
      x1 = Math.max(...xs);
    const y0 = Math.min(...ys),
      y1 = Math.max(...ys);
    const step = Math.max((y1 - y0) / 6, 18 * px);
    for (let y = y0 + step; y < y1; y += step) {
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
    }
    c.restore();
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.strokeStyle = shade(tint, -0.4);
    c.lineWidth = 2 * px;
    c.stroke();
  });
}

/* ------------------------------------------------------------------ */
/* People                                                             */
/* ------------------------------------------------------------------ */
export interface PersonOpts {
  shirt?: string;
  pants?: string;
  skin?: string;
  hair?: string;
  facing?: 1 | -1;
  /** Arms: hanging, pushing forward, or raised. */
  pose?: "stand" | "push" | "sit" | "glide";
  skates?: boolean;
}

/** Side-view character, feet at (x, y), total height `h` (m). */
export function person(r: Renderer, x: number, y: number, h: number, o: PersonOpts = {}) {
  const shirt = o.shirt ?? "#2563eb";
  const pants = o.pants ?? "#334155";
  const skin = o.skin ?? "#f1c27d";
  const hair = o.hair ?? "#4a3426";
  const f = o.facing ?? 1;
  const pose = o.pose ?? "stand";
  inWorld(r, (c) => {
    c.translate(x, y);
    c.scale((h / 1.75) * f, h / 1.75);
    c.lineCap = "round";
    c.lineJoin = "round";
    // shadow
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.ellipse(0, 0, 0.35, 0.05, 0, 0, Math.PI * 2);
    c.fill();
    const lean = pose === "push" ? 0.12 : pose === "glide" ? 0.06 : 0;
    const hip = pose === "sit" ? 0.45 : 0.9;
    // legs
    c.strokeStyle = pants;
    c.lineWidth = 0.15;
    c.beginPath();
    if (pose === "sit") {
      c.moveTo(-0.05, hip);
      c.lineTo(0.35, hip);
      c.lineTo(0.38, 0.08);
    } else if (pose === "glide" || pose === "push") {
      c.moveTo(lean * 0.5, hip);
      c.lineTo(0.18, 0.08);
      c.moveTo(lean * 0.5, hip);
      c.lineTo(-0.22, 0.1);
    } else {
      c.moveTo(-0.06, hip);
      c.lineTo(-0.07, 0.08);
      c.moveTo(0.06, hip);
      c.lineTo(0.07, 0.08);
    }
    c.stroke();
    // shoes / skates
    c.fillStyle = "#1f2937";
    const feet = pose === "sit" ? [0.38] : pose === "stand" ? [-0.07, 0.07] : [0.18, -0.22];
    for (const fx of feet) {
      roundRectPath(c, fx - 0.08, o.skates ? 0.06 : 0, 0.22, 0.09, 0.04);
      c.fill();
      if (o.skates) {
        c.fillStyle = "#cbd5e1";
        c.fillRect(fx - 0.1, 0.0, 0.28, 0.025);
        c.fillStyle = "#1f2937";
      }
    }
    // torso
    c.save();
    c.translate(lean * 0.5, hip);
    c.rotate(-lean);
    const tg = c.createLinearGradient(-0.2, 0, 0.2, 0);
    tg.addColorStop(0, shade(shirt, -0.2));
    tg.addColorStop(0.5, shirt);
    tg.addColorStop(1, shade(shirt, 0.15));
    c.fillStyle = tg;
    roundRectPath(c, -0.17, -0.02, 0.34, 0.6, 0.12);
    c.fill();
    // arm
    c.strokeStyle = shade(shirt, -0.1);
    c.lineWidth = 0.11;
    c.beginPath();
    c.moveTo(0.02, 0.5);
    if (pose === "push") c.lineTo(0.42, 0.42);
    else if (pose === "glide") c.lineTo(-0.3, 0.32);
    else c.lineTo(0.06, 0.12);
    c.stroke();
    c.fillStyle = skin;
    const hand = pose === "push" ? [0.46, 0.42] : pose === "glide" ? [-0.33, 0.3] : [0.06, 0.1];
    c.beginPath();
    c.arc(hand[0], hand[1], 0.06, 0, Math.PI * 2);
    c.fill();
    // head
    c.fillStyle = skin;
    c.beginPath();
    c.arc(0.02, 0.75, 0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0.0, 0.79, 0.155, Math.PI * 0.05, Math.PI * 1.05);
    c.fill();
    c.fillStyle = "#1f2937";
    c.beginPath();
    c.arc(0.1, 0.76, 0.018, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
}

/** Top-down person (head + shoulders), centred at (x, y), shoulder width `w`. */
export function personTop(r: Renderer, x: number, y: number, w: number, ang: number, shirt = "#CC79A7", hair = "#4a3426") {
  inWorld(r, (c) => {
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.ellipse(w * 0.08, -w * 0.08, w * 0.5, w * 0.28, 0, 0, Math.PI * 2);
    c.fill();
    const g = c.createLinearGradient(0, -w * 0.3, 0, w * 0.3);
    g.addColorStop(0, shade(shirt, -0.2));
    g.addColorStop(1, shade(shirt, 0.2));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0, w * 0.5, w * 0.24, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = hair;
    c.beginPath();
    c.arc(0, 0, w * 0.17, 0, Math.PI * 2);
    c.fill();
  });
}

/* ------------------------------------------------------------------ */
/* Space                                                              */
/* ------------------------------------------------------------------ */

/** Earth with continents, clouds, atmosphere glow and a night side. */
export function earth(r: Renderer, x: number, y: number, R: number, minPx = 0) {
  const Rw = Math.max(R, minPx / r.scale);
  const rot = reduceMotion ? 0 : clock() * 0.02;
  inWorld(r, (c) => {
    c.translate(x, y);
    // atmosphere
    const atm = c.createRadialGradient(0, 0, Rw * 0.95, 0, 0, Rw * 1.12);
    atm.addColorStop(0, "rgba(125,200,255,0.55)");
    atm.addColorStop(1, "rgba(125,200,255,0)");
    c.fillStyle = atm;
    c.beginPath();
    c.arc(0, 0, Rw * 1.12, 0, Math.PI * 2);
    c.fill();
    // ocean
    const og = c.createRadialGradient(-Rw * 0.35, Rw * 0.35, Rw * 0.1, 0, 0, Rw);
    og.addColorStop(0, "#4aa3ff");
    og.addColorStop(0.7, "#1f63c9");
    og.addColorStop(1, "#163f8c");
    c.fillStyle = og;
    c.beginPath();
    c.arc(0, 0, Rw, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.clip();
    c.rotate(rot);
    const rnd = mulberry32(31);
    const greens = ["#3f9d58", "#4ea862", "#7f9a55", "#b9a46c"];
    // smooth landmasses: closed curves through jittered points (quadratic midpoints)
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2,
        d = Math.sqrt(rnd()) * Rw * 0.75;
      const cx = Math.cos(a) * d,
        cy = Math.sin(a) * d;
      const n = 9;
      const base = Rw * (0.14 + rnd() * 0.16);
      const pts: [number, number][] = [];
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        const rr = base * (0.6 + rnd() * 0.7);
        pts.push([cx + Math.cos(ang) * rr * 1.2, cy + Math.sin(ang) * rr * 0.85]);
      }
      c.fillStyle = greens[i % greens.length];
      c.beginPath();
      const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      const m0 = mid(pts[n - 1], pts[0]);
      c.moveTo(m0[0], m0[1]);
      for (let k = 0; k < n; k++) {
        const p = pts[k],
          q = pts[(k + 1) % n];
        const m = mid(p, q);
        c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
      }
      c.closePath();
      c.fill();
      // highlands
      c.fillStyle = "rgba(255,255,255,0.08)";
      c.beginPath();
      c.ellipse(cx - base * 0.2, cy + base * 0.15, base * 0.45, base * 0.25, 0.4, 0, Math.PI * 2);
      c.fill();
    }
    // polar caps + clouds
    c.fillStyle = "rgba(255,255,255,0.85)";
    c.beginPath();
    c.ellipse(0, Rw * 0.95, Rw * 0.45, Rw * 0.12, 0, 0, Math.PI * 2);
    c.ellipse(0, -Rw * 0.97, Rw * 0.4, Rw * 0.1, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.ellipse((rnd() - 0.5) * 1.6 * Rw, (rnd() - 0.5) * 1.6 * Rw, Rw * (0.12 + rnd() * 0.2), Rw * 0.03, rnd(), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    // night side
    const night = c.createLinearGradient(-Rw, Rw, Rw, -Rw);
    night.addColorStop(0, "rgba(5,10,30,0)");
    night.addColorStop(0.55, "rgba(5,10,30,0.05)");
    night.addColorStop(1, "rgba(5,10,30,0.6)");
    c.fillStyle = night;
    c.beginPath();
    c.arc(0, 0, Rw, 0, Math.PI * 2);
    c.fill();
  });
}

/** Cratered moon. */
export function moon(r: Renderer, x: number, y: number, R: number, minPx = 0) {
  const Rw = Math.max(R, minPx / r.scale);
  inWorld(r, (c) => {
    c.translate(x, y);
    const g = c.createRadialGradient(-Rw * 0.35, Rw * 0.35, Rw * 0.1, 0, 0, Rw);
    g.addColorStop(0, "#f3f4f6");
    g.addColorStop(1, "#9ca3af");
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, Rw, 0, Math.PI * 2);
    c.fill();
    const rnd = mulberry32(9);
    c.fillStyle = "rgba(100,110,125,0.35)";
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.arc((rnd() - 0.5) * 1.2 * Rw, (rnd() - 0.5) * 1.2 * Rw, Rw * (0.08 + rnd() * 0.14), 0, Math.PI * 2);
      c.fill();
    }
  });
}

/** Satellite / probe with solar panels, centred at (x, y), body size `s`, heading `ang`. */
export function satellite(r: Renderer, x: number, y: number, s: number, ang = 0, minPx = 0) {
  const S = Math.max(s, minPx / r.scale);
  inWorld(r, (c) => {
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "#1e3a8a";
    for (const sy of [-1, 1]) {
      c.fillRect(-S * 0.35, sy * S * 0.45 - (sy < 0 ? S * 0.9 : 0), S * 0.7, S * 0.9);
      c.strokeStyle = "rgba(147,197,253,0.8)";
      c.lineWidth = S * 0.04;
      c.strokeRect(-S * 0.35, sy * S * 0.45 - (sy < 0 ? S * 0.9 : 0), S * 0.7, S * 0.9);
    }
    c.fillStyle = "#cbd5e1";
    c.fillRect(-S * 0.04, -S * 0.5, S * 0.08, S);
    const g = c.createLinearGradient(0, -S * 0.3, 0, S * 0.3);
    g.addColorStop(0, "#fde68a");
    g.addColorStop(1, "#b7791f");
    c.fillStyle = g;
    roundRectPath(c, -S * 0.4, -S * 0.3, S * 0.8, S * 0.6, S * 0.1);
    c.fill();
  });
}

/** Space-station module with solar arrays. Box from (x, yCenter) of size w×h. */
export function station(r: Renderer, x: number, yc: number, w: number, h: number) {
  inWorld(r, (c) => {
    c.translate(x, yc);
    c.fillStyle = "#475569";
    c.fillRect(w * 0.9, -h * 1.1, w * 0.18, h * 2.2);
    for (const sy of [-1, 1]) {
      const py = sy > 0 ? h * 0.75 : -h * 1.1;
      c.fillStyle = "#1e3a8a";
      c.fillRect(w * 1.08, py, w * 1.6, h * 0.35);
      c.strokeStyle = "rgba(147,197,253,0.9)";
      c.lineWidth = w * 0.03;
      for (let i = 0; i <= 6; i++) {
        c.beginPath();
        c.moveTo(w * 1.08 + (w * 1.6 * i) / 6, py);
        c.lineTo(w * 1.08 + (w * 1.6 * i) / 6, py + h * 0.35);
        c.stroke();
      }
    }
    const g = c.createLinearGradient(0, h / 2, 0, -h / 2);
    g.addColorStop(0, "#f1f5f9");
    g.addColorStop(0.5, "#cbd5e1");
    g.addColorStop(1, "#7c8aa0");
    c.fillStyle = g;
    roundRectPath(c, 0, -h / 2, w, h, w * 0.25);
    c.fill();
    c.fillStyle = "#334155";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.arc(w * 0.5, -h * 0.3 + i * h * 0.3, w * 0.09, 0, Math.PI * 2);
      c.fill();
    }
  });
}

/** Cargo pod (for "coasting in space"). Centred at (x, y), square side s. */
export function cargoPod(r: Renderer, x: number, y: number, s: number, flame = 0) {
  inWorld(r, (c) => {
    c.translate(x, y);
    if (flame > 0) {
      const L = s * (0.5 + flame) * (0.9 + (reduceMotion ? 0 : 0.1 * Math.sin(clock() * 40)));
      const g = c.createLinearGradient(-s / 2, 0, -s / 2 - L, 0);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.25, "rgba(253,224,71,0.9)");
      g.addColorStop(0.7, "rgba(249,115,22,0.6)");
      g.addColorStop(1, "rgba(249,115,22,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-s / 2, s * 0.25);
      c.quadraticCurveTo(-s / 2 - L * 0.5, s * 0.3, -s / 2 - L, 0);
      c.quadraticCurveTo(-s / 2 - L * 0.5, -s * 0.3, -s / 2, -s * 0.25);
      c.closePath();
      c.fill();
    }
    c.fillStyle = "#475569";
    c.beginPath();
    c.moveTo(-s / 2, s * 0.22);
    c.lineTo(-s / 2 - s * 0.18, s * 0.3);
    c.lineTo(-s / 2 - s * 0.18, -s * 0.3);
    c.lineTo(-s / 2, -s * 0.22);
    c.fill();
    const g = c.createLinearGradient(0, s / 2, 0, -s / 2);
    g.addColorStop(0, "#fbbf24");
    g.addColorStop(1, "#b45309");
    c.fillStyle = g;
    roundRectPath(c, -s / 2, -s / 2, s, s, s * 0.14);
    c.fill();
    c.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = -1; i <= 1; i += 2) c.fillRect(-s / 2, i * s * 0.28 - s * 0.03, s, s * 0.06);
    c.fillStyle = "rgba(255,255,255,0.3)";
    c.fillRect(-s / 2 + s * 0.08, s * 0.32, s * 0.84, s * 0.08);
  });
}

/* ------------------------------------------------------------------ */
/* Vehicles from above                                                */
/* ------------------------------------------------------------------ */

/** Quadcopter seen from above; `arm` = distance from centre to each rotor (m). */
export function drone(r: Renderer, x: number, y: number, arm: number, spinning = true) {
  const t = reduceMotion ? 0 : clock();
  inWorld(r, (c) => {
    c.translate(x, y);
    c.fillStyle = "rgba(0,0,0,0.2)";
    c.beginPath();
    c.ellipse(arm * 0.3, -arm * 0.3, arm * 0.9, arm * 0.9, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#334155";
    c.lineWidth = arm * 0.14;
    c.lineCap = "round";
    for (const [sx, sy] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(sx * arm * 0.7, sy * arm * 0.7);
      c.stroke();
      c.fillStyle = "rgba(148,163,184,0.35)";
      c.beginPath();
      c.arc(sx * arm * 0.7, sy * arm * 0.7, arm * 0.48, 0, Math.PI * 2);
      c.fill();
      if (spinning) {
        c.save();
        c.translate(sx * arm * 0.7, sy * arm * 0.7);
        c.rotate(t * 25 * sx);
        c.fillStyle = "rgba(30,41,59,0.55)";
        c.fillRect(-arm * 0.45, -arm * 0.04, arm * 0.9, arm * 0.08);
        c.restore();
      }
    }
    const g = c.createRadialGradient(-arm * 0.1, arm * 0.1, 0, 0, 0, arm * 0.4);
    g.addColorStop(0, "#64748b");
    g.addColorStop(1, "#1e293b");
    c.fillStyle = g;
    roundRectPath(c, -arm * 0.35, -arm * 0.28, arm * 0.7, arm * 0.56, arm * 0.15);
    c.fill();
    c.fillStyle = "#22c55e";
    c.beginPath();
    c.arc(arm * 0.22, 0, arm * 0.06, 0, Math.PI * 2);
    c.fill();
  });
}

/** Small ferry seen from above, centred at (x, y), heading `ang`. */
export function boatTop(r: Renderer, x: number, y: number, L: number, W: number, ang: number) {
  inWorld(r, (c) => {
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "rgba(255,255,255,0.35)";
    c.beginPath();
    c.moveTo(-L * 0.5, W * 0.45);
    c.lineTo(-L * 1.0, W * 0.9);
    c.lineTo(-L * 1.0, -W * 0.9);
    c.lineTo(-L * 0.5, -W * 0.45);
    c.fill();
    const hull = () => {
      c.beginPath();
      c.moveTo(-L / 2, -W / 2);
      c.lineTo(L * 0.2, -W / 2);
      c.quadraticCurveTo(L / 2, -W * 0.4, L / 2, 0);
      c.quadraticCurveTo(L / 2, W * 0.4, L * 0.2, W / 2);
      c.lineTo(-L / 2, W / 2);
      c.closePath();
    };
    c.fillStyle = "#b91c1c";
    c.save();
    c.translate(L * 0.03, -W * 0.06);
    hull();
    c.fill();
    c.restore();
    const g = c.createLinearGradient(0, -W / 2, 0, W / 2);
    g.addColorStop(0, "#e2e8f0");
    g.addColorStop(1, "#ffffff");
    c.fillStyle = g;
    hull();
    c.fill();
    c.fillStyle = "#93c5fd";
    roundRectPath(c, -L * 0.3, -W * 0.28, L * 0.36, W * 0.56, W * 0.1);
    c.fill();
    c.fillStyle = "#e63946";
    c.fillRect(-L * 0.48, -W * 0.12, L * 0.08, W * 0.24);
  });
}

/* ------------------------------------------------------------------ */
/* Misc                                                               */
/* ------------------------------------------------------------------ */

/** Pennant flag on a pole, foot at (x, y), height h. */
export function pennant(r: Renderer, x: number, y: number, h: number, color = "#e63946") {
  const t = reduceMotion ? 0 : clock();
  inWorld(r, (c, px) => {
    c.fillStyle = "#6b7280";
    c.fillRect(x - 1.5 * px, y, 3 * px, h);
    c.fillStyle = "#d1d5db";
    c.beginPath();
    c.arc(x, y + h, 3 * px, 0, Math.PI * 2);
    c.fill();
    const w = h * 0.45,
      fh = h * 0.28;
    const wave = Math.sin(t * 3) * fh * 0.08;
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, shade(color, -0.15));
    g.addColorStop(1, shade(color, 0.15));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y + h - 2 * px);
    c.quadraticCurveTo(x + w * 0.5, y + h - fh * 0.15 + wave, x + w, y + h - fh * 0.5);
    c.quadraticCurveTo(x + w * 0.5, y + h - fh * 0.85 - wave, x, y + h - fh);
    c.closePath();
    c.fill();
  });
}

/** Spiky desert cactus, foot at (x, y), height h. */
export function cactus(r: Renderer, x: number, y: number, h: number) {
  inWorld(r, (c) => {
    c.strokeStyle = "#4d8b55";
    c.lineCap = "round";
    c.lineWidth = h * 0.18;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y + h);
    c.moveTo(x, y + h * 0.45);
    c.lineTo(x - h * 0.25, y + h * 0.45);
    c.lineTo(x - h * 0.25, y + h * 0.75);
    c.moveTo(x, y + h * 0.35);
    c.lineTo(x + h * 0.22, y + h * 0.35);
    c.lineTo(x + h * 0.22, y + h * 0.6);
    c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.25)";
    c.lineWidth = h * 0.05;
    c.beginPath();
    c.moveTo(x - h * 0.03, y + h * 0.1);
    c.lineTo(x - h * 0.03, y + h * 0.95);
    c.stroke();
  });
}
