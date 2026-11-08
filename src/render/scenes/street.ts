/**
 * Illustrated city-street scene (pilot art style for level 2-1).
 *
 * Purely cosmetic: everything here reads physics state but never changes it.
 * World units are meters (y up); the road is drawn in a slight oblique view so
 * the car's wheels sit at y = 0, the far sidewalk is "behind" and the near
 * sidewalk is "in front".
 */
import type { Renderer } from "../renderer";
import { inWorld, mulberry32, noisePattern, reduceMotion, smoothstep as smooth } from "../art/core";
import { sky } from "../art/backdrops";

/* ---------------- layout (world meters) ---------------- */
export const STREET = {
  farWalkTop: 2.7,
  farCurb: 2.0,
  roadNear: -2.4,
  nearWalkBottom: -4.6,
  laneDivider: 0.95,
  /** Horizontal shift per meter of depth, for the oblique crosswalk/stop line. */
  skew: 0.18,
};

/* ---------------- deterministic scenery ---------------- */
interface Building {
  x: number;
  w: number;
  h: number;
  color: string;
  trim: string;
  windows: boolean;
}

const rnd = mulberry32(211);
const FAR: Building[] = [];
const NEAR: Building[] = [];
const TREES: { x: number; s: number }[] = [];
{
  for (let x = -60; x < 420; ) {
    const w = 5 + rnd() * 7;
    FAR.push({ x, w, h: 8 + rnd() * 9, color: "#b9cbe0", trim: "#a9bdd4", windows: false });
    x += w + 0.4;
  }
  const palette = [
    ["#f4c9a3", "#e3ae84"],
    ["#e9a98b", "#d48e70"],
    ["#f5e2b8", "#e5cc95"],
    ["#c9d8c5", "#adc2a8"],
    ["#d8cfe6", "#bfb3d3"],
    ["#f0d1c4", "#dbb3a3"],
  ];
  for (let x = -60; x < 420; ) {
    const w = 6 + rnd() * 6;
    const [color, trim] = palette[Math.floor(rnd() * palette.length)];
    NEAR.push({ x, w, h: 5.5 + rnd() * 7, color, trim, windows: true });
    x += w + 2.5 + rnd() * 3;
  }
  for (let x = -56; x < 420; x += 8 + rnd() * 6) TREES.push({ x, s: 0.85 + rnd() * 0.4 });
}

/* ================================================================== */
/* Background                                                         */
/* ================================================================== */
export type StreetLayout = typeof STREET;

export function drawBackdrop(r: Renderer, timeSec: number, S: StreetLayout = STREET) {
  const c = r.ctx;
  const W = r.w,
    H = r.h;
  const horizonY = r.sy(S.farWalkTop);

  sky(r, horizonY, "day");
  void W;
  void H;
  void timeSec;
  void c;

  // skyline layers
  inWorld(r, (c, px) => {
    const base = S.farWalkTop;
    // parallax: farther layers drift less as the camera pans
    const vis = r.visible();
    const camX = (vis.xMin + vis.xMax) / 2;
    const farShift = (camX - 22) * 0.55;
    const nearShift = (camX - 22) * 0.25;
    // far: hazy silhouettes that fade into the sky
    for (const b0 of FAR) {
      const b = { ...b0, x: b0.x + farShift };
      const hz = c.createLinearGradient(0, base, 0, base + b.h);
      hz.addColorStop(0, "rgba(176,198,224,0.95)");
      hz.addColorStop(1, "rgba(196,216,238,0.55)");
      c.fillStyle = hz;
      c.fillRect(b.x, base, b.w, b.h);
      c.fillStyle = "rgba(255,255,255,0.18)";
      for (let wx = b.x + 0.8; wx < b.x + b.w - 0.6; wx += 1.6) c.fillRect(wx, base + 1.5, 0.5, b.h - 3);
    }
    // near: colored buildings with windows
    for (const b0 of NEAR) {
      const b = { ...b0, x: b0.x + nearShift };
      const grd = c.createLinearGradient(b.x, 0, b.x + b.w, 0);
      grd.addColorStop(0, b.color);
      grd.addColorStop(1, b.trim);
      c.fillStyle = grd;
      c.fillRect(b.x, base, b.w, b.h);
      // roof ledge
      c.fillStyle = b.trim;
      c.fillRect(b.x - 0.2, base + b.h, b.w + 0.4, 0.35);
      // windows
      const cols = Math.max(2, Math.floor(b.w / 1.8));
      const gap = b.w / cols;
      for (let y = base + 1.6; y < base + b.h - 1.0; y += 1.9) {
        for (let i = 0; i < cols; i++) {
          const wx = b.x + i * gap + gap * 0.25;
          c.fillStyle = "rgba(255,255,255,0.55)";
          c.fillRect(wx, y, gap * 0.5, 1.0);
          c.fillStyle = "rgba(90,120,160,0.35)";
          c.fillRect(wx, y, gap * 0.5, 0.45);
        }
      }
      // door
      c.fillStyle = "rgba(60,50,60,0.35)";
      c.fillRect(b.x + b.w * 0.45, base, 1.0, 1.4);
    }
    // trees on the far sidewalk
    for (const t of TREES) tree(c, t.x, base - 0.15, t.s);
    void px;
  });
}


/**
 * Camera for the street: wide shot at the start, eases in on the car as it nears
 * the line, then pulls back out after the stop so the full strobe pattern is visible.
 */
export function streetCamera(front: number, stopX: number, sinceStop: number, stopped: boolean) {
  const wide = { xMin: -4, xMax: Math.max(stopX + 8, front + 5) };
  const zoomIn = smooth(front / stopX);
  const tightMax = Math.max(stopX + 6, front + 5);
  const tight = { xMin: Math.min(front - 16, tightMax - 22), xMax: tightMax };
  let xMin = wide.xMin + (tight.xMin - wide.xMin) * zoomIn;
  let xMax = wide.xMax + (tight.xMax - wide.xMax) * zoomIn;
  if (stopped) {
    const back = reduceMotion ? 1 : smooth((sinceStop - 1.4) / 1.1);
    xMin += (wide.xMin - xMin) * back;
    xMax += (wide.xMax - xMax) * back;
  }
  return { xMin, xMax, yMin: -5.4, yMax: 6, anchor: "bottom" as const };
}

function tree(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = "#8a6a4f";
  c.fillRect(x - 0.15 * s, y, 0.3 * s, 2.2 * s);
  const blobs: [number, number, number, string][] = [
    [0, 3.0, 1.35, "#4f9d69"],
    [-0.75, 2.5, 0.95, "#468f5e"],
    [0.8, 2.6, 1.0, "#468f5e"],
    [0.15, 3.6, 0.95, "#5fb27a"],
  ];
  for (const [dx, dy, rr, col] of blobs) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "rgba(255,255,255,0.18)";
  c.beginPath();
  c.arc(x + 0.35 * s, y + 3.9 * s, 0.45 * s, 0, Math.PI * 2);
  c.fill();
}

/* ================================================================== */
/* Street surface                                                     */
/* ================================================================== */
export function drawRoad(r: Renderer, stopX: number | null, zoneW = 0, S: StreetLayout = STREET) {
  const vis = r.visible();
  const x0 = vis.xMin - 2,
    x1 = vis.xMax + 2;
  const c = r.ctx;

  // far sidewalk
  r.rect(x0, S.farCurb, x1 - x0, S.farWalkTop - S.farCurb, "#d9d4cc");
  r.rect(x0, S.farCurb, x1 - x0, 0.18, "#b9b2a7");
  for (let x = Math.floor(x0 / 2.5) * 2.5; x < x1; x += 2.5) r.line(x, S.farCurb + 0.18, x + 0.12, S.farWalkTop, "rgba(0,0,0,.08)", 1);

  // asphalt
  const top = r.sy(S.farCurb),
    bot = r.sy(S.roadNear);
  c.fillStyle = noisePattern(c, "#565d6b");
  c.fillRect(r.sx(x0), top, r.sx(x1) - r.sx(x0), bot - top);
  const shade = c.createLinearGradient(0, top, 0, bot);
  shade.addColorStop(0, "rgba(255,255,255,0.08)");
  shade.addColorStop(1, "rgba(0,0,0,0.12)");
  c.fillStyle = shade;
  c.fillRect(r.sx(x0), top, r.sx(x1) - r.sx(x0), bot - top);

  // lane divider (dashed, behind the car)
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) {
    if (stopX !== null && x > stopX - 4 && x < stopX + 6) continue;
    r.rect(x, S.laneDivider, 3, 0.18, "rgba(250,214,92,0.95)");
  }

  if (stopX === null) return;
  // stop zone (goal), stop line and crosswalk, all skewed for depth
  const sk = (y: number) => (y - S.roadNear) * S.skew;
  const band = (xa: number, xb: number, fill: string) =>
    r.poly(
      [
        [xa + sk(S.roadNear), S.roadNear],
        [xb + sk(S.roadNear), S.roadNear],
        [xb + sk(S.farCurb), S.farCurb],
        [xa + sk(S.farCurb), S.farCurb],
      ],
      fill,
    );
  band(stopX - zoneW, stopX, "rgba(52,211,153,0.28)");
  band(stopX - zoneW, stopX - zoneW + 0.08, "rgba(16,185,129,0.8)");
  band(stopX, stopX + 0.45, "#f8fafc");
  for (let i = 0; i < 6; i++) {
    const y0 = S.roadNear + 0.2 + i * 0.72;
    const y1 = y0 + 0.42;
    r.poly(
      [
        [stopX + 1.1 + sk(y0), y0],
        [stopX + 4.6 + sk(y0), y0],
        [stopX + 4.6 + sk(y1), y1],
        [stopX + 1.1 + sk(y1), y1],
      ],
      "rgba(248,250,252,0.92)",
    );
  }
}

/** Near curb, sidewalk and grass strip, drawn in front of the car. */
export function drawForeground(r: Renderer, S: StreetLayout = STREET) {
  const vis = r.visible();
  const x0 = vis.xMin - 2,
    x1 = vis.xMax + 2;
  r.rect(x0, S.roadNear - 0.3, x1 - x0, 0.3, "#c2bbb0");
  r.rect(x0, S.roadNear - 0.3, x1 - x0, 0.08, "#ece7df");
  r.rect(x0, S.nearWalkBottom, x1 - x0, S.roadNear - 0.3 - S.nearWalkBottom, "#e4dfd7");
  // grass below
  r.rect(x0, vis.yMin - 1, x1 - x0, S.nearWalkBottom - vis.yMin + 1, "#7cbf6e");
  r.rect(x0, S.nearWalkBottom - 0.25, x1 - x0, 0.25, "#6aae5d");
  inWorld(r, (c) => {
    for (let x = Math.floor(x0 / 7) * 7 + 2; x < x1; x += 7) {
      c.fillStyle = "#5ea353";
      c.beginPath();
      c.ellipse(x, S.nearWalkBottom - 0.1, 1.1, 0.55, 0, 0, Math.PI, true);
      c.fill();
    }
  });
}

export function drawStopSign(r: Renderer, x: number, base = STREET.farCurb + 0.35) {
  inWorld(r, (c, px) => {
    c.fillStyle = "#8e96a3";
    c.fillRect(x - 0.08, base, 0.16, 3.2);
    const cx = x,
      cy = base + 3.5,
      R = 0.75;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      const px_ = cx + R * Math.cos(a),
        py_ = cy + R * Math.sin(a);
      i ? c.lineTo(px_, py_) : c.moveTo(px_, py_);
    }
    c.closePath();
    c.fillStyle = "#d62f2f";
    c.fill();
    c.lineWidth = 0.09;
    c.strokeStyle = "#ffffff";
    c.stroke();
    void px;
  });
  if (r.scale > 14) r.text("STOP", x, base + 3.5, { color: "#fff", size: r.scale * 0.42, bold: true });
}

/* ================================================================== */
/* Effects: skid marks, smoke, confetti, banners                      */
/* ================================================================== */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color?: string;
  rot?: number;
  vr?: number;
}

export class StreetFx {
  smoke: Particle[] = [];
  private rand = mulberry32(42);
  shakeT = -1;

  emitSmoke(x: number, dt: number, intensity: number) {
    const rate = 18 * intensity; // puffs per second per tyre
    for (const wx of [x - 1.45, x + 1.45]) {
      let n = rate * dt;
      while (n > 0) {
        if (n < 1 && this.rand() > n) break;
        n -= 1;
        this.smoke.push({
          x: wx + (this.rand() - 0.5) * 0.4,
          y: 0.1,
          vx: -0.6 - this.rand() * 1.2,
          vy: 0.4 + this.rand() * 0.6,
          life: 0,
          max: 0.7 + this.rand() * 0.5,
          size: 0.25 + this.rand() * 0.2,
        });
      }
    }
  }

  update(dt: number) {
    for (const p of this.smoke) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 0.9;
    }
    this.smoke = this.smoke.filter((p) => p.life < p.max);
    if (this.shakeT >= 0) this.shakeT += dt;
  }

  drawSmoke(r: Renderer) {
    inWorld(r, (c) => {
      for (const p of this.smoke) {
        const a = 0.26 * (1 - p.life / p.max);
        c.fillStyle = `rgba(225,228,234,${a})`;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      }
    });
  }

  /** Screen-shake offset in px (small, decays quickly). */
  shake(): [number, number] {
    if (reduceMotion || this.shakeT < 0 || this.shakeT > 0.45) return [0, 0];
    const k = (1 - this.shakeT / 0.45) * 6;
    return [Math.sin(this.shakeT * 70) * k, Math.cos(this.shakeT * 55) * k * 0.5];
  }
}


/** Skid marks from where braking started to the tyres' current positions. */
export function drawSkids(r: Renderer, startX: number, nowX: number, strength: number) {
  if (nowX <= startX) return;
  const c = r.ctx;
  for (const wx of [-1.45, 1.45]) {
    const a = r.sx(startX + wx),
      b = r.sx(nowX + wx);
    const Y = r.sy(-0.02);
    const g = c.createLinearGradient(a, 0, b, 0);
    g.addColorStop(0, "rgba(20,20,24,0)");
    g.addColorStop(0.25, `rgba(20,20,24,${0.18 * strength})`);
    g.addColorStop(1, `rgba(20,20,24,${0.4 * strength})`);
    c.fillStyle = g;
    c.fillRect(a, Y - 2, b - a, Math.max(3, r.scale * 0.18));
  }
}

