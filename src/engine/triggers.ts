// The trigger bus: lifecycle behavior for statuses and "powers".
//
// Rather than a mutable event emitter (which would break engine purity), each
// status registers PURE handlers in STATUS_BEHAVIORS. At turn boundaries the
// reducer calls applyTurnStartTriggers / applyTurnEndTriggers, which walk every
// combatant's active statuses and thread state immutably through the handlers.
//
// This is the seam relics, potions, and future powers hook into: add a behavior
// here (and a StatusId in types.ts) instead of branching inside the reducer.

import type { CombatantRef, GameState, Side, StatusId } from "./types";
import {
  addStatusTo,
  combatantNameKey,
  damageCombatant,
  getStatuses,
  healCombatant,
  isAlive,
  listSideRefs,
} from "./internal";

interface StatusBehavior {
  /** Reduce this status by 1 at the END of the owner's turn (temp debuffs). */
  decayPerTurn?: boolean;
  /** Fires at the START of the owner's turn. `stacks` is the current amount. */
  onOwnerTurnStart?: (state: GameState, ref: CombatantRef, stacks: number) => GameState;
  /** Fires at the END of the owner's turn (before decay). */
  onOwnerTurnEnd?: (state: GameState, ref: CombatantRef, stacks: number) => GameState;
}

export const STATUS_BEHAVIORS: Partial<Record<StatusId, StatusBehavior>> = {
  vulnerable: { decayPerTurn: true },
  weak: { decayPerTurn: true },
  frail: { decayPerTurn: true },

  poison: {
    onOwnerTurnStart: (state, ref, stacks) => {
      let next = damageCombatant(state, ref, stacks, { ignoreBlock: true });
      next = addStatusTo(next, ref, "poison", -1);
      return {
        ...next,
        log: [...next.log, { key: "log.poison", params: { target: combatantNameKey(state, ref), dmg: stacks } }],
      };
    },
  },

  demonForm: {
    onOwnerTurnStart: (state, ref, stacks) => addStatusTo(state, ref, "strength", stacks),
  },

  regeneration: {
    onOwnerTurnStart: (state, ref, stacks) => addStatusTo(healCombatant(state, ref, stacks), ref, "regeneration", -1),
  },

  metallicize: {
    onOwnerTurnEnd: (state, ref, stacks) => addBlockTo(state, ref, stacks),
  },
};

function addBlockTo(state: GameState, ref: CombatantRef, amount: number): GameState {
  if (ref.side === "player") {
    return { ...state, player: { ...state.player, block: state.player.block + amount } };
  }
  const enemies = state.enemies.slice();
  const e = enemies[ref.index];
  enemies[ref.index] = { ...e, block: e.block + amount };
  return { ...state, enemies };
}

/** Fire turn-start behaviors for every living combatant on `side`. */
export function applyTurnStartTriggers(state: GameState, side: Side): GameState {
  let next = state;
  for (const ref of listSideRefs(next, side)) {
    if (!isAlive(next, ref)) continue;
    // Snapshot the status ids up front; handlers may mutate stacks as they go.
    const statuses = getStatuses(next, ref);
    for (const id of Object.keys(statuses) as StatusId[]) {
      const stacks = statuses[id] ?? 0;
      const behavior = STATUS_BEHAVIORS[id];
      if (behavior?.onOwnerTurnStart && stacks > 0) {
        next = behavior.onOwnerTurnStart(next, ref, stacks);
      }
    }
  }
  return next;
}

/** Fire turn-end behaviors (onOwnerTurnEnd, then decay) for living combatants. */
export function applyTurnEndTriggers(state: GameState, side: Side): GameState {
  let next = state;
  for (const ref of listSideRefs(next, side)) {
    if (!isAlive(next, ref)) continue;
    const statuses = getStatuses(next, ref);
    for (const id of Object.keys(statuses) as StatusId[]) {
      const behavior = STATUS_BEHAVIORS[id];
      const stacks = statuses[id] ?? 0;
      if (behavior?.onOwnerTurnEnd && stacks > 0) {
        next = behavior.onOwnerTurnEnd(next, ref, stacks);
      }
      if (behavior?.decayPerTurn) {
        next = addStatusTo(next, ref, id, -1);
      }
    }
  }
  return next;
}
