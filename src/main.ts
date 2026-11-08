import "katex/dist/katex.min.css";
import "./style.css";
import { findLevel } from "./levels";
import { renderHome } from "./ui/home";
import { renderJournal } from "./ui/journal";
import { renderLevel } from "./ui/level";
import { TUTORIALS } from "./tutorials";

const app = document.getElementById("app")!;
let cleanup: (() => void) | null = null;

function route() {
  cleanup?.();
  cleanup = null;
  // Plain #name routes (#map, #journal, #level-2-1) so links work in any host, including embeds.
  const hash = location.hash.replace(/^#/, "") || "map";
  const m = hash.match(/^level-(\d+-\d+)$/);
  window.scrollTo(0, 0);
  if (m) {
    const lv = findLevel(m[1]);
    if (lv) {
      document.title = `${lv.title} · Physics Quest`;
      cleanup = renderLevel(app, lv, { restart: route });
      return;
    }
  }
  const t = hash.match(/^tutorial-(\d+)$/);
  if (t && TUTORIALS[+t[1]]) {
    const tut = TUTORIALS[+t[1]];
    const lv = findLevel(tut.levelId)!;
    document.title = `${tut.title} · Physics Quest`;
    cleanup = renderLevel(app, lv, { tutorialChapter: tut.chapter });
    return;
  }
  if (hash === "journal") {
    document.title = "Journal · Physics Quest";
    renderJournal(app);
    return;
  }
  document.title = "Physics Quest";
  renderHome(app);
}

window.addEventListener("hashchange", route);
route();
