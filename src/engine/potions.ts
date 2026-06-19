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
  | "explosivePotion" // deal 10 damage to all enemies
  // ── expansion ──
  | "fearPotion"
  | "weakPotion"
  | "poisonPotion"
  | "cripplePotion"
  | "dexterityPotion"
  | "regenPotion"
  | "ironPotion"
  | "giantPotion"
  | "ancientPotion"
  | "fairyPotion"
  | "fortifyPotion"
  | "bombPotion"
  | "flameVial"
  | "wisdomPotion"
  | "berserkPotion";

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
  // ── expansion ──
  fearPotion: { id: "fearPotion", effects: [{ kind: "applyStatusAll", status: "vulnerable", amount: 3 }] },
  weakPotion: { id: "weakPotion", effects: [{ kind: "applyStatusAll", status: "weak", amount: 3 }] },
  poisonPotion: { id: "poisonPotion", effects: [{ kind: "applyStatusAll", status: "poison", amount: 6 }] },
  cripplePotion: { id: "cripplePotion", effects: [{ kind: "applyStatusAll", status: "frail", amount: 3 }] },
  dexterityPotion: {
    id: "dexterityPotion",
    effects: [{ kind: "applyStatus", status: "dexterity", amount: 2, target: "self" }],
  },
  regenPotion: {
    id: "regenPotion",
    effects: [{ kind: "applyStatus", status: "regeneration", amount: 5, target: "self" }],
  },
  ironPotion: {
    id: "ironPotion",
    effects: [{ kind: "applyStatus", status: "metallicize", amount: 3, target: "self" }],
  },
  giantPotion: {
    id: "giantPotion",
    effects: [{ kind: "applyStatus", status: "strength", amount: 3, target: "self" }],
  },
  ancientPotion: {
    id: "ancientPotion",
    effects: [
      { kind: "applyStatus", status: "strength", amount: 1, target: "self" },
      { kind: "applyStatus", status: "dexterity", amount: 1, target: "self" },
    ],
  },
  fairyPotion: { id: "fairyPotion", effects: [{ kind: "heal", amount: 30 }] },
  fortifyPotion: { id: "fortifyPotion", effects: [{ kind: "block", amount: 20 }] },
  bombPotion: { id: "bombPotion", effects: [{ kind: "damageAll", amount: 20 }] },
  flameVial: { id: "flameVial", effects: [{ kind: "damage", amount: 15 }] },
  wisdomPotion: {
    id: "wisdomPotion",
    effects: [
      { kind: "draw", amount: 2 },
      { kind: "gainEnergy", amount: 1 },
    ],
  },
  berserkPotion: {
    id: "berserkPotion",
    effects: [
      { kind: "gainEnergy", amount: 2 },
      { kind: "loseHp", amount: 5 },
    ],
  },
};

export function getPotionDef(id: PotionId): PotionDef {
  return POTION_DEFS[id];
}

export const ALL_POTION_IDS = Object.keys(POTION_DEFS) as PotionId[];
