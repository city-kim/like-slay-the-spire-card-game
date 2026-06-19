import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeRng, restoreRng, type RNG } from "../engine";
import { createRun, runReduce, type RunAction, type RunState } from "../run";
import { clearRun, loadRun, saveRun } from "./runStorage";
import { loadDifficulty, saveDifficulty } from "./difficultyStorage";

/**
 * React binding around the pure run reducer, with localStorage persistence and
 * a character-select gate. `state` is null until a run is started (or resumed),
 * so the UI can show character selection first. A saved run auto-resumes
 * (restoring the rng's exact state) so a refresh continues mid-run.
 */
export function useRun() {
  const rngRef = useRef<RNG | null>(null);

  const [state, setState] = useState<RunState | null>(() => {
    const saved = loadRun();
    if (saved) {
      rngRef.current = restoreRng(saved.rngState);
      return saved.run;
    }
    return null; // no run yet → character select
  });

  // Persist after every change, including the rng's advanced state.
  useEffect(() => {
    if (state) saveRun(state, rngRef.current!.state());
  }, [state]);

  const dispatch = useCallback((action: RunAction) => {
    setState((prev) => (prev ? runReduce(prev, action, rngRef.current!) : prev));
  }, []);

  /** Begin a run with the chosen character at the stored difficulty. */
  const start = useCallback((character: string, seed?: number) => {
    const s = seed ?? Math.floor(Math.random() * 1_000_000_000);
    rngRef.current = makeRng(s * 7 + 1);
    setState(createRun({ seed: s, character, difficulty: loadDifficulty() }));
  }, []);

  /** Abandon the run and return to character select. `nextDifficulty` sets the
   *  difficulty the next run will use (clear → +1, reset → 0). */
  const restart = useCallback((nextDifficulty?: number) => {
    if (nextDifficulty !== undefined) saveDifficulty(nextDifficulty);
    clearRun();
    rngRef.current = null;
    setState(null);
  }, []);

  return useMemo(() => ({ state, dispatch, start, restart }), [state, dispatch, start, restart]);
}
