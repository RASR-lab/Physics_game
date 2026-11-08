import type { Tutorial } from "../tutorials";
import type { LevelAPI } from "./level";
import { markTutorialDone } from "../game/progress";
import { h } from "./dom";

/**
 * Spotlight tour: dims the page, highlights one part of the level screen, and shows a
 * coaching card. The page stays fully interactive underneath (the dim layer ignores clicks).
 */
export function startTour(tut: Tutorial, api: LevelAPI): () => void {
  let idx = 0;
  let alive = true;
  const ran = new Set<number>();

  const spot = h("div.tour-spot", { "aria-hidden": "true" });
  const card = h("div.tour-card", { role: "dialog", "aria-modal": "false", "aria-labelledby": "tour-title", tabindex: "-1" });
  document.body.append(spot, card);

  const nextBtn = h("button.btn.primary", { onclick: () => next() }, "Next →");
  const backBtn = h("button.btn.secondary", { onclick: () => go(idx - 1) }, "← Back");
  const skipBtn = h("button.tour-skip", { onclick: () => close() }, "Skip tutorial");
  const waitNote = h("p.tour-wait", { "aria-live": "polite" });

  function target(): HTMLElement | null {
    const t = tut.steps[idx].target;
    return t ? document.querySelector<HTMLElement>(`[data-tour="${t}"]`) : null;
  }

  function render() {
    const s = tut.steps[idx];
    if (!ran.has(idx)) {
      ran.add(idx);
      s.do?.(api);
    }
    const last = idx === tut.steps.length - 1;
    nextBtn.textContent = last ? "Start playing ✓" : "Next →";
    backBtn.disabled = idx === 0;
    card.replaceChildren(
      h("div.tour-top", {}, h("span.tour-count", {}, `🎓 Tutorial · ${idx + 1} of ${tut.steps.length}`), skipBtn),
      h("div.tour-bar", {}, h("span", { style: { width: `${((idx + 1) / tut.steps.length) * 100}%` } })),
      h("h2", { id: "tour-title" }, s.title),
      h("p", {}, s.body),
      s.think?.length
        ? h("div.tour-think", {}, h("strong", {}, last ? "✅ Questions to ask yourself" : "🧠 What to think about"), h("ul", {}, ...s.think.map((t) => h("li", {}, t))))
        : "",
      waitNote,
      h("div.tour-nav", {}, backBtn, nextBtn),
    );
    const el = target();
    if (!el) window.scrollTo({ top: 0, behavior: "smooth" });
    else if (window.innerWidth < 720) {
      // phones: the card docks at the bottom, so put the target just under the sticky header
      const top = el.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    } else el.scrollIntoView({ behavior: "smooth", block: "center" });
    card.focus({ preventScroll: true });
  }

  function go(i: number) {
    if (i < 0 || i >= tut.steps.length) return;
    idx = i;
    render();
  }

  function next() {
    const s = tut.steps[idx];
    if (s.waitFor && !s.waitFor(api)) return;
    s.onNext?.(api);
    if (idx === tut.steps.length - 1) close();
    else go(idx + 1);
  }

  function close() {
    if (!alive) return;
    alive = false;
    markTutorialDone(tut.chapter);
    spot.remove();
    card.remove();
    window.removeEventListener("keydown", onKey);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" && !(e.target instanceof HTMLInputElement)) next();
    else if (e.key === "ArrowLeft" && !(e.target instanceof HTMLInputElement)) go(idx - 1);
  }
  window.addEventListener("keydown", onKey);

  // Keep the spotlight and card glued to the target while the page scrolls or reflows.
  function layout() {
    if (!alive) return;
    const s = tut.steps[idx];
    const waiting = !!s.waitFor && !s.waitFor(api);
    nextBtn.disabled = waiting;
    waitNote.textContent = waiting ? s.waitText ?? "" : "";

    const W = window.innerWidth,
      H = window.innerHeight;
    const el = target();
    const pad = 8;
    if (el) {
      const r = el.getBoundingClientRect();
      Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + 2 * pad}px`, height: `${r.height + 2 * pad}px`, opacity: "1" });
    } else {
      Object.assign(spot.style, { left: `${W / 2}px`, top: `${H / 2}px`, width: "0px", height: "0px" });
    }

    const cw = card.offsetWidth,
      ch = card.offsetHeight;
    let x: number, y: number;
    if (W < 720) {
      // phones: dock the card to the bottom of the screen
      card.classList.add("docked");
      x = 8;
      y = H - ch - 8;
    } else {
      card.classList.remove("docked");
      if (!el) {
        x = (W - cw) / 2;
        y = (H - ch) / 2;
      } else {
        const r = el.getBoundingClientRect();
        const gap = 18;
        if (r.right + gap + cw < W - 8) x = r.right + gap;
        else if (r.left - gap - cw > 8) x = r.left - gap - cw;
        else x = Math.min(Math.max(8, r.left), W - cw - 8);
        if (x === r.right + gap || x === r.left - gap - cw) y = Math.min(Math.max(8, r.top), H - ch - 8);
        else y = r.bottom + gap + ch < H ? r.bottom + gap : Math.max(8, r.top - gap - ch);
      }
    }
    card.style.left = `${Math.round(x)}px`;
    card.style.top = `${Math.round(Math.max(8, y))}px`;
    requestAnimationFrame(layout);
  }

  render();
  requestAnimationFrame(layout);
  return close;
}
