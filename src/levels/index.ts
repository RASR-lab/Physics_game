import type { Chapter, Level } from "./types";
import { chapter2 } from "./ch2-kinematics";
import { chapter3 } from "./ch3-vectors";
import { chapter5 } from "./ch5-newton";
import { chapter6 } from "./ch6-applications";

/** Chapter numbers follow the PHYS 211 equation sheet. */
export const CHAPTERS: Chapter[] = [
  {
    number: 2,
    title: "Kinematics",
    world: "Motion Valley",
    blurb: "Position, velocity, acceleration, free fall",
    color: "#D55E00",
    levels: chapter2,
  },
  {
    number: 3,
    title: "Vectors",
    world: "Vector Canyon",
    blurb: "Components, adding vectors, projectiles",
    color: "#0072B2",
    levels: chapter3,
  },
  {
    number: 5,
    title: "Newton's Laws",
    world: "Newton Station",
    blurb: "Inertia, F = ma, action–reaction",
    color: "#CC79A7",
    levels: chapter5,
  },
  {
    number: 6,
    title: "Newton's Laws: Applications",
    world: "Friction Peaks",
    blurb: "Friction, springs, circular motion",
    color: "#009E73",
    levels: chapter6,
  },
];

export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels);

export function findLevel(id: string): Level | undefined {
  return ALL_LEVELS.find((l) => l.id === id);
}

export function nextLevel(id: string): Level | undefined {
  const i = ALL_LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? ALL_LEVELS[i + 1] : undefined;
}
