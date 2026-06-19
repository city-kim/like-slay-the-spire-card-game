import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeRng, restoreRng, type RNG } from "../engine";
import { createRun, runReduce, type RunAction, type RunState } from "../run";
import { clearRun, loadRun, saveRun } from "./runStorage";

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

  /** Begin a run with the chosen character. A given seed is reproducible. */
  const start = useCallback((character: string, seed?: number) => {
    const s = seed ?? Math.floor(Math.random() * 1_000_000_000);
    rngRef.current = makeRng(s * 7 + 1);
    setState(createRun({ seed: s, character }));
  }, []);

  /** Abandon the run and return to character select. */
  const restart = useCallback(() => {
    clearRun();
    rngRef.current = null;
    setState(null);
  }, []);

  return useMemo(() => ({ state, dispatch, start, restart }), [state, dispatch, start, restart]);
}
