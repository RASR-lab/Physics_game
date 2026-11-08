/**
 * Generic end-of-attempt feedback drawn on top of any level: a pop-in banner,
 * plus confetti on success. Runs on real time, after the simulation has stopped.
 */
import type { Renderer } from "../renderer";
import { mulberry32, reduceMotion, roundRectPath } from "./core";

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  color: string;
  life: number;
}

const COLORS = ["#f4b400", "#2f5bd3", "#e4572e", "#10b981", "#cc79a7", "#56b4e9"];

export class Celebration {
  private t = -1;
  private text = "";
  private good = false;
  private bits: Bit[] = [];
  private rnd = mulberry32(42);

  start(success: boolean, text?: string) {
    this.t = 0;
    this.good = success;
    this.text = text ?? (success ? "Goal reached! \u{1F389}" : "Not quite. Adjust and try again");
    this.bits = [];
    if (success && !reduceMotion) {
      for (let i = 0; i < 160; i++) {
        this.bits.push({
          x: this.rnd(),
          y: -0.05 - this.rnd() * 0.35,
          vx: (this.rnd() - 0.5) * 0.25,
          vy: 0.15 + this.rnd() * 0.25,
          rot: this.rnd() * 6,
          vr: (this.rnd() - 0.5) * 12,
          w: 6 + this.rnd() * 6,
          color: COLORS[i % COLORS.length],
          life: 0,
        });
      }
    }
  }

  clear() {
    this.t = -1;
    this.bits = [];
  }

  /** Call every frame after the scene; dt in real seconds. */
  draw(r: Renderer, dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    const c = r.ctx;
    // confetti: positions in fractions of the canvas so it works at any size
    for (const b of this.bits) {
      b.life += dt;
      b.vy += 0.35 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt;
    }
    this.bits = this.bits.filter((b) => b.y < 1.1 && b.life < 6);
    for (const b of this.bits) {
      c.save();
      c.translate(b.x * r.w, b.y * r.h);
      c.rotate(b.rot);
      c.scale(1, Math.cos(b.rot * 1.7));
      c.fillStyle = b.color;
      c.fillRect(-b.w / 2, -b.w / 4, b.w, b.w / 2);
      c.restore();
    }
    // banner: pops in, holds, then fades so it doesn't hide the scene
    const fade = this.t < 3.2 ? 1 : Math.max(0, 1 - (this.t - 3.2) / 0.6);
    if (fade <= 0) return;
    const k = Math.min(1, this.t / 0.35);
    const s = reduceMotion ? 1 : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    const narrow = r.w < 600;
    const X = r.w / 2;
    const Y = narrow ? 10 + r.hudLines * 23 + 20 : Math.max(34, Math.min(70, r.h * 0.12));
    c.save();
    c.globalAlpha = fade;
    c.translate(X, Y);
    c.scale(s, s);
    const fs = Math.max(15, Math.min(24, r.w * 0.022));
    c.font = `800 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    const w = Math.min(r.w - 24, c.measureText(this.text).width + 40);
    const h = fs * 1.9;
    c.shadowColor = "rgba(15,23,42,0.25)";
    c.shadowBlur = 18;
    c.shadowOffsetY = 6;
    c.fillStyle = this.good ? "#10b981" : "#f97316";
    roundRectPath(c, -w / 2, -h / 2, w, h, h / 2);
    c.fill();
    c.shadowColor = "transparent";
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(this.text, 0, 1, w - 20);
    c.restore();
  }
}
