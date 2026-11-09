/** Local save data. Wrapped in try/catch: storage can be unavailable (private mode, embeds). */
export interface LevelProgress {
  completed: boolean;
  stars: number; // 0–4: success, correct prediction, correct equation, correct explanation
  predictedCorrect: boolean;
  explainedCorrect: boolean;
  /** Picked the right equation from the sheet (added with the 4-star scoring). */
  equationCorrect?: boolean;
  attempts: number;
  hintsUsed: number;
}

export interface Progress {
  levels: Record<string, LevelProgress>;
  tutorials?: Record<string, boolean>;
}

const KEY = "physics-quest-progress-v1";
let memory: Progress = { levels: {} };

export function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) memory = JSON.parse(raw);
  } catch {
    /* use in-memory copy */
  }
  return memory;
}

export function save(p: Progress) {
  memory = p;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function getLevel(id: string): LevelProgress | undefined {
  return load().levels[id];
}

export function recordLevel(id: string, update: LevelProgress) {
  const p = load();
  const old = p.levels[id];
  // keep the best star count
  if (old && old.stars > update.stars) update = { ...update, stars: old.stars };
  p.levels[id] = update;
  save(p);
}

export function tutorialDone(chapter: number): boolean {
  return !!load().tutorials?.[chapter];
}

export function markTutorialDone(chapter: number) {
  const p = load();
  p.tutorials = { ...(p.tutorials ?? {}), [chapter]: true };
  save(p);
}

/** Stars earned, optionally only for the given level ids (saved stars for other levels are kept, not counted). */
export function totalStars(ids?: string[]): number {
  const levels = load().levels;
  const list = ids ? ids.map((id) => levels[id]).filter(Boolean) : Object.values(levels);
  return list.reduce((s, l) => s + (l.stars || 0), 0);
}

export function resetProgress() {
  save({ levels: {} });
}
