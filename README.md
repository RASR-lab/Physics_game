# Physics Quest (prototype)

A browser game that teaches intro physics to **non-physics majors** through a
**Predict → Play → Explain** loop. Students commit to a prediction, set real
physical quantities (mass, angle, force…), watch an accurate simulation with
force arrows, strobe "ghosts", live graphs and the equation with today's numbers
plugged in, then explain what happened.

This prototype covers **eight chapters of the PHYS 211 equation sheet**, with 40 levels:

| Chapter | World | Levels |
|---|---|---|
| 2 · Kinematics | Motion Valley | Stop at the Line · The Two-Second Drop · Match the Graph · Catch the Bus · Toss to the Window |
| 3 · Vectors | Vector Canyon | Drone Delivery · River Crossing · Canyon Supply Drop · Hiking Detour · Off the Table |
| 5 · Newton's Laws | Newton Station | Coasting in Space · Elevator Scale · Skater Push-Off · Coupling Strength · Pulley Drop |
| 6 · Newton's Laws: Applications | Friction Peaks | Will It Slide? · Spring Scale · Take the Curve · Steady Push · Banked Curve |
| 10 · Rotational Kinematics | Spin City | Pottery Wheel · Carousel Riders · Rolling Race · Bike Gears · Centrifuge |
| 11 · Rotational Dynamics & Equilibrium | Torque Tower | Seesaw Balance · Rusty Bolt · Skater Spin · Swinging Door · Well Bucket |
| 12 · Gravity | Orbit Outpost | Half Weight · Into Orbit · Tug of War in Space · Sky Tracker · Moon Hop |
| 13 · Oscillations | Pendulum Park | Grandfather Clock · Smooth Ride · Match the Wave · Photogate Speed · Weigh an Astronaut |

**Every play is a new problem.** Each time a level opens, the numbers in the story (speeds,
distances, masses, targets…) move by up to ±20%, and the Predict and Explain answer options are
shuffled. Hints, worked answers, graphs and success checks are all recomputed from the new
numbers. "🎲 New numbers" and "Play again" deal a fresh version. The guided tutorials always use
the textbook numbers so their scripted walkthrough stays accurate.

Each world opens with a **guided tutorial** (🎓 on the map, or `#tutorial-2`, `-3`, `-5`, `-6`, `-10`, `-11`, `-12`, `-13`).
It runs inside the chapter's first level. A spotlight walks through the screen and the
Predict → Play → Explain loop, then plays a deliberately wrong demo attempt to show
how to reason from a miss. Each step has a "What to think about" box written for that
chapter (components for vectors, free-body diagrams for Newton's laws, and so on). The
tutorial ends with a checklist of questions to ask in every level of that chapter.

Each level targets a classic misconception: heavier objects fall faster, motion
needs a force, a bigger mass pushes harder, a centrifugal force flings you outward,
everyone on a carousel moves at the same speed, there's no gravity in orbit, a
heavier pendulum swings faster.
Each level has 3 progressive hints and awards up to 3 stars (goal reached,
correct prediction, correct explanation). It also unlocks an entry in the
**Physics Journal** for exam review.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # physics accuracy + every level is solvable
npm run build      # static site in dist/
```

No accounts or server. Progress is stored in the browser (`localStorage`).

## How it's built

- **TypeScript + Vite**, plain Canvas 2D rendering, HTML overlay for controls (keyboard and screen-reader friendly), **KaTeX** for equations, **Vitest** for tests.
- `src/physics/`: a small, transparent physics core in SI units. Velocity-Verlet integration at a fixed 240 Hz step (deterministic, exact for constant forces, energy-stable for springs). Forces are pluggable objects that draw their own labeled arrows.
- `src/physics/analytic.ts`: exact textbook solutions used by hints and tests.
- `src/levels/`: one file per chapter. Each level is data (hook, goal, controls, prediction and explanation questions, hints, journal entry), plus a `create()` that returns the simulation for one attempt.
- `src/render/`: world-to-screen renderer (arrows, rulers, cars…) and the live graph.
- `src/ui/`: world map, level screen (the POE loop), journal, and the spotlight tour engine (`tour.ts`).
- `src/tutorials/`: per-chapter tutorial scripts (what to say, what to demo, what to think).

Phaser was skipped for this prototype. Every scene is a single 2D diagram, so plain Canvas kept the bundle small. It can be added later if levels need sprites, tweens or audio.

### Tests (`tests/`)

- Projectile range matches `v²·sin(2θ)/g` within 0.5%; free-fall time matches `√(2h/g)`.
- Spring energy stays within 0.5% over 60 simulated seconds; momentum is conserved in a push-off.
- Rolling, torque, gravity and oscillation formulas match the equation sheet; a 400 km orbit keeps its radius within 0.1% and its energy within 0.01% at the in-game time-lapse step; a spring's measured period matches 2π√(m/k) within 0.1%.
- Every tutorial spotlights only real screen elements, and its demo attempt really fails (so "learn from the miss" is true).
- **Every level, in 31 versions** (the textbook numbers plus 30 random seeds), succeeds with its reference solution, fails with a known wrong answer and with the default slider values, keeps every answer on its slider's grid, and has no duplicate or broken (NaN) text after shuffling.

### Design notes

- Colorblind-safe Okabe–Ito palette, applied the same way everywhere: gravity is blue, normal force green, friction orange, applied force purple, velocity vermillion. Every arrow also carries a text label.
- Slow-motion, pause, and toggles for force/velocity arrows and trails.
- Large touch targets. On narrow screens the panel stacks above the stage.

## Adding a level

Levels are recipes: `defineLevel((v) => ({ ...Level }))` in a chapter file (see `src/levels/util.ts`).
Draw every story number from `v`, e.g. `const V0 = v.num(20, 0)` (20 ± 20%, whole numbers), and
compute the `solution`, `wrong` answer, hints and goal from those numbers (`snap()` puts an answer
on a slider's grid). `Vary.fixed()` returns the textbook values. The test suite then checks
automatically, across many random versions, that the level is solvable and not trivially won.

## Next steps (from the project plan)

Playtest with 10–20 non-physics students. Add Chapters 7–9 (energy, momentum) and 14–17 (waves, fluids, heat). Add
instructor mode (class-wide prediction data) and a sandbox. Add an LMS embed.
