import type { Renderer, View } from "../render/renderer";

export interface ControlDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
}

export interface MCQ {
  prompt: string;
  options: string[];
  correct: number;
  /** Shown after answering — explains why the correct answer is right. */
  why: string;
}

export interface Outcome {
  success: boolean;
  /** Plain-language description of what happened (also read by screen readers). */
  message: string;
}

export interface Overlays {
  forces: boolean;
  velocity: boolean;
  trail: boolean;
}

export interface Readout {
  label: string;
  value: string;
}

export interface GraphDef {
  title: string;
  yLabel: string;
  tMax: number;
  yMin: number;
  yMax: number;
  series: { label: string; color: string }[];
  target?: (t: number) => number;
  targetLabel?: string;
}

/** A running simulation for one attempt. Pure physics in step(); drawing is separate. */
export interface Sim {
  t: number;
  step(dt: number): void;
  isDone(): boolean;
  outcome(): Outcome;
  draw(r: Renderer, ov: Overlays): void;
  /** Live numbers for the data panel. */
  readouts(): Readout[];
  /** Governing equation with the current numbers plugged in (KaTeX). */
  equation(): string;
  /** Values for the live graph, in the same order as GraphDef.series. */
  sample?(): number[];
  /** Optional short text for the win/fail banner (defaults to a generic message). */
  banner?(o: Outcome): string;
  /** Optional moving camera; otherwise Level.view is used. */
  view?(): View;
}

export interface Level {
  id: string;
  chapter: number;
  title: string;
  /** Real-world scenario. */
  hook: string;
  /** What counts as success. */
  goal: string;
  controls: ControlDef[];
  predict: MCQ;
  explain: MCQ;
  /**
   * "Pick the equation": options are ids into EQUATIONS (from the PHYS 211 sheet).
   * Filled in by defineLevel from PICK_EQUATION, so level files don't set it.
   */
  pickEq?: MCQ;
  /** Progressive hints: nudge → concept → worked step. */
  hints: string[];
  journal: { title: string; tex: string; note: string };
  view: View;
  graph?: GraphDef;
  /** A known-good set of inputs (used by tests and to verify each level is solvable). */
  solution: Record<string, number>;
  /** A known-bad set of inputs (tests verify it fails). */
  wrong: Record<string, number>;
  create(params: Record<string, number>): Sim;
}

/**
 * A level recipe. make() builds one playable version: numbers in the story move by up to ±20%
 * and the answer options are shuffled. Vary.fixed() gives the textbook version (used by tutorials).
 */
export interface LevelDef {
  id: string;
  chapter: number;
  title: string;
  journal: { title: string; tex: string; note: string };
  make(v: import("./util").Vary): Level;
}

export interface Chapter {
  number: number;
  title: string;
  world: string;
  blurb: string;
  color: string;
  levels: LevelDef[];
}
