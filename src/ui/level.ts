import type { Level, LevelDef, MCQ, Outcome, Overlays, Sim } from "../levels/types";
import { Vary } from "../levels/util";
import { CHAPTERS, nextLevel } from "../levels";
import { DT, FixedStepper } from "../physics/core";
import { Renderer } from "../render/renderer";
import { LiveGraph } from "../render/graph";
import { getLevel, recordLevel, tutorialDone } from "../game/progress";
import { EQUATIONS, type EqId, type SheetEquation } from "../levels/equations";
import { TUTORIALS } from "../tutorials";
import { startTour } from "./tour";
import { h, stars, tex, texEl } from "./dom";

type Phase = "predict" | "equation" | "play" | "explain" | "done";

/** Stars per level: goal, prediction, equation, explanation. */
export const MAX_STARS = 4;

/** Remote control used by the guided tutorial to demonstrate the level. */
export interface LevelAPI {
  level: Level;
  phase(): Phase;
  prediction(): number;
  selectPrediction(i: number): void;
  lockPrediction(): void;
  /** Answer the "Pick the equation" step (index into level.pickEq.options). */
  answerEquation(i: number): void;
  equationAnswer(): number;
  setParam(key: string, v: number): void;
  launch(): void;
  isRunning(): boolean;
  lastOutcome(): Outcome | null;
}

export interface LevelOpts {
  /** Run this chapter's guided tutorial (uses the textbook numbers so the script stays accurate). */
  tutorialChapter?: number;
  /** Re-open the level with fresh random numbers. */
  restart?: () => void;
}

/** Mounts a level screen. Returns a cleanup function. Each visit gets new numbers (±20%) and shuffled options. */
export function renderLevel(root: HTMLElement, def: LevelDef, opts: LevelOpts = {}): () => void {
  const level: Level = def.make(opts.tutorialChapter !== undefined ? Vary.fixed() : Vary.random());
  const chapter = CHAPTERS.find((c) => c.number === level.chapter)!;
  const params: Record<string, number> = Object.fromEntries(level.controls.map((c) => [c.key, c.value]));
  const ov: Overlays = { forces: true, velocity: true, trail: true };
  const prev = getLevel(level.id);

  let phase: Phase = "predict";
  let prediction = -1;
  let predictionRevealed = false;
  let explainAnswer = -1;
  let equationAnswer = -1;
  const pickEq = level.pickEq!;
  let attempts = 0;
  let hintsShown = 0;
  let succeeded = false;
  let running = false;
  let paused = false;
  let slow = false;
  let sim: Sim = level.create(params);
  let outcomeShown = true;
  let lastOutcome: Outcome | null = null;
  const setters: Record<string, (v: number) => void> = {};

  /* ---------------- layout ---------------- */
  const canvas = h("canvas.stage", { role: "img", "aria-label": `Simulation: ${level.title}` });
  const graphCanvas = h("canvas.graph", { role: "img", "aria-label": level.graph?.title ?? "graph" });
  const readoutBox = h("dl.readouts");
  const eqBox = h("div.equation", { "aria-live": "off" });
  const outcomeBox = h("div.outcome", { role: "status", "aria-live": "polite", "data-tour": "outcome" });

  const launchBtn = h("button.btn.primary.launch", { onclick: () => launch(), disabled: true }, "▶ Launch");
  const resetBtn = h("button.btn.secondary", { onclick: () => resetSim() }, "↺ Reset");
  const pauseBtn = h("button.btn.secondary", { onclick: () => togglePause(), disabled: true }, "❚❚ Pause");
  const slowBtn = h("button.btn.secondary", { onclick: () => toggleSlow(), "aria-pressed": "false" }, "🐢 Slow-mo");

  const toggles = (["forces", "velocity", "trail"] as const).map((k) => {
    const label = { forces: "Force arrows", velocity: "Velocity arrows", trail: "Trail / ghosts" }[k];
    const cb = h("input", { type: "checkbox", checked: ov[k], onchange: (e: Event) => (ov[k] = (e.target as HTMLInputElement).checked) });
    return h("label.toggle", {}, cb, label);
  });

  const controlsBox = h("div.controls", { "data-tour": "controls" });
  const sliderInputs: HTMLInputElement[] = [];
  for (const c of level.controls) {
    const num = h("input.num", { type: "number", min: c.min, max: c.max, step: c.step, value: c.value, "aria-label": `${c.label} (${c.unit})` });
    const range = h("input.range", { type: "range", min: c.min, max: c.max, step: c.step, value: c.value, "aria-label": c.label });
    const set = (v: number) => {
      if (!Number.isFinite(v)) return;
      v = Math.min(c.max, Math.max(c.min, Math.round((v - c.min) / c.step) * c.step + c.min));
      v = Math.round(v * 1e6) / 1e6;
      params[c.key] = v;
      range.value = String(v);
      num.value = String(v);
      if (!running) preview();
    };
    setters[c.key] = set;
    range.addEventListener("input", () => set(parseFloat(range.value)));
    num.addEventListener("change", () => set(parseFloat(num.value)));
    sliderInputs.push(range, num);
    controlsBox.append(h("div.control", {}, h("label", {}, c.label), h("div.control-row", {}, range, num, h("span.unit", {}, c.unit))));
  }

  const predictBox = h("section.step", { "data-tour": "predict" });
  const equationBox = h("section.step", { "data-tour": "equation" });
  const playBox = h("section.step", { "data-tour": "play" });
  const explainBox = h("section.step", { "data-tour": "explain" });
  const doneBox = h("section.step");
  const hintList = h("ol.hints");
  const hintBtn = h("button.btn.ghost", { "data-tour": "hints", onclick: () => showHint() }, `💡 Hint (0/${level.hints.length})`);

  root.replaceChildren(
    h(
      "header.bar",
      { style: { "--world": chapter.color } },
      h("a.btn.ghost", { href: "#map" }, "← Map"),
      h("div.bar-mid", {}, h("span.chip", {}, `Ch ${chapter.number} · ${chapter.world}`), h("h1.bar-title", {}, `${level.id}  ${level.title}`)),
      prev?.completed ? stars(prev.stars, MAX_STARS) : h("span"),
    ),
    h(
      "main.level",
      {},
      h(
        "div.left",
        {},
        h("div.stage-wrap", { "data-tour": "stage" }, canvas),
        h("div.toolbar", { "data-tour": "toolbar" }, launchBtn, pauseBtn, resetBtn, slowBtn, h("div.toggles", {}, ...toggles)),
        h(
          "div.data",
          { "data-tour": "datarow" },
          level.graph ? h("div.graph-wrap", { "data-tour": "graph" }, graphCanvas) : null,
          h("div.data-panel", { "data-tour": "data" }, h("h3", {}, "Data"), readoutBox, h("h3", {}, "Equation"), eqBox),
        ),
      ),
      h(
        "aside.right",
        {},
        h(
          "section.card.hook",
          { "data-tour": "hook" },
          tutorialBanner(),
          h("p", {}, level.hook),
          h("p.goal", {}, h("strong", {}, "Goal: "), level.goal),
          opts.restart && opts.tutorialChapter === undefined
            ? h("button.btn.ghost.new-numbers", { onclick: () => opts.restart!(), title: "Same situation, different numbers" }, "🎲 New numbers")
            : null,
        ),
        predictBox,
        equationBox,
        playBox,
        explainBox,
        doneBox,
      ),
    ),
  );

  const renderer = new Renderer(canvas);
  const graph = level.graph ? new LiveGraph(graphCanvas, level.graph) : null;
  const ro = new ResizeObserver(() => {
    renderer.resize();
    graph?.resize();
  });
  ro.observe(canvas);
  if (level.graph) ro.observe(graphCanvas);

  /* ---------------- steps ---------------- */
  function renderPredict() {
    const q = level.predict;
    const locked = phase !== "predict";
    predictBox.className = `step ${locked ? "complete" : "active"}`;
    const body: (Node | string)[] = [h("h2", {}, h("span.step-n", {}, "1"), "Predict"), h("p.q", {}, q.prompt)];
    if (!locked) {
      body.push(mcq(q, prediction, (i) => {
        prediction = i;
        renderPredict();
      }));
      body.push(h("button.btn.primary", { disabled: prediction < 0, onclick: () => lockPrediction() }, "Lock it in"));
    } else {
      body.push(h("p.picked", {}, "You guessed: ", h("strong", {}, q.options[prediction])));
      if (predictionRevealed) body.push(verdict(prediction === q.correct, q));
      else body.push(h("p.small", {}, "Launch to check."));
    }
    predictBox.replaceChildren(...body);
  }

  function lockPrediction() {
    if (phase !== "predict" || prediction < 0) return;
    phase = "equation";
    renderPredict();
    renderEquation();
    renderPlay();
    updatePanel();
  }

  /** Step 2: pick the equation from the sheet. One try; feedback either way, then Play unlocks. */
  function renderEquation() {
    const q = pickEq;
    const head = h("h2", {}, h("span.step-n", {}, "2"), "Pick the equation");
    if (phase === "predict") {
      equationBox.className = "step pending";
      equationBox.replaceChildren(head, h("p.small", {}, "Predict first."));
      return;
    }
    const body: Node[] = [head, h("p.q", {}, q.prompt)];
    if (equationAnswer < 0) {
      equationBox.className = "step active";
      let pick = -1;
      const submit = h("button.btn.primary", { disabled: true, onclick: () => answerEquation(pick) }, "Check");
      body.push(
        eqChoices(q.options as EqId[], (i) => {
          pick = i;
          submit.disabled = false;
        }),
        submit,
      );
    } else {
      equationBox.className = "step complete";
      const ok = equationAnswer === q.correct;
      const right: SheetEquation = EQUATIONS[q.options[q.correct] as EqId];
      body.push(
        h(
          "div",
          { className: `verdict ${ok ? "ok" : "no"}` },
          h("strong", {}, ok ? "✓ Right equation!" : "✗ The one you need:"),
          texEl(right.tex, true, "tex eq-answer"),
          h("p.small", {}, `${right.sheet}${right.from ? ` · ${right.from}` : ""}`),
          h("p", {}, q.why),
        ),
      );
    }
    equationBox.replaceChildren(...body);
  }

  function answerEquation(i: number) {
    if (phase !== "equation" || i < 0 || equationAnswer >= 0) return;
    equationAnswer = i;
    phase = "play";
    renderEquation();
    renderPlay();
    updatePanel();
    launchBtn.disabled = false;
    launchBtn.focus();
  }

  function renderPlay() {
    const active = phase === "play";
    const before = phase === "predict" || phase === "equation";
    playBox.className = `step ${before ? "pending" : active ? "active" : "complete"}`;
    const body: Node[] = [h("h2", {}, h("span.step-n", {}, "3"), "Play")];
    if (before) body.push(h("p.small", {}, phase === "predict" ? "Predict first." : "Pick the equation first."));
    else {
      body.push(controlsBox, h("div.row", {}, h("button.btn.primary", { onclick: () => launch(), disabled: running }, "▶ Launch"), hintBtn), outcomeBox, hintList);
      if (attempts > 0) body.push(h("p.small", {}, `Attempts: ${attempts}`));
    }
    playBox.replaceChildren(...body);
    sliderInputs.forEach((i) => (i.disabled = before || running));
  }

  function renderExplain() {
    if (phase === "predict" || phase === "equation" || phase === "play") {
      explainBox.className = "step pending";
      explainBox.replaceChildren(h("h2", {}, h("span.step-n", {}, "4"), "Explain"), h("p.small", {}, "Win to unlock."));
      return;
    }
    const q = level.explain;
    explainBox.className = `step ${phase === "explain" ? "active" : "complete"}`;
    const body: Node[] = [h("h2", {}, h("span.step-n", {}, "4"), "Explain"), h("p.q", {}, q.prompt)];
    if (explainAnswer < 0) {
      let pick = -1;
      const submit = h("button.btn.primary", { disabled: true, onclick: () => answerExplain(pick) }, "Check");
      body.push(mcq(q, -1, (i) => {
        pick = i;
        submit.disabled = false;
      }), submit);
    } else {
      body.push(verdict(explainAnswer === q.correct, q));
    }
    explainBox.replaceChildren(...body);
  }

  function answerExplain(i: number) {
    if (i < 0) return;
    explainAnswer = i;
    phase = "done";
    const eqOk = equationAnswer === pickEq.correct;
    const nStars = 1 + (prediction === level.predict.correct ? 1 : 0) + (eqOk ? 1 : 0) + (i === level.explain.correct ? 1 : 0);
    recordLevel(level.id, {
      completed: true,
      stars: nStars,
      predictedCorrect: prediction === level.predict.correct,
      explainedCorrect: i === level.explain.correct,
      equationCorrect: eqOk,
      attempts,
      hintsUsed: hintsShown,
    });
    renderExplain();
    renderDone(nStars);
  }

  function renderDone(nStars?: number) {
    if (phase !== "done" || nStars === undefined) {
      doneBox.className = "step hidden";
      doneBox.replaceChildren();
      return;
    }
    const nxt = nextLevel(level.id);
    doneBox.className = "step done-card";
    doneBox.replaceChildren(
      h("h2", {}, "Level complete! 🎉"),
      h("div.star-row", {}, stars(nStars, MAX_STARS)),
      h(
        "ul.star-why",
        {},
        h("li", {}, "★ Goal"),
        h("li", { className: prediction === level.predict.correct ? "" : "miss" }, `${prediction === level.predict.correct ? "★" : "☆"} Guess`),
        h("li", { className: equationAnswer === pickEq.correct ? "" : "miss" }, `${equationAnswer === pickEq.correct ? "★" : "☆"} Equation`),
        h("li", { className: explainAnswer === level.explain.correct ? "" : "miss" }, `${explainAnswer === level.explain.correct ? "★" : "☆"} Explain`),
      ),
      h("div.journal-unlock", {}, h("p.small", {}, "📓 New in your Journal"), h("strong", {}, level.journal.title), texEl(level.journal.tex, true), h("p", {}, level.journal.note)),
      h(
        "div.row",
        {},
        nxt ? h("a.btn.primary", { href: `#level-${nxt.id}` }, `Next: ${nxt.title} →`) : h("a.btn.primary", { href: "#journal" }, "Open the Journal"),
        h("button.btn.secondary", { onclick: () => (opts.restart ? opts.restart() : replay()) }, "Play again (new numbers)"),
        h("a.btn.ghost", { href: "#map" }, "Map"),
      ),
    );
    doneBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function replay() {
    phase = "predict";
    prediction = -1;
    predictionRevealed = false;
    explainAnswer = -1;
    equationAnswer = -1;
    attempts = 0;
    succeeded = false;
    hintsShown = 0;
    hintList.replaceChildren();
    hintBtn.textContent = `💡 Hint (0/${level.hints.length})`;
    hintBtn.disabled = false;
    outcomeBox.replaceChildren();
    outcomeBox.className = "outcome";
    launchBtn.disabled = true;
    resetSim();
    renderAll();
  }

  function showHint() {
    if (hintsShown >= level.hints.length) return;
    hintList.append(h("li", {}, level.hints[hintsShown]));
    hintsShown++;
    hintBtn.textContent = hintsShown >= level.hints.length ? "💡 No more hints" : `💡 Hint (${hintsShown}/${level.hints.length})`;
    hintBtn.disabled = hintsShown >= level.hints.length;
  }

  function renderAll() {
    renderPredict();
    renderEquation();
    renderPlay();
    renderExplain();
    renderDone();
  }

  /* ---------------- simulation ---------------- */
  const stepper = new FixedStepper();
  let raf = 0;
  let last = performance.now();
  let lastPanel = 0;

  function preview() {
    sim = level.create(params);
    graph?.clear();
    outcomeShown = true;
    updatePanel();
  }

  function resetSim() {
    running = false;
    paused = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = "❚❚ Pause";
    preview();
    if (phase !== "predict") renderPlay();
    launchBtn.disabled = phase === "predict" || phase === "equation";
  }

  function launch() {
    if (phase === "predict" || phase === "equation") return;
    sim = level.create(params);
    graph?.clear();
    stepper.reset();
    running = true;
    paused = false;
    outcomeShown = false;
    attempts++;
    pauseBtn.disabled = false;
    launchBtn.disabled = true;
    outcomeBox.className = "outcome running";
    outcomeBox.textContent = "Running…";
    renderPlay();
    // On narrow screens the panel sits above the stage: bring the action into view.
    if (window.matchMedia("(max-width: 960px)").matches) canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseBtn.textContent = paused ? "▶ Resume" : "❚❚ Pause";
  }

  function toggleSlow() {
    slow = !slow;
    slowBtn.setAttribute("aria-pressed", String(slow));
    slowBtn.classList.toggle("on", slow);
  }

  function finish() {
    running = false;
    pauseBtn.disabled = true;
    launchBtn.disabled = false;
    const o = sim.outcome();
    lastOutcome = o;
    outcomeShown = true;
    outcomeBox.className = `outcome ${o.success ? "win" : "fail"}`;
    outcomeBox.replaceChildren(h("strong", {}, o.success ? "✅ " : "❌ "), o.message);
    if (!o.success && attempts >= 2 && hintsShown === 0) outcomeBox.append(h("p.small", {}, "Stuck? Try 💡."));
    if (!predictionRevealed) {
      predictionRevealed = true;
      renderPredict();
    }
    if (o.success && !succeeded) {
      succeeded = true;
      phase = "explain";
      renderAll();
      explainBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else renderPlay();
  }

  function updatePanel() {
    readoutBox.replaceChildren(...sim.readouts().flatMap((r) => [h("dt", {}, r.label), h("dd", {}, r.value)]));
    if (phase === "predict" || phase === "equation") eqBox.textContent = "Shown after you pick the equation (step 2).";
    else eqBox.innerHTML = tex(sim.equation(), false);
  }

  function frame(now: number) {
    const realDt = (now - last) / 1000;
    last = now;
    if (running && !paused) {
      const steps = stepper.advance(realDt, slow ? 0.25 : 1);
      for (let i = 0; i < steps && !sim.isDone(); i++) {
        sim.step(DT);
      }
      if (graph && sim.sample) graph.push(sim.t, sim.sample());
      if (sim.isDone() && !outcomeShown) finish();
    }
    renderer.setView(sim.view ? sim.view() : level.view);
    sim.draw(renderer, ov);
    if (graph) graph.draw();
    if (now - lastPanel > 100) {
      updatePanel();
      lastPanel = now;
    }
    raf = requestAnimationFrame(frame);
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "number") return;
    if (e.key === " " && phase !== "predict" && phase !== "equation" && document.activeElement?.tagName !== "BUTTON") {
      e.preventDefault();
      running ? togglePause() : launch();
    }
  };
  window.addEventListener("keydown", onKey);

  renderAll();
  updatePanel();
  raf = requestAnimationFrame(frame);

  function tutorialBanner() {
    const ch = level.chapter;
    const isFirst = chapter.levels[0].id === level.id;
    if (!isFirst || opts.tutorialChapter !== undefined || !TUTORIALS[ch] || tutorialDone(ch)) return null;
    return h("p.tut-banner", {}, "New here? ", h("a", { href: `#tutorial-${ch}` }, "🎓 Quick tutorial"));
  }

  const api: LevelAPI = {
    level,
    phase: () => phase,
    prediction: () => prediction,
    selectPrediction(i) {
      if (phase !== "predict") return;
      prediction = i;
      renderPredict();
    },
    lockPrediction,
    answerEquation,
    equationAnswer: () => equationAnswer,
    setParam: (k, v) => setters[k]?.(v),
    launch,
    isRunning: () => running,
    lastOutcome: () => lastOutcome,
  };
  const stopTour =
    opts.tutorialChapter !== undefined && TUTORIALS[opts.tutorialChapter]
      ? startTour(TUTORIALS[opts.tutorialChapter], api)
      : null;

  return () => {
    stopTour?.();
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener("keydown", onKey);
  };
}

function mcq(q: MCQ, selected: number, onPick: (i: number) => void) {
  const name = `q${Math.random().toString(36).slice(2)}`;
  return h(
    "fieldset.mcq",
    {},
    h("legend.sr", {}, q.prompt),
    ...q.options.map((opt, i) =>
      h(
        "label.opt",
        {},
        h("input", { type: "radio", name, checked: i === selected, onchange: () => onPick(i) }),
        h("span", {}, opt),
      ),
    ),
  );
}

/** Four equations to choose from, typeset with KaTeX. */
function eqChoices(ids: EqId[], onPick: (i: number) => void) {
  const name = `eq${Math.random().toString(36).slice(2)}`;
  return h(
    "fieldset.mcq.eq-choices",
    {},
    h("legend.sr", {}, "Equation choices"),
    ...ids.map((id, i) => {
      const e = EQUATIONS[id];
      const label = h("label.opt.eq-opt", {}, h("input", { type: "radio", name, onchange: () => onPick(i), "aria-label": e.tex }), texEl(e.tex, false, "tex"));
      return label;
    }),
  );
}

function verdict(ok: boolean, q: MCQ) {
  return h(
    "div",
    { className: `verdict ${ok ? "ok" : "no"}` },
    h("strong", {}, ok ? "✓ Right!" : `✗ Answer: ${q.options[q.correct]}`),
    h("p", {}, q.why),
  );
}
