import type { RunState } from "../run";

// Side-effecting localStorage persistence for the run. Kept in the UI layer so
// the engine/run stay pure. The run is plain JSON-serializable data; we save the
// rng's internal state alongside it so a resumed run continues deterministically.

const KEY = "spire-run";
const VERSION = 1;

interface SavedRun {
  version: number;
  run: RunState;
  rngState: number;
}

export function saveRun(run: RunState, rngState: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    const payload: SavedRun = { version: VERSION, run, rngState };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Quota or serialization failure — saving is best-effort.
  }
}

export function loadRun(): { run: RunState; rngState: number } | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRun>;
    if (parsed.version !== VERSION || !parsed.run || typeof parsed.rngState !== "number") return null;
    return { run: parsed.run, rngState: parsed.rngState };
  } catch {
    return null;
  }
}

export function clearRun(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
