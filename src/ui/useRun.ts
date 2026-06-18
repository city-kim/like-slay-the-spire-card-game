import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeRng, restoreRng, type RNG } from "../engine";
import { createRun, runReduce, type RunAction, type RunOptions, type RunState } from "../run";
import { clearRun, loadRun, saveRun } from "./runStorage";

/**
 * React binding around the pure run reducer, with localStorage persistence.
 * On mount it resumes a saved run (restoring the rng's exact state) if one
 * exists; every state change is auto-saved, so a refresh continues the run.
 */
export function useRun(opts: RunOptions = {}) {
  const seed = opts.seed ?? 1;
  const rngRef = useRef<RNG | null>(null);

  const [state, setState] = useState<RunState>(() => {
    const saved = loadRun();
    if (saved) {
      rngRef.current = restoreRng(saved.rngState);
      return saved.run;
    }
    rngRef.current = makeRng(seed * 7 + 1);
    return createRun(opts);
  });

  // Persist after every change, including the rng's advanced state.
  useEffect(() => {
    saveRun(state, rngRef.current!.state());
  }, [state]);

  const dispatch = useCallback((action: RunAction) => {
    setState((prev) => runReduce(prev, action, rngRef.current!));
  }, []);

  /** Start a fresh run. With a seed it's reproducible; without, a random one. */
  const restart = useCallback(
    (seedOverride?: number) => {
      const s = seedOverride ?? Math.floor(Math.random() * 1_000_000_000);
      clearRun();
      rngRef.current = makeRng(s * 7 + 1);
      setState(createRun({ ...opts, seed: s }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return useMemo(() => ({ state, dispatch, restart }), [state, dispatch, restart]);
}
