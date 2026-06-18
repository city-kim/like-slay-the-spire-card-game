// Relic system, built on the same pure-handler pattern as the trigger bus.
//
// Relics subscribe to combat EVENTS rather than turn boundaries. Each relic
// registers pure handlers in RELIC_DEFS; the reducer emits events at the right
// moments via the relicOn* dispatchers below. Adding a relic is data-only — no
// reducer changes. This is the seam future event-driven content hooks into.

import type { CardDef, GameState, RelicId } from "./types";
import { addStatusTo, damageCombatant, listSideRefs } from "./internal";
import type { RNG } from "./rng";

/** A `{ tkey }` reference to a relic's localized name, for log lines. */
function relicName(id: RelicId): { tkey: string } {
  return { tkey: `relic.${id}.name` };
}

function logTrigger(state: GameState, id: RelicId): GameState {
  return { ...state, log: [...state.log, { key: "log.relicTrigger", params: { relic: relicName(id) } }] };
}

interface RelicBehavior {
  onCombatStart?: (state: GameState, rng: RNG) => GameState;
  onPlayerTurnStart?: (state: GameState, rng: RNG) => GameState;
  /** Fires after a card the player played has fully resolved. */
  onCardPlayed?: (state: GameState, card: CardDef, rng: RNG) => GameState;
}

export const RELIC_DEFS: Record<RelicId, RelicBehavior> = {
  anchor: {
    onCombatStart: (state) => ({ ...state, player: { ...state.player, block: state.player.block + 10 } }),
  },

  vajra: {
    onCombatStart: (state) => addStatusTo(state, { side: "player" }, "strength", 1),
  },

  bagOfMarbles: {
    onCombatStart: (state) => {
      let next = state;
      for (const ref of listSideRefs(next, "enemy")) {
        next = addStatusTo(next, ref, "vulnerable", 1);
      }
      return next;
    },
  },

  shuriken: {
    onCardPlayed: (state, card) => {
      if (card.type !== "attack") return state;
      const count = (state.relicCounters.shuriken ?? 0) + 1;
      let next: GameState = { ...state, relicCounters: { ...state.relicCounters, shuriken: count } };
      if (count % 3 === 0) {
        next = addStatusTo(next, { side: "player" }, "strength", 1);
        next = logTrigger(next, "shuriken");
      }
      return next;
    },
  },

  mercuryHourglass: {
    onPlayerTurnStart: (state) => {
      let next = state;
      let hit = false;
      next.enemies.forEach((enemy, index) => {
        if (enemy.hp <= 0) return;
        next = damageCombatant(next, { side: "enemy", index }, 3);
        hit = true;
      });
      return hit ? logTrigger(next, "mercuryHourglass") : next;
    },
  },
};

// ─── Event dispatchers ───────────────────────────────────────────────────────
// Each walks the player's relics in order, threading state immutably.

function emit(
  state: GameState,
  pick: (b: RelicBehavior) => ((s: GameState) => GameState) | undefined,
): GameState {
  let next = state;
  for (const id of next.player.relics) {
    const handler = pick(RELIC_DEFS[id]);
    if (handler) next = handler(next);
  }
  return next;
}

export function relicOnCombatStart(state: GameState, rng: RNG): GameState {
  return emit(state, (b) => b.onCombatStart && ((s) => b.onCombatStart!(s, rng)));
}

export function relicOnPlayerTurnStart(state: GameState, rng: RNG): GameState {
  return emit(state, (b) => b.onPlayerTurnStart && ((s) => b.onPlayerTurnStart!(s, rng)));
}

export function relicOnCardPlayed(state: GameState, card: CardDef, rng: RNG): GameState {
  return emit(state, (b) => b.onCardPlayed && ((s) => b.onCardPlayed!(s, card, rng)));
}

/** All relic ids (runtime list), e.g. for treasure-node relic rolls. */
export const ALL_RELIC_IDS = Object.keys(RELIC_DEFS) as RelicId[];
