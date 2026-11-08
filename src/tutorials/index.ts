/**
 * Guided tutorials: one per chapter, played inside that chapter's first level.
 * Kept deliberately short: 8 steps, one line each, at most 3 tiny bullets.
 * The demo attempt is deliberately wrong, to show how to learn from a miss.
 */
import type { LevelAPI } from "../ui/level";

export interface TourStep {
  /** data-tour target to spotlight; omit for a centered card. */
  target?: string;
  title: string;
  body: string;
  /** Short "think about" bullets. */
  think?: string[];
  /** Runs once when the step is first shown (e.g. set sliders, launch). */
  do?: (api: LevelAPI) => void;
  /** Runs when the student presses Next on this step. */
  onNext?: (api: LevelAPI) => void;
  /** Next stays disabled until this returns true. */
  waitFor?: (api: LevelAPI) => boolean;
  waitText?: string;
}

export interface Tutorial {
  chapter: number;
  levelId: string;
  title: string;
  /** Slider values used in the demo attempt. Tests check they really fail. */
  demo: Record<string, number>;
  steps: TourStep[];
}

/** Every data-tour target the level screen provides (tests check steps use only these). */
export const TOUR_TARGETS = ["hook", "predict", "equation", "controls", "stage", "outcome", "datarow", "hints", "explain"];

interface Spec {
  chapter: number;
  levelId: string;
  world: string;
  bigIdea: string;
  ideas: string[];
  know: string;
  change: string;
  win: string;
  /** How to choose an equation from the sheet in this chapter. */
  eqThink: string[];
  demo: Record<string, number>;
  demoText: string;
  watch: string;
  fix: string[];
  graph: string;
  checklist: string[];
}

function makeTutorial(s: Spec): Tutorial {
  return {
    chapter: s.chapter,
    levelId: s.levelId,
    title: `${s.world} tutorial`,
    demo: s.demo,
    steps: [
      { title: `🎓 ${s.world}`, body: s.bigIdea, think: s.ideas },
      {
        target: "hook",
        title: "Read the goal",
        body: "Find three things:",
        think: [`Know: ${s.know}`, `Change: ${s.change}`, `Win: ${s.win}`],
      },
      {
        target: "predict",
        title: "Guess first",
        body: "Pick one. Wrong guesses are fine. They teach the most.",
        waitFor: (api) => api.prediction() >= 0 || api.phase() !== "predict",
        waitText: "Pick an answer.",
        onNext: (api) => api.lockPrediction(),
      },
      {
        target: "equation",
        title: "Pick the equation",
        body: "Four equations from your sheet. Which one fits? Pick, then Check.",
        think: s.eqThink,
        waitFor: (api) => api.equationAnswer() >= 0 || (api.phase() !== "predict" && api.phase() !== "equation"),
        waitText: "Pick one and press Check.",
      },
      {
        target: "stage",
        title: "Try it",
        body: `We set ${s.demoText} and launched. Watch!`,
        think: [s.watch],
        do: (api) => {
          Object.entries(s.demo).forEach(([k, v]) => api.setParam(k, v));
          api.launch();
        },
        waitFor: (api) => !api.isRunning() && api.lastOutcome() !== null,
        waitText: "Running…",
      },
      {
        target: "outcome",
        title: "Missed? Good.",
        body: "Ask why before you change anything.",
        think: s.fix,
      },
      {
        target: "datarow",
        title: "Check the numbers",
        body: s.graph,
      },
      {
        title: "Your turn!",
        body: "Stuck? Tap 💡. Win, then explain, for ⭐⭐⭐. Every level, ask:",
        think: s.checklist,
      },
    ],
  };
}

const ch2 = makeTutorial({
  chapter: 2,
  levelId: "2-1",
  world: "Motion Valley",
  bigIdea: "Motion = position, velocity, acceleration.",
  ideas: ["Speeding up, slowing down, or steady?", "Which way is +?"],
  know: "20 m/s, 40 m to the line",
  change: "how hard you brake",
  win: "stop just before the line",
  eqThink: ["List what you know and what you need.", "No time given? Use the one without t: v² = v₀² + 2aΔx."],
  demo: { decel: 4.5 },
  demoText: "braking to 4.5 m/s²",
  watch: "Dots get closer → the car is slowing.",
  fix: ["Too far → brake harder.", "Better: solve v² = v₀² + 2aΔx."],
  graph: "Slope of the v–t graph = acceleration.",
  checklist: ["Which way is +?", "What do I know? What do I need?", "Which equation links them?"],
});

const ch3 = makeTutorial({
  chapter: 3,
  levelId: "3-1",
  world: "Vector Canyon",
  bigIdea: "Split every vector into x and y.",
  ideas: ["Vector = long side of a right triangle.", "Solve x and y separately."],
  know: "target is (30, 40)",
  change: "distance and angle",
  win: "land on the pad",
  eqThink: ["Have components? → length and angle.", "Have length and angle? → components."],
  demo: { dist: 40, angle: 45 },
  demoText: "40 m at 45°",
  watch: "Pink = east part. Blue = north part.",
  fix: ["x ≈ 28 (close). y ≈ 28 (short).", "Steeper and farther. Compute it!"],
  graph: "x and y grow separately. They're independent.",
  checklist: ["Angle measured from x?", "What are the x and y parts?", "Solve each, then combine."],
});

const ch5 = makeTutorial({
  chapter: 5,
  levelId: "5-1",
  world: "Newton Station",
  bigIdea: "Forces change motion. They don't keep it going.",
  ideas: ["Add all forces → ΣF.", "ΣF = ma sets acceleration."],
  know: "200 kg, 4 s push, 100 m",
  change: "thrust force",
  win: "arrive at 19–21 s",
  eqThink: ["Forces change motion: ΣF = ma.", "Weight = mg is only the whole story if nothing accelerates."],
  demo: { thrust: 500 },
  demoText: "thrust to 500 N",
  watch: "Thrust stops at 4 s. Does the crate slow down?",
  fix: ["Too early → less thrust.", "Split it: push, then coast."],
  graph: "Ramp, then flat: force on, then force off.",
  checklist: ["What forces act?", "Add them: ΣF.", "a = ΣF / m."],
});

const ch6 = makeTutorial({
  chapter: 6,
  levelId: "6-1",
  world: "Friction Peaks",
  bigIdea: "Real forces follow rules: friction, springs, circles.",
  ideas: ["Static friction adjusts, up to μs·N.", "Circles need a force to the center."],
  know: "μs = 0.45",
  change: "ramp angle",
  win: "steepest angle that holds",
  eqThink: ["Not sliding yet → f_s ≤ μs·N. Sliding → f_k = μk·N.", "Going in a circle → f_c = mv²/r."],
  demo: { angle: 30, mass: 10 },
  demoText: "the ramp to 30°",
  watch: "Downhill pull vs. friction: who wins?",
  fix: ["Slid → lower the angle.", "Compare “pull” with “max friction” in the data."],
  graph: "The data updates as you move the slider.",
  checklist: ["Which forces act?", "Sliding or not?", "Needed vs. available?"],
});

const ch10 = makeTutorial({
  chapter: 10,
  levelId: "10-1",
  world: "Spin City",
  bigIdea: "Spinning uses Chapter 2's equations with new letters.",
  ideas: ["θ ↔ x, ω ↔ v, α ↔ a.", "Work in radians: 1 turn = 2π rad."],
  know: "starts at 6.0 rad/s",
  change: "braking α",
  win: "stop after exactly 3 turns",
  eqThink: ["Same as Ch 2 with θ, ω, α.", "No time given? ω² = ω₀² + 2αΔθ."],
  demo: { alpha: 0.5 },
  demoText: "braking α to 0.5 rad/s²",
  watch: "The orange arc counts the angle turned. Does ω drop steadily?",
  fix: ["Too many turns → brake harder.", "Better: solve ω² = ω₀² + 2αΔθ with Δθ = 3·2π."],
  graph: "The ω–t graph is a straight line. Its slope is −α.",
  checklist: ["Radians, not turns or degrees?", "Which Ch 2 equation has the same shape?", "Need v at the rim? Use v = rω."],
});

const ch11 = makeTutorial({
  chapter: 11,
  levelId: "11-1",
  world: "Torque Tower",
  bigIdea: "Torque = force × lever arm. It decides whether things turn.",
  ideas: ["Same force, farther out → more twist.", "Balanced: torques ↺ = torques ↻."],
  know: "30 kg kid at 2.0 m, 75 kg parent",
  change: "where the parent sits",
  win: "the plank stays level",
  eqThink: ["Balanced → the torques cancel (τ = rF).", "Spinning up → Στ = Iα. No outside torque → L stays the same."],
  demo: { d: 2 },
  demoText: "the parent at 2.0 m, same as the kid",
  watch: "Equal distances, unequal weights. Which way does it tip?",
  fix: ["Parent's side fell → move them closer in.", "Better: set m₁gr₁ = m₂gr₂ and solve for r₂."],
  graph: "Compare the two torques in the data. Their difference is the net torque.",
  checklist: ["Where is the pivot?", "Lever arm for each force?", "Στ = 0 (balance) or Στ = Iα (turning)?"],
});

const ch12 = makeTutorial({
  chapter: 12,
  levelId: "12-1",
  world: "Orbit Outpost",
  bigIdea: "Gravity weakens with distance squared, but never switches off.",
  ideas: ["Measure r from the planet's center.", "2× the distance → ¼ the pull."],
  know: "R = 6371 km, g = 9.81 m/s² on the ground",
  change: "elevator height",
  win: "gravity is exactly half",
  eqThink: ["Gravity weakens as 1/r².", "Measure r from the planet's center."],
  demo: { h: 1300 },
  demoText: "the elevator to 1300 km",
  watch: "Is the weight arrow shorter than the ground one? By how much?",
  fix: ["Still too strong → go higher.", "Better: solve (R/r)² = ½ for r, then h = r − R."],
  graph: "Steeper drop curve = stronger gravity. Compare it with the dashed target.",
  checklist: ["r from the center, not the surface?", "Square the distance!", "Does the small mass cancel out?"],
});

const ch13 = makeTutorial({
  chapter: 13,
  levelId: "13-1",
  world: "Pendulum Park",
  bigIdea: "Things that spring back repeat with a steady period.",
  ideas: ["Period T = time for one full cycle.", "f = 1/T. What sets T?"],
  know: "need T = 2.00 s",
  change: "pendulum length",
  win: "the period is 2.00 s",
  eqThink: ["Pendulum → L and g. Spring → m and k.", "Check which letters the problem actually gives you."],
  demo: { L: 0.5, mass: 2 },
  demoText: "the rod to 0.5 m",
  watch: "Count the swings. Faster or slower than the dashed target?",
  fix: ["Swings too fast → make it longer.", "Better: solve T = 2π√(L/g) for L."],
  graph: "Waves lining up with the dashed curve = same period.",
  checklist: ["What sets the period (and what doesn't)?", "Pendulum: L and g. Spring: m and k.", "Square both sides to undo the √."],
});

export const TUTORIALS: Record<number, Tutorial> = { 2: ch2, 3: ch3, 5: ch5, 6: ch6, 10: ch10, 11: ch11, 12: ch12, 13: ch13 };
