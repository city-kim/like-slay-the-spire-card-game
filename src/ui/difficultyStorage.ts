// The difficulty level the NEXT run will start at, persisted across runs so the
// game escalates endlessly: each cleared run bumps it, a fresh start resets it.

const KEY = "spire-difficulty";

export function loadDifficulty(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = Number(localStorage.getItem(KEY));
  return Number.isInteger(raw) && raw >= 0 ? raw : 0;
}

export function saveDifficulty(value: number): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, String(Math.max(0, value)));
  } catch {
    // ignore
  }
}
