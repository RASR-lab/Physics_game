/** Immutable 2D vector. Units are whatever the caller uses (always SI in this game). */
export class Vec2 {
  constructor(public readonly x: number, public readonly y: number) {}

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }
  /** Build from magnitude and angle measured from the +x axis (degrees). */
  static fromPolar(mag: number, angleDeg: number): Vec2 {
    const r = (angleDeg * Math.PI) / 180;
    return new Vec2(mag * Math.cos(r), mag * Math.sin(r));
  }

  add(o: Vec2): Vec2 {
    return new Vec2(this.x + o.x, this.y + o.y);
  }
  sub(o: Vec2): Vec2 {
    return new Vec2(this.x - o.x, this.y - o.y);
  }
  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }
  dot(o: Vec2): number {
    return this.x * o.x + this.y * o.y;
  }
  len(): number {
    return Math.hypot(this.x, this.y);
  }
  norm(): Vec2 {
    const l = this.len();
    return l === 0 ? Vec2.zero() : this.scale(1 / l);
  }
  /** Perpendicular vector rotated +90°. */
  perp(): Vec2 {
    return new Vec2(-this.y, this.x);
  }
  /** Angle from +x axis in degrees. */
  angleDeg(): number {
    return (Math.atan2(this.y, this.x) * 180) / Math.PI;
  }
}

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
