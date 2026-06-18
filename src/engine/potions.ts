import type { Effect } from "./types";

// Potions are one-time consumables used during combat. They reuse the same
// Effect primitives as cards, resolved via applyPlayerEffects(). All potions
// here are self/AoE (no single-enemy target) so using one needs no targeting.

export type PotionId =
  | "healingPotion" // restore 15 HP
  | "blockPotion" // gain 12 Block
  | "strengthPotion" // gain 2 Strength
  | "swiftPotion" // draw 3 cards
  | "energyPotion" // gain 2 Energy
  | "explosivePotion"; // deal 10 damage to all enemies

export interface PotionDef {
  id: PotionId;
  effects: Effect[];
}

export const POTION_DEFS: Record<PotionId, PotionDef> = {
  healingPotion: { id: "healingPotion", effects: [{ kind: "heal", amount: 15 }] },
  blockPotion: { id: "blockPotion", effects: [{ kind: "block", amount: 12 }] },
  strengthPotion: {
    id: "strengthPotion",
    effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }],
  },
  swiftPotion: { id: "swiftPotion", effects: [{ kind: "draw", amount: 3 }] },
  energyPotion: { id: "energyPotion", effects: [{ kind: "gainEnergy", amount: 2 }] },
  explosivePotion: { id: "explosivePotion", effects: [{ kind: "damageAll", amount: 10 }] },
};

export function getPotionDef(id: PotionId): PotionDef {
  return POTION_DEFS[id];
}

export const ALL_POTION_IDS = Object.keys(POTION_DEFS) as PotionId[];
