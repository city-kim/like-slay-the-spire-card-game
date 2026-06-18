import { ALL_POTION_IDS, ALL_RELIC_IDS, REWARD_POOL, type RNG } from "../engine";
import type { RunState } from "./types";

// Random "?" event nodes. Each event presents choices; a choice applies a list
// of RunEffects to the run (hp/gold/maxHp/relic/potion/card). Data-driven: add
// an entry here + matching i18n keys (event.<id>.title/body/choices.N/results.N).

const MAX_POTIONS = 3;

export type RunEffect =
  | { kind: "heal"; amount: number }
  | { kind: "loseHp"; amount: number }
  | { kind: "gainGold"; amount: number }
  | { kind: "loseGold"; amount: number }
  | { kind: "maxHpUp"; amount: number }
  | { kind: "gainRandomRelic" }
  | { kind: "gainRandomPotion" }
  | { kind: "gainCard"; cardId: string };

export interface EventChoice {
  effects: RunEffect[];
}
export interface EventDef {
  id: string;
  choices: EventChoice[];
}

export const EVENT_DEFS: Record<string, EventDef> = {
  shrine: {
    id: "shrine",
    choices: [
      { effects: [{ kind: "gainRandomRelic" }] }, // pray
      { effects: [{ kind: "loseHp", amount: 8 }, { kind: "gainGold", amount: 45 }] }, // offer blood
      { effects: [] }, // leave
    ],
  },
  oldChest: {
    id: "oldChest",
    choices: [
      { effects: [{ kind: "gainRandomPotion" }, { kind: "gainGold", amount: 20 }] }, // open
      { effects: [] }, // ignore
    ],
  },
  wanderingMerchant: {
    id: "wanderingMerchant",
    choices: [
      { effects: [{ kind: "loseGold", amount: 30 }, { kind: "gainCard", cardId: "" }] }, // buy (random card)
      { effects: [] }, // decline
    ],
  },
  cursedTome: {
    id: "cursedTome",
    choices: [
      { effects: [{ kind: "loseHp", amount: 6 }, { kind: "maxHpUp", amount: 8 }] }, // read
      { effects: [{ kind: "gainGold", amount: 15 }] }, // burn
    ],
  },
};

export const ALL_EVENT_IDS = Object.keys(EVENT_DEFS);

export function pickEventId(rng: RNG): string {
  return ALL_EVENT_IDS[rng.int(ALL_EVENT_IDS.length)];
}

/** Applies a choice's effects to the run's player. Pure given rng. */
export function applyRunEffects(run: RunState, effects: RunEffect[], rng: RNG): RunState {
  let player = run.player;
  for (const effect of effects) {
    player = applyOne(player, effect, rng);
  }
  return { ...run, player };
}

function applyOne(player: RunState["player"], effect: RunEffect, rng: RNG): RunState["player"] {
  switch (effect.kind) {
    case "heal":
      return { ...player, hp: Math.min(player.maxHp, player.hp + effect.amount) };
    case "loseHp":
      return { ...player, hp: Math.max(0, player.hp - effect.amount) };
    case "gainGold":
      return { ...player, gold: player.gold + effect.amount };
    case "loseGold":
      return { ...player, gold: Math.max(0, player.gold - effect.amount) };
    case "maxHpUp":
      return { ...player, maxHp: player.maxHp + effect.amount, hp: player.hp + effect.amount };
    case "gainRandomRelic": {
      const owned = new Set(player.relics);
      const candidates = ALL_RELIC_IDS.filter((id) => !owned.has(id));
      if (candidates.length === 0) return { ...player, gold: player.gold + 30 };
      return { ...player, relics: [...player.relics, candidates[rng.int(candidates.length)]] };
    }
    case "gainRandomPotion": {
      if (player.potions.length >= MAX_POTIONS) return { ...player, gold: player.gold + 15 };
      return { ...player, potions: [...player.potions, ALL_POTION_IDS[rng.int(ALL_POTION_IDS.length)]] };
    }
    case "gainCard": {
      const cardId = effect.cardId || REWARD_POOL[rng.int(REWARD_POOL.length)];
      return { ...player, deck: [...player.deck, cardId] };
    }
  }
}
