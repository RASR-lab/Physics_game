import { Vec2 } from "../physics/vec2";
import { COLORS } from "../physics/forces";

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
    c.beginPath();
    if (radius > 0 && (c as any).roundRect) (c as any).roundRect(X, Y, W, H, radius);
    else c.rect(X, Y, W, H);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    }
  }

  /** Rectangle centered at (cx, cy) rotated by angle (radians, CCW). */
  rotRect(cx: number, cy: number, w: number, h: number, angle: number, fill: string, stroke = COLORS.ink) {
    const c = this.ctx;
    c.save();
    c.translate(this.sx(cx), this.sy(cy));
    c.rotate(-angle);
    c.beginPath();
    const W = w * this.scale,
      H = h * this.scale;
    if ((c as any).roundRect) (c as any).roundRect(-W / 2, -H / 2, W, H, 4);
    else c.rect(-W / 2, -H / 2, W, H);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = 2;
    c.stroke();
    c.restore();
  }

  poly(pts: [number, number][], fill: string, stroke?: string) {
    const c = this.ctx;
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(this.sx(x), this.sy(y)) : c.moveTo(this.sx(x), this.sy(y))));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    }
  }

  /** Circle with radius in world meters, or in pixels if minPx is larger. */
  circle(x: number, y: number, r: number, fill: string, stroke?: string, minPx = 0) {
    const c = this.ctx;
    c.beginPath();
    c.arc(this.sx(x), this.sy(y), Math.max(r * this.scale, minPx), 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    }
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
      const w = m.width + 8;
      const h = size + 6;
      let bx = X - w / 2;
      if (c.textAlign === "left" || c.textAlign === "start") bx = X - 4;
      if (c.textAlign === "right" || c.textAlign === "end") bx = X - w + 4;
      let by = Y - h / 2;
      if (c.textBaseline === "top") by = Y - 3;
      if (c.textBaseline === "bottom") by = Y - h + 3;
      c.fillStyle = o.bg;
      c.beginPath();
      if ((c as any).roundRect) (c as any).roundRect(bx, by, w, h, 4);
      else c.rect(bx, by, w, h);
      c.fill();
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

  /** Friendly cartoon car; (x, y) is the bottom-center in world coords, w is length (m). */
  car(x: number, y: number, w: number, body = "#e4572e", facing = 1) {
    const h = w * 0.32;
    const r = w * 0.12;
    const x0 = x - w / 2;
    this.rect(x0, y + r * 0.9, w, h * 0.55, body, COLORS.ink, 6);
    const cabX = facing > 0 ? x0 + w * 0.18 : x0 + w * 0.3;
    this.rect(cabX, y + r * 0.9 + h * 0.5, w * 0.52, h * 0.5, body, COLORS.ink, 6);
    this.rect(cabX + w * 0.05, y + r * 0.9 + h * 0.58, w * 0.18, h * 0.32, "#cfe8ff");
    this.rect(cabX + w * 0.28, y + r * 0.9 + h * 0.58, w * 0.18, h * 0.32, "#cfe8ff");
    this.circle(x0 + w * 0.22, y + r, r, "#2b2b2b", "#111");
    this.circle(x0 + w * 0.78, y + r, r, "#2b2b2b", "#111");
    this.circle(x0 + w * 0.22, y + r, r * 0.45, "#bbb");
    this.circle(x0 + w * 0.78, y + r, r * 0.45, "#bbb");
  }

  flag(x: number, y: number, h: number, color = "#e63946", label?: string) {
    this.line(x, y, x, y + h, COLORS.ink, 2);
    this.poly(
      [
        [x, y + h],
        [x + h * 0.45, y + h * 0.85],
        [x, y + h * 0.7],
      ],
      color,
    );
    if (label) this.text(label, x, y + h + h * 0.18, { size: 12, bold: true, bg: "rgba(255,255,255,.85)" });
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
      this.textPx(`${Math.round(x)} ${unit}`, X, Y + 15, { size: 11, color });
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

  /** Small heads-up label in screen space (top-left stack). */
  hud(lines: string[]) {
    lines.forEach((s, i) =>
      this.textPx(s, 14, 18 + i * 22, { align: "left", size: 13, bold: true, bg: "rgba(255,255,255,.88)" }),
    );
  }
}
