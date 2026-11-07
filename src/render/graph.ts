import type { GraphDef } from "../levels/types";

/** Tiny live plotter: quantities vs. time, with an optional dashed target curve. */
export class LiveGraph {
  private ctx: CanvasRenderingContext2D;
  private data: { t: number; v: number[] }[] = [];
  private w = 0;
  private h = 0;

  constructor(private canvas: HTMLCanvasElement, private def: GraphDef) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  clear() {
    this.data = [];
    this.draw();
  }

  push(t: number, v: number[]) {
    const last = this.data[this.data.length - 1];
    if (last && t - last.t < 1 / 60) return;
    this.data.push({ t, v });
  }

  draw() {
    const c = this.ctx,
      d = this.def;
    const L = 46,
      R = 12,
      T = 26,
      B = 30;
    const pw = this.w - L - R,
      ph = this.h - T - B;
    // autoscale y if data leaves the default range
    let yMin = d.yMin,
      yMax = d.yMax;
    for (const p of this.data)
      for (const v of p.v) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    const tMax = Math.max(d.tMax, this.data.length ? this.data[this.data.length - 1].t : 0);
    const X = (t: number) => L + (t / tMax) * pw;
    const Y = (v: number) => T + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;

    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = "#fff";
    c.fillRect(0, 0, this.w, this.h);
    c.font = "600 12px system-ui, sans-serif";
    c.fillStyle = "#1d2433";
    c.textAlign = "left";
    c.textBaseline = "middle";
    c.fillText(d.title, L, 13);

    // grid
    c.strokeStyle = "#e5e7eb";
    c.lineWidth = 1;
    c.font = "10px system-ui, sans-serif";
    c.fillStyle = "#6b7280";
    const ys = niceStep((yMax - yMin) / 4);
    for (let v = Math.ceil(yMin / ys - 1e-9) * ys; v <= yMax + 1e-9; v += ys) {
      const y = Y(v);
      c.beginPath();
      c.moveTo(L, y);
      c.lineTo(L + pw, y);
      c.stroke();
      c.textAlign = "right";
      c.fillText(fmt(v), L - 5, y);
    }
    const ts = niceStep(tMax / 5);
    for (let t = 0; t <= tMax + 1e-9; t += ts) {
      const x = X(t);
      c.beginPath();
      c.moveTo(x, T);
      c.lineTo(x, T + ph);
      c.stroke();
      c.textAlign = "center";
      c.fillText(fmt(t), x, T + ph + 11);
    }
    c.fillText("time t (s)", L + pw / 2, T + ph + 23);
    c.save();
    c.translate(11, T + ph / 2);
    c.rotate(-Math.PI / 2);
    c.fillText(d.yLabel, 0, 0);
    c.restore();
    // zero line
    if (yMin < 0 && yMax > 0) {
      c.strokeStyle = "#9ca3af";
      c.beginPath();
      c.moveTo(L, Y(0));
      c.lineTo(L + pw, Y(0));
      c.stroke();
    }

    if (d.target) {
      c.strokeStyle = "#111827";
      c.lineWidth = 2;
      c.setLineDash([6, 5]);
      c.beginPath();
      for (let i = 0; i <= 60; i++) {
        const t = (d.tMax * i) / 60;
        const y = Y(d.target(t));
        i ? c.lineTo(X(t), y) : c.moveTo(X(t), y);
      }
      c.stroke();
      c.setLineDash([]);
    }

    d.series.forEach((s, si) => {
      c.strokeStyle = s.color;
      c.lineWidth = 2.5;
      c.beginPath();
      this.data.forEach((p, i) => (i ? c.lineTo(X(p.t), Y(p.v[si])) : c.moveTo(X(p.t), Y(p.v[si]))));
      c.stroke();
    });

    // legend
    let lx = this.w - R;
    c.textAlign = "right";
    c.font = "600 11px system-ui, sans-serif";
    const items = [...d.series.map((s) => ({ label: s.label, color: s.color, dash: false }))];
    if (d.target) items.push({ label: d.targetLabel ?? "target", color: "#111827", dash: true });
    for (const it of items.reverse()) {
      const tw = c.measureText(it.label).width;
      c.fillStyle = "#1d2433";
      c.fillText(it.label, lx, 13);
      lx -= tw + 6;
      c.strokeStyle = it.color;
      c.lineWidth = 2.5;
      c.setLineDash(it.dash ? [4, 3] : []);
      c.beginPath();
      c.moveTo(lx - 16, 13);
      c.lineTo(lx, 13);
      c.stroke();
      c.setLineDash([]);
      lx -= 28;
    }
  }
}

function niceStep(raw: number) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

function fmt(v: number) {
  if (Math.abs(v) < 1e-9) return "0";
  if (Math.abs(v) >= 10) return v.toFixed(0);
  return (Math.round(v * 10) / 10).toString().replace("-", "−");
}
