import { CHAPTERS, ALL_LEVELS } from "../levels";
import { getLevel, resetProgress, totalStars } from "../game/progress";
import { h, stars } from "./dom";

export function renderHome(root: HTMLElement) {
  const total = totalStars();
  const max = ALL_LEVELS.length * 3;
  root.replaceChildren(
    h(
      "header.hero",
      {},
      h("div.hero-inner", {}, h("h1", {}, "Physics Quest"), h("p.tag", {}, "Learn physics by predicting, playing, and checking. No physics background needed.")),
      h("div.hero-stats", {}, h("span.big", {}, `${total}`), h("span", {}, ` / ${max} ★`)),
    ),
    h(
      "section.howto",
      { "aria-label": "How to play" },
      step("1", "Predict", "Commit to a guess about what will happen."),
      step("2", "Play", "Set real physical quantities and run the simulation."),
      step("3", "Explain", "Check your thinking. Unlock the equation in your Journal."),
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
            h("span.chip", {}, `Chapter ${ch.number}`),
            h("h2", {}, ch.world),
            h("p", {}, `${ch.title}: ${ch.blurb}`),
          ),
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
      h("p.small", {}, "Prototype covering Chapters 2, 3, 5 and 6 of the PHYS 211 equation sheet. Progress is saved in this browser only."),
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
