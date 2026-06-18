// Small seedable PRNG (mulberry32) so combats are deterministic and testable.
// Keeping randomness behind this interface means the reducer stays a pure
// function of (state, action, rng).

export interface RNG {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an int in [0, max). */
  int(max: number): number;
  /** The current internal state, for save/load. Restore via restoreRng(). */
  state(): number;
}

function build(initial: number): RNG {
  let a = initial >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    state: () => a >>> 0,
  };
}

export function makeRng(seed: number): RNG {
  return build(seed >>> 0);
}

/** Recreates an RNG from a previously saved `state()`, reproducing its stream. */
export function restoreRng(state: number): RNG {
  return build(state >>> 0);
}

/** Fisher–Yates shuffle returning a new array; does not mutate the input. */
export function shuffle<T>(arr: readonly T[], rng: RNG): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
