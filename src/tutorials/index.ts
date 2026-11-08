/**
 * Guided tutorials: one per chapter, played inside that chapter's first level.
 * Kept deliberately short: 7 steps, one line each, at most 3 tiny bullets.
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
export const TOUR_TARGETS = ["hook", "predict", "controls", "stage", "outcome", "datarow", "hints", "explain"];

interface Spec {
  chapter: number;
  levelId: string;
  world: string;
  bigIdea: string;
  ideas: string[];
  know: string;
  change: string;
  win: string;
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
  demo: { angle: 30, mass: 10 },
  demoText: "the ramp to 30°",
  watch: "Downhill pull vs. friction: who wins?",
  fix: ["Slid → lower the angle.", "Compare “pull” with “max friction” in the data."],
  graph: "The data updates as you move the slider.",
  checklist: ["Which forces act?", "Sliding or not?", "Needed vs. available?"],
});

export const TUTORIALS: Record<number, Tutorial> = { 2: ch2, 3: ch3, 5: ch5, 6: ch6 };
