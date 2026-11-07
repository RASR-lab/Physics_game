/** Local save data. Wrapped in try/catch: storage can be unavailable (private mode, embeds). */
export interface LevelProgress {
  completed: boolean;
  stars: number; // 0–3: success, correct prediction, correct explanation
  predictedCorrect: boolean;
  explainedCorrect: boolean;
  attempts: number;
  hintsUsed: number;
}

export interface Progress {
  levels: Record<string, LevelProgress>;
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

export function totalStars(): number {
  return Object.values(load().levels).reduce((s, l) => s + (l.stars || 0), 0);
}

export function resetProgress() {
  save({ levels: {} });
}
