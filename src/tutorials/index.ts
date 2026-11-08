/**
 * Guided tutorials: one per chapter, played inside that chapter's first level.
 * Each tutorial shows HOW to play (the screen, the Predict → Play → Explain loop)
 * and WHAT TO THINK (the chapter's way of reasoning), using a deliberately wrong
 * demo attempt so students see how to learn from a miss.
 */
import type { LevelAPI } from "../ui/level";

export interface TourStep {
  /** data-tour target to spotlight; omit for a centered card. */
  target?: string;
  title: string;
  body: string;
  /** "What to think about" bullets. */
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
  chapterTitle: string;
  levelTitle: string;
  intro: string;
  bigIdea: { title: string; body: string; think: string[] };
  hookThink: string[];
  predictThink: string[];
  demo: Record<string, number>;
  demoText: string;
  controlsThink: string[];
  watchThink: string[];
  outcomeThink: string[];
  dataThink: string[];
  checklist: string[];
}

function makeTutorial(s: Spec): Tutorial {
  return {
    chapter: s.chapter,
    levelId: s.levelId,
    title: `${s.world} tutorial`,
    demo: s.demo,
    steps: [
      {
        title: `Welcome to ${s.world}!`,
        body: `${s.intro} Every level follows the same three steps: Predict, Play, Explain. Each step can earn a star. This tutorial walks you through the first level, “${s.levelTitle}”, and then hands it over to you.`,
      },
      { title: s.bigIdea.title, body: s.bigIdea.body, think: s.bigIdea.think },
      {
        target: "hook",
        title: "1 · Read the situation",
        body: "Every level starts with a real-world story and a goal. Before you touch anything, pull the physics out of the story: what you're given, what you control, and what success looks like as a number.",
        think: s.hookThink,
      },
      {
        target: "predict",
        title: "2 · Predict before you play",
        body: "Commit to a guess before running anything. A wrong guess costs you nothing; the prediction star is a bonus. A guess that turns out wrong is actually the most useful thing in this game, because it shows you exactly which intuition needs fixing. Pick an answer now.",
        think: s.predictThink,
        waitFor: (api) => api.prediction() >= 0 || api.phase() !== "predict",
        waitText: "Pick an answer to continue.",
        onNext: (api) => api.lockPrediction(),
      },
      {
        target: "controls",
        title: "3 · Set the physical quantities",
        body: `Each slider is a real physical quantity with units. You can also type an exact value in the box. For this demo we've set ${s.demoText}. That's a deliberate guess, not the answer, so you can see how to learn from a miss.`,
        think: s.controlsThink,
        do: (api) => Object.entries(s.demo).forEach(([k, v]) => api.setParam(k, v)),
      },
      {
        target: "stage",
        title: "4 · Read the simulation",
        body: "This is the experiment. Every arrow has a label and a color. Blue is gravity, green the normal force, orange friction, purple an applied force, and vermillion velocity. A longer arrow means a bigger quantity. Faint “ghost” dots are dropped at equal time intervals, so their spacing shows how speed changes.",
        think: [
          "Notice which arrows change size and which stay the same.",
          "Equal time between ghosts: wider gaps mean faster motion.",
        ],
      },
      {
        target: "stage",
        title: "5 · Launch and watch",
        body: "The ▶ Launch button runs the experiment with your values. Under the scene you can Pause, Reset or switch on Slow-mo at any time, and the checkboxes show or hide arrows and trails. We've launched the demo for you. Watch closely.",
        think: s.watchThink,
        do: (api) => api.launch(),
        waitFor: (api) => !api.isRunning() && api.lastOutcome() !== null,
        waitText: "Simulation running… watch the scene.",
      },
      {
        target: "outcome",
        title: "6 · Learn from the result",
        body: "The demo missed, on purpose. A miss tells you which way to go. Read the message and work out why before you move a slider. Changing a value at random teaches you nothing; changing it for a reason does.",
        think: s.outcomeThink,
      },
      {
        target: "datarow",
        title: "7 · Check the numbers",
        body: "The live graph and readouts show exactly what happened. Under “The physics, right now” is the chapter's equation with the current numbers filled in. It's the same math the simulation runs.",
        think: s.dataThink,
      },
      {
        target: "predict",
        title: "8 · Check your prediction",
        body: "After your first run, your prediction is revealed with an explanation. Guessed wrong? That's fine. It's the exact idea this level is built to fix. Connect the explanation to what you just watched.",
      },
      {
        target: "hints",
        title: "9 · Use hints wisely",
        body: "Hints build up in three steps: a nudge, then the key concept, then a worked step. Use as few as you can, but a hint is always better than guessing at random.",
      },
      {
        target: "explain",
        title: "10 · Explain it",
        body: "Once you reach the goal, a “why” question unlocks. Answer it in your head first, then pick an option. Every finished level adds its key equation to your Physics Journal for exam review.",
      },
      {
        title: "Your turn!",
        body: `Now finish “${s.levelTitle}” yourself. Your prediction and the demo run are still here to build on. Ask yourself these questions in every ${s.chapterTitle} level:`,
        think: s.checklist,
      },
    ],
  };
}

const ch2 = makeTutorial({
  chapter: 2,
  levelId: "2-1",
  world: "Motion Valley",
  chapterTitle: "Kinematics",
  levelTitle: "Stop at the Line",
  intro: "Here you'll describe how things move: where they are (position x), how fast and which way they're going (velocity v), and how quickly that velocity changes (acceleration a). No forces yet. Just careful watching and a few equations.",
  bigIdea: {
    title: "How to think about motion",
    body: "Kinematics links three quantities. Velocity is how fast position changes. Acceleration is how fast velocity changes. Most problems give you some of these and ask for another.",
    think: [
      "Is the object speeding up, slowing down, or holding a steady speed?",
      "Which direction counts as positive? A negative velocity or acceleration just means “the other way.”",
      "Which quantities do I know (x₀, v₀, v, a, t), and which one am I solving for?",
    ],
  },
  hookThink: [
    "Given: starting speed v₀ = 20 m/s, distance to the line = 40 m, final speed v = 0.",
    "You control: the braking deceleration a.",
    "Success in numbers: stop between 38.5 m and 40 m.",
  ],
  predictThink: ["Go with your gut first, then try to justify it.", "Picture an extreme case: braking from highway speed versus parking-lot speed."],
  demo: { decel: 4.5 },
  demoText: "the braking deceleration to 4.5 m/s²",
  controlsThink: ["Bigger deceleration means stronger braking.", "Change one thing at a time so you know what caused the difference."],
  watchThink: [
    "The ghost dots under the car are dropped every 0.5 s. Do the gaps grow or shrink?",
    "The braking arrow stays the same size while the velocity arrow shrinks: a constant force gives a constant deceleration.",
  ],
  outcomeThink: [
    "Did the car stop too early or too late? That tells you which way to move the slider.",
    "Stopping too far means the brakes were too gentle, so increase a.",
    "Better than guessing: put the goal into v² = v₀² + 2aΔx and solve for a.",
  ],
  dataThink: [
    "On a v–t graph, the slope is the acceleration. A straight line sloping down means steady braking.",
    "Pause at any moment and check that (v)² = (20)² + 2(−a)(x) holds with the numbers shown.",
  ],
  checklist: [
    "What's moving, and which direction is positive?",
    "What do I know (x₀, v₀, v, a, t), and what am I solving for?",
    "Which equation contains exactly my knowns and my one unknown?",
    "Does my answer make sense? Check its units, sign and size.",
  ],
});

const ch3 = makeTutorial({
  chapter: 3,
  levelId: "3-1",
  world: "Vector Canyon",
  chapterTitle: "Vectors",
  levelTitle: "Drone Delivery",
  intro: "Here quantities have a direction as well as a size: displacement, velocity, acceleration. One trick unlocks this whole chapter: break every vector into an x-part and a y-part, and handle them separately.",
  bigIdea: {
    title: "How to think about vectors",
    body: "A vector is an arrow with a magnitude (length) and a direction. Its components are its “shadows” on the x- and y-axes.",
    think: [
      "Draw the vector as the long side of a right triangle. Its components are the two short sides.",
      "dₓ = d cos θ and d_y = d sin θ work only when θ is measured from the x-axis.",
      "x and y don't affect each other. Solve them as two separate one-dimensional problems.",
    ],
  },
  hookThink: [
    "Given: the rooftop is 30 m east (x) and 40 m north (y) of the launch pad.",
    "You control: the vector's size |d| and its direction θ.",
    "Success in numbers: land within 1.5 m of the point (30, 40).",
  ],
  predictThink: ["Sketch it: 30 across and 40 up. Is the straight-line path longer or shorter than 30 + 40?"],
  demo: { dist: 40, angle: 45 },
  demoText: "a 40 m flight at 45°",
  controlsThink: [
    "Together the two sliders describe one vector: a magnitude and an angle.",
    "Changing θ trades east for north. Changing |d| scales both components together.",
  ],
  watchThink: [
    "The pink line is dₓ (east) and the blue line is d_y (north). Both grow as the drone flies.",
    "Compare each component with the target on its own: x against 30, y against 40.",
  ],
  outcomeThink: [
    "The drone ended near x ≈ 28 m (close to 30) but y ≈ 28 m (well short of 40).",
    "Only y is short, so the path needs a steeper angle and a longer distance overall.",
    "Don't guess a second time. Compute it: |d| = √(dₓ² + d_y²) and θ = tan⁻¹(d_y / dₓ).",
  ],
  dataThink: [
    "The graph shows x(t) and y(t) as two separate straight lines: the motions are independent.",
    "The equation panel shows exactly how each component comes from |d| and θ.",
  ],
  checklist: [
    "Have I set up x and y axes, and am I measuring angles from the x-axis?",
    "What are the x and y components of every vector?",
    "Solve x and y separately, and only combine them at the end.",
    "Recombine with Pythagoras and tan⁻¹, then sanity-check the direction.",
  ],
});

const ch5 = makeTutorial({
  chapter: 5,
  levelId: "5-1",
  world: "Newton Station",
  chapterTitle: "Newton's Laws",
  levelTitle: "Coasting in Space",
  intro: "Newton Station is about why motion changes. Forces don't keep things moving. They change how things move.",
  bigIdea: {
    title: "How to think about forces",
    body: "Every level here comes down to three moves: find the forces, add them up, and use ΣF = ma to get the acceleration.",
    think: [
      "List every force: gravity, plus anything touching the object.",
      "Add them, paying attention to direction, to get the net force ΣF.",
      "ΣF sets the acceleration (a = ΣF / m), not the velocity. Zero net force means constant velocity, which isn't necessarily “stopped.”",
    ],
  },
  hookThink: [
    "Given: m = 200 kg, the thrust lasts 4 s, the distance is 100 m, and there's no friction.",
    "You control: the thrust force F.",
    "Success in numbers: arrive between 19 s and 21 s after launch.",
  ],
  predictThink: ["On Earth, sliding things stop. What makes them stop? Is that thing present in space?"],
  demo: { thrust: 500 },
  demoText: "the thrust to 500 N",
  controlsThink: ["Force gives acceleration: a = F/m. Double F and you double a.", "The force only acts for 4 s. What happens after that is up to Newton's 1st law."],
  watchThink: [
    "The purple thrust arrow disappears at 4 s. Does the velocity arrow shrink after that?",
    "The ghosts are 1 s apart. Their spacing grows during the burn, then stays even while coasting.",
  ],
  outcomeThink: [
    "The crate arrived too early because it was going too fast, so it needs less acceleration during the burn and therefore less thrust.",
    "Split the trip into two parts: a 4-second push, then coasting at constant velocity. Write the time for each part.",
  ],
  dataThink: [
    "The v–t graph is a ramp (accelerating) followed by a flat line (no net force).",
    "When the engine cuts off, the equation switches from a = F/m to ΣF = 0, so v is constant.",
  ],
  checklist: [
    "Which object am I analyzing? Draw it on its own (a free-body diagram).",
    "Which forces act on it, and which way does each one point?",
    "What's the net force along each axis?",
    "Use ΣF = ma for the acceleration, then the Chapter 2 equations for the motion.",
  ],
});

const ch6 = makeTutorial({
  chapter: 6,
  levelId: "6-1",
  world: "Friction Peaks",
  chapterTitle: "Newton's Laws: Applications",
  levelTitle: "Will It Slide?",
  intro: "Friction Peaks applies Newton's laws to real situations: friction, springs, and motion in a circle. The forces are specific now, and some of them adjust themselves.",
  bigIdea: {
    title: "How to think about real forces",
    body: "Same method as before: find the forces, add them, then ΣF = ma. Now each force has its own rule.",
    think: [
      "Static friction isn't a fixed number. It grows to match whatever is trying to make the object slide, up to a maximum of μs·N.",
      "A spring's force grows with its stretch: F = kΔx.",
      "Moving in a circle needs a net force toward the center (mv²/r). Ask which real force supplies it.",
    ],
  },
  hookThink: [
    "Given: μs = 0.45 and μk = 0.30 for wood on wood.",
    "You control: the ramp angle θ and the crate's mass.",
    "Success in numbers: the steepest angle (at least 23°) where the crate still doesn't slide.",
  ],
  predictThink: ["A heavier crate is pulled down the ramp harder, but it also presses into the ramp harder. Which effect wins?"],
  demo: { angle: 30, mass: 10 },
  demoText: "the ramp angle to 30° with a 10 kg crate",
  controlsThink: [
    "Tilting splits gravity into a downhill part (mg sin θ) and an into-the-ramp part (mg cos θ).",
    "Treat the mass slider as an experiment. Change it later and see whether the result changes.",
  ],
  watchThink: [
    "Compare the orange friction arrow with the downhill pull. While the crate holds, they balance exactly.",
    "Once the crate slips, friction drops to kinetic friction (μk·N) and the crate speeds up.",
  ],
  outcomeThink: [
    "It slid, so the downhill pull beat the maximum static friction. Lower the angle.",
    "The readouts put “needed” next to “available.” Aim for needed just below available.",
    "Try a different mass. Does the slipping angle move?",
  ],
  dataThink: [
    "Watch “Downhill pull” and “Max static friction” change as you move the angle slider, even before you launch.",
    "The equation panel compares mg sin θ with μs mg cos θ using the real numbers.",
  ],
  checklist: [
    "Which forces act: gravity, normal, friction, a spring, tension?",
    "Is the friction static (no sliding, f ≤ μs N) or kinetic (sliding, f = μk N)?",
    "On a tilted surface, use axes along and perpendicular to the surface.",
    "In circular motion, which force points toward the center, and can it reach mv²/r?",
  ],
});

export const TUTORIALS: Record<number, Tutorial> = { 2: ch2, 3: ch3, 5: ch5, 6: ch6 };
