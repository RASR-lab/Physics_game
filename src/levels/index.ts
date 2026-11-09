import type { Chapter, LevelDef } from "./types";
import { chapter2 } from "./ch2-kinematics";
import { chapter3 } from "./ch3-vectors";
import { chapter5 } from "./ch5-newton";
import { chapter6 } from "./ch6-applications";
import { chapter10 } from "./ch10-rotation";
import { chapter11 } from "./ch11-torque";
import { chapter12 } from "./ch12-gravity";
import { chapter13 } from "./ch13-oscillations";

/** Chapter numbers follow the PHYS 211 equation sheet. */
export const CHAPTERS: Chapter[] = [
  {
    number: 2,
    title: "Kinematics",
    world: "Motion Valley",
    blurb: "Position, velocity, acceleration, free fall",
    color: "#D55E00",
    levels: chapter2,
    hidden: true,
  },
  {
    number: 3,
    title: "Vectors",
    world: "Vector Canyon",
    blurb: "Components, adding vectors, projectiles",
    color: "#0072B2",
    levels: chapter3,
    hidden: true,
  },
  {
    number: 5,
    title: "Newton's Laws",
    world: "Newton Station",
    blurb: "Inertia, F = ma, action–reaction",
    color: "#CC79A7",
    levels: chapter5,
    hidden: true,
  },
  {
    number: 6,
    title: "Newton's Laws: Applications",
    world: "Friction Peaks",
    blurb: "Friction, springs, circular motion",
    color: "#009E73",
    levels: chapter6,
    hidden: true,
  },
  {
    number: 10,
    title: "Rotational Kinematics",
    world: "Spin City",
    blurb: "Angle, ω and α; v = rω; rolling",
    color: "#B45309",
    levels: chapter10,
  },
  {
    number: 11,
    title: "Rotational Dynamics & Equilibrium",
    world: "Torque Tower",
    blurb: "Torque, balance, angular momentum",
    color: "#7B4FA0",
    levels: chapter11,
  },
  {
    number: 12,
    title: "Gravity",
    world: "Orbit Outpost",
    blurb: "Inverse-square gravity, orbits",
    color: "#1E3A8A",
    levels: chapter12,
  },
  {
    number: 13,
    title: "Oscillations",
    world: "Pendulum Park",
    blurb: "Pendulums, springs, x = A cos ωt",
    color: "#0F766E",
    levels: chapter13,
  },
];

/** Every level, including hidden chapters (used by the tests so hidden content keeps working). */
export const ALL_LEVELS: LevelDef[] = CHAPTERS.flatMap((c) => c.levels);

/** Chapters shown on the webpage. Chapters 2, 3, 5 and 6 are hidden for now (see Chapter.hidden). */
export const VISIBLE_CHAPTERS: Chapter[] = CHAPTERS.filter((c) => !c.hidden);
export const VISIBLE_LEVELS: LevelDef[] = VISIBLE_CHAPTERS.flatMap((c) => c.levels);

export function isChapterVisible(n: number): boolean {
  return VISIBLE_CHAPTERS.some((c) => c.number === n);
}

export function findLevel(id: string): LevelDef | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

/** A level the player is allowed to open (not in a hidden chapter). */
export function findVisibleLevel(id: string): LevelDef | undefined {
  return VISIBLE_LEVELS.find((l) => l.id === id);
}

/** The next level on the map, skipping hidden chapters. */
export function nextLevel(id: string): LevelDef | undefined {
  const i = VISIBLE_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? VISIBLE_LEVELS[i + 1] : undefined;
}
