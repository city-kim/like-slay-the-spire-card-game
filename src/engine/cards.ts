import type { CardDef, CardRarity } from "./types";

// The starter card pool. Add new cards here; the engine resolves them purely
// from their `effects`, so most new cards need no engine changes.
//
// Display text (name + description) is NOT here — it lives in the i18n locale
// files keyed by id (`card.<id>.name`, `card.<id>.description`). Every new card
// must get a matching entry in EVERY locale (src/i18n/locales/*).
export const CARD_DEFS: Record<string, CardDef> = {
  strike: {
    id: "strike",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [{ kind: "damage", amount: 6 }],
  },
  defend: {
    id: "defend",
    type: "skill",
    cost: 1,
    target: "self",
    effects: [{ kind: "block", amount: 5 }],
  },
  bash: {
    id: "bash",
    type: "attack",
    cost: 2,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" },
    ],
  },
  pommelStrike: {
    id: "pommelStrike",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 9 },
      { kind: "draw", amount: 1 },
    ],
  },
  // ── Powers & statuses unlocked by the trigger bus ──
  poisonStab: {
    id: "poisonStab",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 6 },
      { kind: "applyStatus", status: "poison", amount: 3, target: "enemy" },
    ],
  },
  cleave: {
    id: "cleave",
    type: "attack",
    cost: 1,
    target: "enemy",
    aoe: true, // resolves on all enemies; no target selection needed
    effects: [{ kind: "damageAll", amount: 8 }],
  },
  inflame: {
    id: "inflame",
    type: "power",
    cost: 1,
    target: "self",
    effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }],
  },
  demonForm: {
    id: "demonForm",
    type: "power",
    cost: 3,
    target: "self",
    effects: [{ kind: "applyStatus", status: "demonForm", amount: 2, target: "self" }],
  },
  // ── Expanded pool ──
  ironWave: {
    id: "ironWave",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "block", amount: 5 },
      { kind: "damage", amount: 5 },
    ],
  },
  twinStrike: {
    id: "twinStrike",
    type: "attack",
    cost: 1,
    target: "enemy",
    // Two separate hits — each benefits from Strength independently.
    effects: [
      { kind: "damage", amount: 5 },
      { kind: "damage", amount: 5 },
    ],
  },
  clothesline: {
    id: "clothesline",
    type: "attack",
    cost: 2,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 9 },
      { kind: "applyStatus", status: "weak", amount: 2, target: "enemy" },
    ],
  },
  shrugItOff: {
    id: "shrugItOff",
    type: "skill",
    cost: 1,
    target: "self",
    effects: [
      { kind: "block", amount: 8 },
      { kind: "draw", amount: 1 },
    ],
  },
  // ── Keyword showcases ──
  warCry: {
    id: "warCry",
    type: "skill",
    cost: 0,
    target: "self",
    innate: true, // opens in hand
    exhaust: true,
    effects: [{ kind: "draw", amount: 2 }],
  },
  steadyGuard: {
    id: "steadyGuard",
    type: "skill",
    cost: 1,
    target: "self",
    retain: true, // kept across turns
    effects: [{ kind: "block", amount: 6 }],
  },
  phantomStrike: {
    id: "phantomStrike",
    type: "attack",
    cost: 1,
    target: "enemy",
    ethereal: true, // exhausts if unplayed at end of turn
    effects: [{ kind: "damage", amount: 10 }],
  },

  // ── Expansion: commons ──
  quickSlash: {
    id: "quickSlash",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "draw", amount: 1 },
    ],
  },
  footwork: {
    id: "footwork",
    type: "power",
    cost: 1,
    target: "self",
    effects: [{ kind: "applyStatus", status: "dexterity", amount: 2, target: "self" }],
  },
  thunderclap: {
    id: "thunderclap",
    type: "attack",
    cost: 1,
    target: "enemy",
    aoe: true,
    effects: [{ kind: "damageAll", amount: 4 }],
  },
  // ── Expansion: uncommons ──
  uppercut: {
    id: "uppercut",
    type: "attack",
    cost: 2,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 8 },
      { kind: "applyStatus", status: "weak", amount: 1, target: "enemy" },
      { kind: "applyStatus", status: "vulnerable", amount: 1, target: "enemy" },
    ],
  },
  battleTrance: {
    id: "battleTrance",
    type: "skill",
    cost: 0,
    target: "self",
    exhaust: true,
    effects: [{ kind: "draw", amount: 3 }],
  },
  seeingRed: {
    id: "seeingRed",
    type: "skill",
    cost: 1,
    target: "self",
    exhaust: true,
    effects: [{ kind: "gainEnergy", amount: 2 }],
  },
  // ── Expansion: rares ──
  impervious: {
    id: "impervious",
    type: "skill",
    cost: 2,
    target: "self",
    exhaust: true,
    effects: [{ kind: "block", amount: 30 }],
  },
  reaper: {
    id: "reaper",
    type: "attack",
    cost: 2,
    target: "enemy",
    aoe: true,
    exhaust: true,
    effects: [
      { kind: "damageAll", amount: 10 },
      { kind: "heal", amount: 6 },
    ],
  },
  offering: {
    id: "offering",
    type: "skill",
    cost: 0,
    target: "self",
    exhaust: true,
    effects: [
      { kind: "gainEnergy", amount: 2 },
      { kind: "draw", amount: 3 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════
  // Generic / colorless pool (not tied to any class). Effects use existing
  // primitives; rarity lives on each def. Reaches a ~100-card pool.
  // ════════════════════════════════════════════════════════════════════════

  // ── Common attacks ──
  jab: { id: "jab", type: "attack", cost: 0, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 3 }] },
  swiftStrike: { id: "swiftStrike", type: "attack", cost: 0, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 4 }] },
  throwingKnife: { id: "throwingKnife", type: "attack", cost: 0, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 5 }] },
  slash: { id: "slash", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 7 }] },
  gash: { id: "gash", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 8 }] },
  heavyStrike: { id: "heavyStrike", type: "attack", cost: 2, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 14 }] },
  doubleJab: { id: "doubleJab", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 4 }, { kind: "damage", amount: 4 }] },
  flashOfSteel: { id: "flashOfSteel", type: "attack", cost: 0, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 3 }, { kind: "draw", amount: 1 }] },
  boomerangCut: { id: "boomerangCut", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 6 }, { kind: "draw", amount: 1 }] },
  cripplingJab: { id: "cripplingJab", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 6 }, { kind: "applyStatus", status: "weak", amount: 1, target: "enemy" }] },
  destabilize: { id: "destabilize", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 6 }, { kind: "applyStatus", status: "vulnerable", amount: 1, target: "enemy" }] },
  wildSwing: { id: "wildSwing", type: "attack", cost: 1, rarity: "common", target: "enemy", aoe: true, effects: [{ kind: "damageAll", amount: 5 }] },
  sweep: { id: "sweep", type: "attack", cost: 2, rarity: "common", target: "enemy", aoe: true, effects: [{ kind: "damageAll", amount: 8 }] },
  venomStrike: { id: "venomStrike", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 5 }, { kind: "applyStatus", status: "poison", amount: 2, target: "enemy" }] },
  lunge: { id: "lunge", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 9 }] },
  riposte: { id: "riposte", type: "attack", cost: 1, rarity: "common", target: "enemy", effects: [{ kind: "damage", amount: 6 }, { kind: "block", amount: 4 }] },
  // ── Common skills ──
  guard: { id: "guard", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "block", amount: 7 }] },
  brace: { id: "brace", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "block", amount: 6 }, { kind: "draw", amount: 1 }] },
  sidestep: { id: "sidestep", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "block", amount: 5 }] },
  ironGuard: { id: "ironGuard", type: "skill", cost: 2, rarity: "common", target: "self", effects: [{ kind: "block", amount: 14 }] },
  bandageUp: { id: "bandageUp", type: "skill", cost: 0, rarity: "common", target: "self", exhaust: true, effects: [{ kind: "heal", amount: 4 }] },
  patchUp: { id: "patchUp", type: "skill", cost: 1, rarity: "common", target: "self", exhaust: true, effects: [{ kind: "heal", amount: 8 }] },
  blind: { id: "blind", type: "skill", cost: 1, rarity: "common", target: "enemy", aoe: true, effects: [{ kind: "applyStatusAll", status: "weak", amount: 1 }] },
  trip: { id: "trip", type: "skill", cost: 1, rarity: "common", target: "enemy", aoe: true, effects: [{ kind: "applyStatusAll", status: "vulnerable", amount: 1 }] },
  weakenArmor: { id: "weakenArmor", type: "skill", cost: 1, rarity: "common", target: "enemy", aoe: true, effects: [{ kind: "applyStatusAll", status: "frail", amount: 1 }] },
  prepare: { id: "prepare", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "draw", amount: 2 }] },
  deepBreath: { id: "deepBreath", type: "skill", cost: 0, rarity: "common", target: "self", effects: [{ kind: "draw", amount: 1 }] },
  acrobatics: { id: "acrobatics", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "draw", amount: 2 }] },
  fortify: { id: "fortify", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "block", amount: 8 }] },
  recover: { id: "recover", type: "skill", cost: 1, rarity: "common", target: "self", effects: [{ kind: "heal", amount: 6 }] },
  // ── Common powers ──
  sharpenBlade: { id: "sharpenBlade", type: "power", cost: 1, rarity: "common", target: "self", effects: [{ kind: "applyStatus", status: "strength", amount: 1, target: "self" }] },
  nimble: { id: "nimble", type: "power", cost: 1, rarity: "common", target: "self", effects: [{ kind: "applyStatus", status: "dexterity", amount: 1, target: "self" }] },
  toughen: { id: "toughen", type: "power", cost: 1, rarity: "common", target: "self", effects: [{ kind: "applyStatus", status: "metallicize", amount: 2, target: "self" }] },
  regenerate: { id: "regenerate", type: "power", cost: 1, rarity: "common", target: "self", effects: [{ kind: "applyStatus", status: "regeneration", amount: 3, target: "self" }] },

  // ── Uncommon attacks ──
  bludgeon: { id: "bludgeon", type: "attack", cost: 3, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 32 }] },
  hemokinesis: { id: "hemokinesis", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "loseHp", amount: 2 }, { kind: "damage", amount: 15 }] },
  carve: { id: "carve", type: "attack", cost: 2, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 10 }, { kind: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" }] },
  venomFang: { id: "venomFang", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 7 }, { kind: "applyStatus", status: "poison", amount: 4, target: "enemy" }] },
  whirlwindStrike: { id: "whirlwindStrike", type: "attack", cost: 2, rarity: "uncommon", target: "enemy", aoe: true, effects: [{ kind: "damageAll", amount: 10 }] },
  piercingStab: { id: "piercingStab", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 9 }, { kind: "applyStatus", status: "weak", amount: 1, target: "enemy" }] },
  finishingBlow: { id: "finishingBlow", type: "attack", cost: 2, rarity: "uncommon", target: "enemy", exhaust: true, effects: [{ kind: "damage", amount: 18 }] },
  rampage: { id: "rampage", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 8 }, { kind: "applyStatus", status: "strength", amount: 1, target: "self" }] },
  reboundStrike: { id: "reboundStrike", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 8 }, { kind: "block", amount: 6 }] },
  quake: { id: "quake", type: "attack", cost: 2, rarity: "uncommon", target: "enemy", aoe: true, effects: [{ kind: "damageAll", amount: 6 }, { kind: "applyStatusAll", status: "vulnerable", amount: 1 }] },
  ironFist: { id: "ironFist", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 10 }] },
  riptide: { id: "riptide", type: "attack", cost: 1, rarity: "uncommon", target: "enemy", effects: [{ kind: "damage", amount: 6 }, { kind: "applyStatus", status: "poison", amount: 3, target: "enemy" }] },
  // ── Uncommon skills ──
  dodgeAndRoll: { id: "dodgeAndRoll", type: "skill", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "block", amount: 8 }, { kind: "draw", amount: 1 }] },
  ironWall: { id: "ironWall", type: "skill", cost: 2, rarity: "uncommon", target: "self", effects: [{ kind: "block", amount: 18 }] },
  secondWind: { id: "secondWind", type: "skill", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "block", amount: 10 }, { kind: "draw", amount: 1 }] },
  escapePlan: { id: "escapePlan", type: "skill", cost: 0, rarity: "uncommon", target: "self", effects: [{ kind: "block", amount: 4 }, { kind: "draw", amount: 1 }] },
  disarm: { id: "disarm", type: "skill", cost: 1, rarity: "uncommon", target: "enemy", aoe: true, exhaust: true, effects: [{ kind: "applyStatusAll", status: "weak", amount: 2 }] },
  terrify: { id: "terrify", type: "skill", cost: 1, rarity: "uncommon", target: "enemy", aoe: true, exhaust: true, effects: [{ kind: "applyStatusAll", status: "vulnerable", amount: 2 }] },
  enfeeble: { id: "enfeeble", type: "skill", cost: 1, rarity: "uncommon", target: "enemy", aoe: true, effects: [{ kind: "applyStatusAll", status: "frail", amount: 2 }] },
  adrenaline: { id: "adrenaline", type: "skill", cost: 1, rarity: "uncommon", target: "self", exhaust: true, effects: [{ kind: "gainEnergy", amount: 1 }, { kind: "draw", amount: 2 }] },
  cleanse: { id: "cleanse", type: "skill", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "heal", amount: 12 }] },
  foresight: { id: "foresight", type: "skill", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "draw", amount: 2 }, { kind: "applyStatus", status: "dexterity", amount: 1, target: "self" }] },
  // ── Uncommon powers ──
  metallize: { id: "metallize", type: "power", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "applyStatus", status: "metallicize", amount: 3, target: "self" }] },
  regrowth: { id: "regrowth", type: "power", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "applyStatus", status: "regeneration", amount: 4, target: "self" }] },
  berserkStance: { id: "berserkStance", type: "power", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }] },
  evasion: { id: "evasion", type: "power", cost: 1, rarity: "uncommon", target: "self", effects: [{ kind: "applyStatus", status: "dexterity", amount: 2, target: "self" }] },

  // ── Rare attacks ──
  hammerOfFury: { id: "hammerOfFury", type: "attack", cost: 2, rarity: "rare", target: "enemy", effects: [{ kind: "damage", amount: 10 }, { kind: "damage", amount: 10 }] },
  handOfGreed: { id: "handOfGreed", type: "attack", cost: 2, rarity: "rare", target: "enemy", exhaust: true, effects: [{ kind: "damage", amount: 20 }] },
  obliterate: { id: "obliterate", type: "attack", cost: 3, rarity: "rare", target: "enemy", aoe: true, exhaust: true, effects: [{ kind: "damageAll", amount: 20 }] },
  vampiricStrike: { id: "vampiricStrike", type: "attack", cost: 2, rarity: "rare", target: "enemy", effects: [{ kind: "damage", amount: 14 }, { kind: "heal", amount: 8 }] },
  executioner: { id: "executioner", type: "attack", cost: 2, rarity: "rare", target: "enemy", exhaust: true, effects: [{ kind: "damage", amount: 22 }] },
  titanicBlow: { id: "titanicBlow", type: "attack", cost: 3, rarity: "rare", target: "enemy", exhaust: true, effects: [{ kind: "damage", amount: 30 }] },
  // ── Rare skills ──
  fortress: { id: "fortress", type: "skill", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "block", amount: 25 }] },
  lastStand: { id: "lastStand", type: "skill", cost: 1, rarity: "rare", target: "self", effects: [{ kind: "block", amount: 15 }, { kind: "draw", amount: 2 }] },
  panacea: { id: "panacea", type: "skill", cost: 0, rarity: "rare", target: "self", exhaust: true, effects: [{ kind: "heal", amount: 20 }] },
  massParalysis: { id: "massParalysis", type: "skill", cost: 2, rarity: "rare", target: "enemy", aoe: true, exhaust: true, effects: [{ kind: "applyStatusAll", status: "weak", amount: 3 }, { kind: "applyStatusAll", status: "vulnerable", amount: 3 }] },
  transcend: { id: "transcend", type: "skill", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "block", amount: 10 }, { kind: "draw", amount: 3 }] },
  divineShield: { id: "divineShield", type: "skill", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "block", amount: 20 }, { kind: "applyStatus", status: "regeneration", amount: 3, target: "self" }] },
  // ── Rare powers ──
  bloodlust: { id: "bloodlust", type: "power", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "applyStatus", status: "strength", amount: 3, target: "self" }] },
  ironwood: { id: "ironwood", type: "power", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "applyStatus", status: "metallicize", amount: 5, target: "self" }] },
  phoenix: { id: "phoenix", type: "power", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "applyStatus", status: "regeneration", amount: 6, target: "self" }] },
  ascension: { id: "ascension", type: "power", cost: 2, rarity: "rare", target: "self", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }, { kind: "applyStatus", status: "dexterity", amount: 2, target: "self" }] },

  // ── Upgraded (`+`) versions ──
  // Convention: an upgraded card has id `<base>Plus`. `upgradedId()` finds it,
  // so base cards need no extra field. Upgrades have no further upgrade.
  strikePlus: { id: "strikePlus", type: "attack", cost: 1, target: "enemy", effects: [{ kind: "damage", amount: 9 }] },
  defendPlus: { id: "defendPlus", type: "skill", cost: 1, target: "self", effects: [{ kind: "block", amount: 8 }] },
  bashPlus: {
    id: "bashPlus",
    type: "attack",
    cost: 2,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 10 },
      { kind: "applyStatus", status: "vulnerable", amount: 3, target: "enemy" },
    ],
  },
  pommelStrikePlus: {
    id: "pommelStrikePlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 10 },
      { kind: "draw", amount: 2 },
    ],
  },
  poisonStabPlus: {
    id: "poisonStabPlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 7 },
      { kind: "applyStatus", status: "poison", amount: 4, target: "enemy" },
    ],
  },
  cleavePlus: {
    id: "cleavePlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    aoe: true,
    effects: [{ kind: "damageAll", amount: 11 }],
  },
  inflamePlus: {
    id: "inflamePlus",
    type: "power",
    cost: 1,
    target: "self",
    effects: [{ kind: "applyStatus", status: "strength", amount: 3, target: "self" }],
  },
  demonFormPlus: {
    id: "demonFormPlus",
    type: "power",
    cost: 3,
    target: "self",
    effects: [{ kind: "applyStatus", status: "demonForm", amount: 3, target: "self" }],
  },
  ironWavePlus: {
    id: "ironWavePlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "block", amount: 7 },
      { kind: "damage", amount: 7 },
    ],
  },
  twinStrikePlus: {
    id: "twinStrikePlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 7 },
      { kind: "damage", amount: 7 },
    ],
  },
  clotheslinePlus: {
    id: "clotheslinePlus",
    type: "attack",
    cost: 2,
    target: "enemy",
    effects: [
      { kind: "damage", amount: 12 },
      { kind: "applyStatus", status: "weak", amount: 3, target: "enemy" },
    ],
  },
  shrugItOffPlus: {
    id: "shrugItOffPlus",
    type: "skill",
    cost: 1,
    target: "self",
    effects: [
      { kind: "block", amount: 11 },
      { kind: "draw", amount: 1 },
    ],
  },
  warCryPlus: {
    id: "warCryPlus",
    type: "skill",
    cost: 0,
    target: "self",
    innate: true,
    exhaust: true,
    effects: [{ kind: "draw", amount: 3 }],
  },
  steadyGuardPlus: {
    id: "steadyGuardPlus",
    type: "skill",
    cost: 1,
    target: "self",
    retain: true,
    effects: [{ kind: "block", amount: 9 }],
  },
  phantomStrikePlus: {
    id: "phantomStrikePlus",
    type: "attack",
    cost: 1,
    target: "enemy",
    ethereal: true,
    effects: [{ kind: "damage", amount: 14 }],
  },
};

export function getCardDef(id: string): CardDef {
  const def = CARD_DEFS[id];
  if (!def) throw new Error(`Unknown card def: ${id}`);
  return def;
}

/** The upgraded variant of a card, or undefined if it has none / is already `+`. */
export function upgradedId(defId: string): string | undefined {
  const up = `${defId}Plus`;
  return CARD_DEFS[up] ? up : undefined;
}

/** The Ironclad-style starting deck: 5 Strike, 4 Defend, 1 Bash. */
export const STARTER_DECK: string[] = [
  ...Array(5).fill("strike"),
  ...Array(4).fill("defend"),
  "bash",
];

/** A showcase deck used by the playable UI so all mechanics are visible
 *  (poison, AoE, powers). The canonical balance baseline stays STARTER_DECK. */
export const DEMO_DECK: string[] = [
  ...Array(4).fill("strike"),
  ...Array(3).fill("defend"),
  "bash",
  "poisonStab",
  "cleave",
  "warCry",
  "steadyGuard",
  "phantomStrike",
];

// ── Rarity ──
// Most cards declare `rarity` on their CardDef. This map is a fallback for the
// original cards that predate that field. Upgraded (`+`) variants inherit base.
const CARD_RARITY: Record<string, CardRarity> = {
  strike: "starter",
  defend: "starter",
  bash: "starter",
  // common
  pommelStrike: "common",
  ironWave: "common",
  twinStrike: "common",
  shrugItOff: "common",
  quickSlash: "common",
  footwork: "common",
  thunderclap: "common",
  // uncommon
  poisonStab: "uncommon",
  cleave: "uncommon",
  clothesline: "uncommon",
  steadyGuard: "uncommon",
  warCry: "uncommon",
  uppercut: "uncommon",
  battleTrance: "uncommon",
  seeingRed: "uncommon",
  // rare
  inflame: "rare",
  demonForm: "rare",
  phantomStrike: "rare",
  impervious: "rare",
  reaper: "rare",
  offering: "rare",
};

export function rarityOf(id: string): CardRarity {
  const base = id.endsWith("Plus") ? id.slice(0, -4) : id;
  return CARD_DEFS[base]?.rarity ?? CARD_RARITY[base] ?? "common";
}

/** Non-starter, non-upgraded card ids of a rarity (for rewards/shop). */
export function cardsByRarity(rarity: CardRarity): string[] {
  return Object.keys(CARD_DEFS).filter((id) => !id.endsWith("Plus") && rarityOf(id) === rarity);
}

/** All obtainable (non-starter, non-upgraded) cards — the shop's stock pool. */
export const REWARD_POOL: string[] = Object.keys(CARD_DEFS).filter(
  (id) => !id.endsWith("Plus") && rarityOf(id) !== "starter",
);
