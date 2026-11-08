import { CHAPTERS, ALL_LEVELS } from "../levels";
import { getLevel, resetProgress, totalStars, tutorialDone } from "../game/progress";
import { TUTORIALS } from "../tutorials";
import { h, stars } from "./dom";

export function renderHome(root: HTMLElement) {
  const total = totalStars();
  const max = ALL_LEVELS.length * 3;
  root.replaceChildren(
    h(
      "header.hero",
      {},
      h("div.hero-inner", {}, h("h1", {}, "Physics Quest"), h("p.tag", {}, "Guess. Test. Learn physics.")),
      h("div.hero-stats", {}, h("span.big", {}, `${total}`), h("span", {}, ` / ${max} ★`)),
    ),
    h(
      "section.howto",
      { "aria-label": "How to play" },
      step("1", "Predict", "Guess first."),
      step("2", "Play", "Run the experiment."),
      step("3", "Explain", "Say why. Earn ⭐."),
      step("🎓", "New?", "Start with the tutorial."),
    ),
    h(
      "main.worlds",
      {},
      ...CHAPTERS.map((ch) =>
        h(
          "section.world",
          { style: { "--world": ch.color } },
          h(
            "div.world-head",
            {},
            h("span.chip", {}, `Ch ${ch.number} · ${ch.title}`),
            h("h2", {}, ch.world),
            h("p", {}, ch.blurb),
          ),
          TUTORIALS[ch.number]
            ? h(
                "a.tut-link",
                { href: `#tutorial-${ch.number}` },
                h("span", {}, "🎓"),
                h("span.lv-title", {}, h("strong", {}, "Tutorial"), h("small", {}, "How to play")),
                tutorialDone(ch.number) ? h("span.done-tag", {}, "✓ Done") : h("span.new", {}, "Start here"),
              )
            : null,
          h(
            "ol.level-list",
            {},
            ...ch.levels.map((lv) => {
              const pr = getLevel(lv.id);
              return h(
                "li",
                {},
                h(
                  "a.level-link",
                  { href: `#level-${lv.id}` },
                  h("span.lv-id", {}, lv.id),
                  h("span.lv-title", {}, lv.title),
                  pr?.completed ? stars(pr.stars) : h("span.new", {}, "Play"),
                ),
              );
            }),
          ),
        ),
      ),
    ),
    h(
      "footer.foot",
      {},
      h("a.btn.secondary", { href: "#journal" }, "📓 Physics Journal"),
      h(
        "button.btn.ghost",
        {
          onclick: () => {
            if (confirmReset()) {
              resetProgress();
              renderHome(root);
            }
          },
        },
        "Reset progress",
      ),
      h("p.small", {}, "PHYS 211, Ch 2, 3, 5, 6. Progress saves in this browser."),
    ),
  );
}

let armed = false;
function confirmReset() {
  // two-click confirm instead of a blocking browser dialog
  if (armed) {
    armed = false;
    return true;
  }
  armed = true;
  const b = document.querySelector<HTMLButtonElement>(".foot .ghost");
  if (b) b.textContent = "Click again to erase all stars";
  setTimeout(() => {
    armed = false;
    if (b) b.textContent = "Reset progress";
  }, 3000);
  return false;
}

function step(num: string, title: string, text: string) {
  return h("div.how", {}, h("span.how-n", {}, num), h("div", {}, h("strong", {}, title), h("p", {}, text)));
}
