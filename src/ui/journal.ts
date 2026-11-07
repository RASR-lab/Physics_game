import { CHAPTERS } from "../levels";
import { getLevel } from "../game/progress";
import { h, texEl } from "./dom";

export function renderJournal(root: HTMLElement) {
  root.replaceChildren(
    h("header.bar", {}, h("a.btn.ghost", { href: "#map" }, "← Map"), h("h1.bar-title", {}, "📓 Physics Journal")),
    h(
      "main.journal",
      {},
      h("p.lead", {}, "Every level you finish adds its key idea here. Use it to review for exams."),
      ...CHAPTERS.map((ch) =>
        h(
          "section.j-chapter",
          { style: { "--world": ch.color } },
          h("h2", {}, `Chapter ${ch.number}: ${ch.title}`),
          ...ch.levels.map((lv) => {
            const done = getLevel(lv.id)?.completed;
            if (!done)
              return h("div.j-entry.locked", {}, h("strong", {}, `🔒 ${lv.journal.title}`), h("p", {}, h("a", { href: `#level-${lv.id}` }, `Finish “${lv.title}” to unlock`)));
            return h("div.j-entry", {}, h("strong", {}, lv.journal.title), texEl(lv.journal.tex, true), h("p", {}, lv.journal.note), h("p.small", {}, `From level ${lv.id}: ${lv.title}`));
          }),
        ),
      ),
    ),
  );
}
