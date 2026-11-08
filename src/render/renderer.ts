import { Vec2 } from "../physics/vec2";
import { COLORS } from "../physics/forces";
import { isHex, roundRectPath, shade } from "./art/core";
import { car as carArt, pennant } from "./art/props";

const INKS = new Set([COLORS.ink, "#111827", "#111", "#000", "#1f2937"]);

export interface View {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** "bottom" keeps the ground at the bottom of the frame when there is spare vertical room. */
  anchor?: "bottom" | "center";
}

export interface TextOpts {
  color?: string;
  size?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  bold?: boolean;
  bg?: string;
}

/**
 * Draws in world coordinates (meters, y up) with an equal-aspect camera.
 * All physics stays in SI; only this class knows about pixels.
 */
export class Renderer {
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  /** pixels per meter */
  scale = 1;
  private ox = 0;
  private oy = 0;
  private dpr = 1;
  /** Draw a white outline behind vector arrows so they read over illustrated scenes. */
  halo = true;
  /** Soft shading: gradient fills and tinted outlines instead of flat fill + black line. */
  soft = true;
  /** Number of HUD lines drawn last frame (so overlays can avoid them). */
  hudLines = 0;

  /** Fill style for a shape: gentle vertical gradient between screen rows y0..y1. */
  private paint(fill: string, y0: number, y1: number, amt = 0.12): string | CanvasGradient {
    if (!this.soft || !isHex(fill) || Math.abs(y1 - y0) < 5) return fill;
    const g = this.ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, shade(fill, amt));
    g.addColorStop(1, shade(fill, -amt));
    return g;
  }

  /** Outline: a darker tint of the fill instead of near-black ink. */
  private outline(stroke: string, fill: string) {
    const c = this.ctx;
    if (this.soft && INKS.has(stroke) && isHex(fill)) {
      c.strokeStyle = shade(fill, -0.35);
      c.lineWidth = 1.5;
    } else {
      c.strokeStyle = stroke;
      c.lineWidth = this.soft ? 1.5 : 2;
    }
    c.stroke();
  }

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setView(v: View) {
    const pad = 12;
    const sx = (this.w - 2 * pad) / (v.xMax - v.xMin);
    const sy = (this.h - 2 * pad) / (v.yMax - v.yMin);
    this.scale = Math.min(sx, sy);
    const cx = (v.xMin + v.xMax) / 2;
    const cy = (v.yMin + v.yMax) / 2;
    this.ox = this.w / 2 - cx * this.scale;
    this.oy = this.h / 2 + cy * this.scale;
    if (sx < sy && v.anchor === "bottom") {
      // spare vertical room: anchor the bottom of the view to the bottom of the canvas
      this.oy = this.h - pad + v.yMin * this.scale;
    }
  }

  /** World bounds actually visible (wider than the requested view on one axis). */
  visible(): View {
    return {
      xMin: (0 - this.ox) / this.scale,
      xMax: (this.w - this.ox) / this.scale,
      yMin: (this.oy - this.h) / this.scale,
      yMax: this.oy / this.scale,
    };
  }

  sx(x: number) {
    return this.ox + x * this.scale;
  }
  sy(y: number) {
    return this.oy - y * this.scale;
  }

  clear(top = "#dff1ff", bottom = "#f7fbff") {
    const g = this.ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  /** Filled rectangle; (x, y) is the bottom-left corner in world coords. */
  rect(x: number, y: number, w: number, h: number, fill: string, stroke?: string, radius = 0) {
    const c = this.ctx;
    const X = this.sx(x),
      Y = this.sy(y + h),
      W = w * this.scale,
      H = h * this.scale;
    if (radius > 0) roundRectPath(c, X, Y, W, H, radius);
    else {
      c.beginPath();
      c.rect(X, Y, W, H);
    }
    c.fillStyle = this.paint(fill, Y, Y + H, W > 300 || H > 300 ? 0.04 : 0.12);
    c.fill();
    if (stroke) this.outline(stroke, fill);
  }

  /** Rectangle centered at (cx, cy) rotated by angle (radians, CCW). */
  rotRect(cx: number, cy: number, w: number, h: number, angle: number, fill: string, stroke = COLORS.ink) {
    const c = this.ctx;
    c.save();
    c.translate(this.sx(cx), this.sy(cy));
    c.rotate(-angle);
    const W = w * this.scale,
      H = h * this.scale;
    roundRectPath(c, -W / 2, -H / 2, W, H, Math.min(6, Math.min(W, H) * 0.25));
    c.fillStyle = this.paint(fill, -H / 2, H / 2);
    c.fill();
    this.outline(stroke, fill);
    c.restore();
  }

  poly(pts: [number, number][], fill: string, stroke?: string) {
    const c = this.ctx;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(this.sx(x), this.sy(y)) : c.moveTo(this.sx(x), this.sy(y))));
    c.closePath();
    const ys = pts.map((p) => this.sy(p[1]));
    c.fillStyle = this.paint(fill, Math.min(...ys), Math.max(...ys));
    c.fill();
    if (stroke) this.outline(stroke, fill);
  }

  /** Circle with radius in world meters, or in pixels if minPx is larger. */
  circle(x: number, y: number, r: number, fill: string, stroke?: string, minPx = 0) {
    const c = this.ctx;
    const X = this.sx(x),
      Y = this.sy(y),
      R = Math.max(r * this.scale, minPx);
    c.beginPath();
    c.arc(X, Y, R, 0, Math.PI * 2);
    if (this.soft && isHex(fill) && R > 5) {
      const g = c.createRadialGradient(X - R * 0.35, Y - R * 0.35, R * 0.05, X, Y, R);
      g.addColorStop(0, shade(fill, 0.3));
      g.addColorStop(0.6, fill);
      g.addColorStop(1, shade(fill, -0.22));
      c.fillStyle = g;
    } else c.fillStyle = fill;
    c.fill();
    if (stroke) this.outline(stroke, fill);
  }

  line(x1: number, y1: number, x2: number, y2: number, color = COLORS.ink, width = 2, dash: number[] = []) {
    const c = this.ctx;
    c.beginPath();
    c.setLineDash(dash);
    c.moveTo(this.sx(x1), this.sy(y1));
    c.lineTo(this.sx(x2), this.sy(y2));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
    c.setLineDash([]);
  }

  path(pts: Vec2[], color: string, width = 2, dash: number[] = []) {
    if (pts.length < 2) return;
    const c = this.ctx;
    c.beginPath();
    c.setLineDash(dash);
    pts.forEach((p, i) => (i ? c.lineTo(this.sx(p.x), this.sy(p.y)) : c.moveTo(this.sx(p.x), this.sy(p.y))));
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
    c.setLineDash([]);
  }

  text(str: string, x: number, y: number, o: TextOpts = {}) {
    this.textPx(str, this.sx(x), this.sy(y), o);
  }

  textPx(str: string, X: number, Y: number, o: TextOpts = {}) {
    const c = this.ctx;
    const size = o.size ?? 13;
    c.font = `${o.bold ? "600 " : ""}${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    c.textAlign = o.align ?? "center";
    c.textBaseline = o.baseline ?? "middle";
    if (o.bg) {
      const m = c.measureText(str);
      const w = m.width + (this.soft ? 12 : 8);
      const h = size + (this.soft ? 8 : 6);
      let bx = X - w / 2;
      if (c.textAlign === "left" || c.textAlign === "start") bx = X - (this.soft ? 6 : 4);
      if (c.textAlign === "right" || c.textAlign === "end") bx = X - w + (this.soft ? 6 : 4);
      let by = Y - h / 2;
      if (c.textBaseline === "top") by = Y - 3;
      if (c.textBaseline === "bottom") by = Y - h + 3;
      c.save();
      if (this.soft) {
        c.shadowColor = "rgba(15,23,42,0.18)";
        c.shadowBlur = 6;
        c.shadowOffsetY = 1;
      }
      c.fillStyle = o.bg;
      roundRectPath(c, bx, by, w, h, this.soft ? h / 2 : 4);
      c.fill();
      c.restore();
    }
    c.fillStyle = o.color ?? COLORS.ink;
    c.fillText(str, X, Y);
  }

  /**
   * Draw a vector arrow starting at a world point. The arrow's length in pixels is
   * |vec| × pxPerUnit, so arrow length is proportional to magnitude.
   */
  arrow(origin: Vec2, vec: Vec2, pxPerUnit: number, color: string, label?: string, width = 3.5) {
    const X = this.sx(origin.x),
      Y = this.sy(origin.y);
    const dx = vec.x * pxPerUnit,
      dy = -vec.y * pxPerUnit;
    const L = Math.hypot(dx, dy);
    if (L < 3) return;
    const c = this.ctx;
    const ux = dx / L,
      uy = dy / L;
    const head = Math.min(12, L * 0.45);
    if (this.halo) {
      // white outline so arrows stay readable over illustrated scenes
      c.save();
      c.strokeStyle = "rgba(255,255,255,0.95)";
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.lineWidth = width + 4;
      c.lineCap = "round";
      c.lineJoin = "round";
      c.beginPath();
      c.moveTo(X, Y);
      c.lineTo(X + dx - ux * head * 0.8, Y + dy - uy * head * 0.8);
      c.stroke();
      c.beginPath();
      c.moveTo(X + dx, Y + dy);
      c.lineTo(X + dx - ux * head - uy * head * 0.5, Y + dy - uy * head + ux * head * 0.5);
      c.lineTo(X + dx - ux * head + uy * head * 0.5, Y + dy - uy * head - ux * head * 0.5);
      c.closePath();
      c.lineWidth = 4;
      c.stroke();
      c.restore();
    }
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(X, Y);
    c.lineTo(X + dx - ux * head * 0.8, Y + dy - uy * head * 0.8);
    c.stroke();
    c.beginPath();
    c.moveTo(X + dx, Y + dy);
    c.lineTo(X + dx - ux * head - uy * head * 0.5, Y + dy - uy * head + ux * head * 0.5);
    c.lineTo(X + dx - ux * head + uy * head * 0.5, Y + dy - uy * head - ux * head * 0.5);
    c.closePath();
    c.fill();
    if (label) {
      this.textPx(label, X + dx + ux * 14, Y + dy + uy * 14, {
        color: "#fff",
        bg: color,
        size: 12,
        bold: true,
      });
    }
  }

  /** Illustrated car; (x, y) is the bottom-center in world coords, w is length (m). */
  car(x: number, y: number, w: number, body = "#e4572e", facing = 1, rolled = 0, braking = false) {
    carArt(this, { x, y, length: w, color: body, facing: facing < 0 ? -1 : 1, rolled, braking });
  }

  flag(x: number, y: number, h: number, color = "#e63946", label?: string) {
    pennant(this, x, y, h, color);
    if (label) this.text(label, x, y + h + h * 0.2, { size: 12, bold: true, bg: "rgba(255,255,255,.9)" });
  }

  /** Distance ruler along y = yLine from x0 to x1 with ticks every `step` meters. */
  ruler(x0: number, x1: number, yLine: number, step: number, unit = "m", color = "#4b5563") {
    this.line(x0, yLine, x1, yLine, color, 1);
    for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) {
      const X = this.sx(x),
        Y = this.sy(yLine);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(X, Y);
      this.ctx.lineTo(X, Y + 6);
      this.ctx.stroke();
      this.textPx(`${step < 1 ? Math.round(x * 100) / 100 : Math.round(x)} ${unit}`, X, Y + 15, { size: 11, color });
    }
  }

  /** Vertical ruler at x = xLine. */
  vruler(y0: number, y1: number, xLine: number, step: number, unit = "m", color = "#4b5563") {
    this.line(xLine, y0, xLine, y1, color, 1);
    for (let y = Math.ceil(y0 / step) * step; y <= y1 + 1e-9; y += step) {
      const X = this.sx(xLine),
        Y = this.sy(y);
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(X, Y);
      this.ctx.lineTo(X - 6, Y);
      this.ctx.stroke();
      this.textPx(`${Math.round(y * 100) / 100} ${unit}`, X - 9, Y, { size: 11, color, align: "right" });
    }
  }

  /** Heads-up readouts in screen space (top-left stack of pills). */
  hud(lines: string[]) {
    const c = this.ctx;
    this.hudLines = lines.filter(Boolean).length;
    c.save();
    // compact on phones so the readouts don't cover the scene
    const small = this.w < 600;
    const fs = small ? 10.5 : 13,
      ph = small ? 19 : 26,
      gap = small ? 23 : 32,
      m = small ? 7 : 12;
    c.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    let i = 0;
    for (const s of lines) {
      if (!s) continue;
      const w = c.measureText(s).width + (small ? 14 : 20);
      const x = m,
        y = m + i * gap;
      c.shadowColor = "rgba(15,23,42,0.15)";
      c.shadowBlur = small ? 6 : 10;
      c.shadowOffsetY = 2;
      c.fillStyle = "rgba(255,255,255,0.9)";
      roundRectPath(c, x, y, w, ph, ph / 2);
      c.fill();
      c.shadowColor = "transparent";
      c.fillStyle = COLORS.ink;
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(s, x + (small ? 7 : 10), y + ph / 2 + 0.5);
      i++;
    }
    c.restore();
  }
}
