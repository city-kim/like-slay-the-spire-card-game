// Relic system, built on the pure-handler pattern. Relics subscribe to combat
// EVENTS rather than turn boundaries. Each relic registers pure handlers in
// RELIC_DEFS; the reducer emits events via the relicOn* dispatchers below.
// Adding a relic is data-only — no reducer changes.

import type { CardDef, CombatantRef, GameState, RelicId, StatusId } from "./types";
import { addStatusTo, damageCombatant, drawCards, healCombatant } from "./internal";
import type { RNG } from "./rng";

const P: CombatantRef = { side: "player" };

// ── Effect helpers (pure; return new state) ──
const block = (s: GameState, n: number): GameState => ({ ...s, player: { ...s.player, block: s.player.block + n } });
const energy = (s: GameState, n: number): GameState => ({ ...s, player: { ...s.player, energy: s.player.energy + n } });
const buff = (s: GameState, status: StatusId, n: number): GameState => addStatusTo(s, P, status, n);
const heal = (s: GameState, n: number): GameState => healCombatant(s, P, n);
function dmgAll(s: GameState, n: number): GameState {
  let next = s;
  s.enemies.forEach((e, i) => {
    if (e.hp > 0) next = damageCombatant(next, { side: "enemy", index: i }, n);
  });
  return next;
}
function debuffAll(s: GameState, status: StatusId, n: number): GameState {
  let next = s;
  s.enemies.forEach((e, i) => {
    if (e.hp > 0) next = addStatusTo(next, { side: "enemy", index: i }, status, n);
  });
  return next;
}

/** Bumps a per-combat counter and reports whether it hit a multiple of n. */
function tick(s: GameState, key: string, n: number): { state: GameState; hit: boolean } {
  const count = (s.relicCounters[key] ?? 0) + 1;
  return { state: { ...s, relicCounters: { ...s.relicCounters, [key]: count } }, hit: count % n === 0 };
}

interface RelicBehavior {
  onCombatStart?: (s: GameState, rng: RNG) => GameState;
  onPlayerTurnStart?: (s: GameState, rng: RNG) => GameState;
  onPlayerTurnEnd?: (s: GameState, rng: RNG) => GameState;
  onCardPlayed?: (s: GameState, card: CardDef, rng: RNG) => GameState;
}

/** A relic that triggers every Nth played card matching `type`. */
function onNth(id: RelicId, type: CardDef["type"] | "any", n: number, effect: (s: GameState) => GameState): RelicBehavior {
  return {
    onCardPlayed: (s, card) => {
      if (type !== "any" && card.type !== type) return s;
      const { state, hit } = tick(s, id, n);
      return hit ? effect(state) : state;
    },
  };
}

export const RELIC_DEFS: Record<RelicId, RelicBehavior> = {
  // ── originals ──
  anchor: { onCombatStart: (s) => block(s, 10) },
  vajra: { onCombatStart: (s) => buff(s, "strength", 1) },
  bagOfMarbles: { onCombatStart: (s) => debuffAll(s, "vulnerable", 1) },
  shuriken: onNth("shuriken", "attack", 3, (s) => buff(s, "strength", 1)),
  mercuryHourglass: { onPlayerTurnStart: (s) => dmgAll(s, 3) },

  // ── combat-start self buffs ──
  oddlySmoothStone: { onCombatStart: (s) => buff(s, "dexterity", 1) },
  girya: { onCombatStart: (s) => buff(s, "strength", 2) },
  lantern: { onCombatStart: (s) => energy(s, 1) },
  ancientTeaSet: { onCombatStart: (s) => energy(s, 2) },
  bagOfPreparation: { onCombatStart: (s, rng) => drawCards(s, 2, rng) },
  ringOfSerpent: { onCombatStart: (s, rng) => drawCards(s, 1, rng) },
  bloodVial: { onCombatStart: (s) => heal(s, 4) },
  cleric: { onCombatStart: (s) => heal(s, 12) },
  toughBracers: { onCombatStart: (s) => block(s, 6) },
  ironShell: { onCombatStart: (s) => buff(s, "metallicize", 2) },
  herbalSalve: { onCombatStart: (s) => buff(s, "regeneration", 2) },
  crystalBall: { onCombatStart: (s) => buff(s, "dexterity", 2) },
  titanShield: { onCombatStart: (s) => block(s, 14) },
  warpedTongs: { onCombatStart: (s) => buff(buff(s, "strength", 1), "dexterity", 1) },
  fossilizedHelix: { onCombatStart: (s) => block(s, 20) },
  brimstone: { onCombatStart: (s) => buff(s, "strength", 3) },

  // ── combat-start enemy debuffs ──
  redMask: { onCombatStart: (s) => debuffAll(s, "weak", 1) },
  frostShard: { onCombatStart: (s) => debuffAll(s, "frail", 1) },
  snakeRing: { onCombatStart: (s) => debuffAll(s, "vulnerable", 2) },
  toxicVial: { onCombatStart: (s) => debuffAll(s, "poison", 3) },
  cursedTotem: { onCombatStart: (s) => debuffAll(s, "weak", 2) },
  hexStone: { onCombatStart: (s) => debuffAll(debuffAll(s, "vulnerable", 1), "weak", 1) },
  plagueBell: { onCombatStart: (s) => debuffAll(s, "poison", 5) },

  // ── each turn start ──
  incenseBurner: { onPlayerTurnStart: (s) => block(s, 3) },
  magicFlower: { onPlayerTurnStart: (s) => heal(s, 3) },
  stormCloud: { onPlayerTurnStart: (s) => dmgAll(s, 3) },
  enchiridion: { onPlayerTurnStart: (s, rng) => drawCards(s, 1, rng) },
  windChime: { onPlayerTurnStart: (s) => block(s, 4) },
  vampiricIdol: { onPlayerTurnStart: (s) => heal(s, 2) },
  frostbiteCharm: { onPlayerTurnStart: (s) => debuffAll(s, "frail", 1) },
  emberCore: { onPlayerTurnStart: (s) => dmgAll(s, 4) },
  coffeeDripper: { onPlayerTurnStart: (s) => energy(s, 1) },
  prayerBeads: { onPlayerTurnStart: (s) => block(heal(s, 1), 1) },
  spectralArmor: { onPlayerTurnStart: (s) => block(s, 5) },

  // ── each turn end ──
  plateArmor: { onPlayerTurnEnd: (s) => block(s, 4) },
  nightDew: { onPlayerTurnEnd: (s) => heal(s, 2) },
  caltrops: { onPlayerTurnEnd: (s) => dmgAll(s, 3) },
  stoneskin: { onPlayerTurnEnd: (s) => block(s, 6) },
  emberShield: { onPlayerTurnEnd: (s) => debuffAll(s, "weak", 1) },
  moonstone: { onPlayerTurnEnd: (s) => heal(s, 3) },
  ironwoodIdol: { onPlayerTurnEnd: (s) => block(s, 5) },

  // ── on card played (counters) ──
  kunai: onNth("kunai", "attack", 3, (s) => buff(s, "dexterity", 1)),
  ornamentalFan: onNth("ornamentalFan", "attack", 3, (s) => block(s, 4)),
  letterOpener: onNth("letterOpener", "skill", 3, (s) => dmgAll(s, 3)),
  inkBottle: { onCardPlayed: (s, _c, rng) => { const { state, hit } = tick(s, "inkBottle", 10); return hit ? drawCards(state, 1, rng) : state; } },
  nunchaku: onNth("nunchaku", "attack", 10, (s) => energy(s, 1)),
  toxicGland: onNth("toxicGland", "attack", 3, (s) => debuffAll(s, "poison", 2)),
  pocketwatch: onNth("pocketwatch", "any", 3, (s) => block(s, 2)),
  wristblade: onNth("wristblade", "attack", 5, (s) => dmgAll(s, 5)),
  chronometer: onNth("chronometer", "any", 5, (s) => energy(s, 1)),
};

// ── Event dispatchers — walk the player's relics in order, threading state. ──

function emit(state: GameState, pick: (b: RelicBehavior) => ((s: GameState) => GameState) | undefined): GameState {
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
export function relicOnPlayerTurnEnd(state: GameState, rng: RNG): GameState {
  return emit(state, (b) => b.onPlayerTurnEnd && ((s) => b.onPlayerTurnEnd!(s, rng)));
}
export function relicOnCardPlayed(state: GameState, card: CardDef, rng: RNG): GameState {
  return emit(state, (b) => b.onCardPlayed && ((s) => b.onCardPlayed!(s, card, rng)));
}

/** All relic ids (runtime list), e.g. for treasure-node relic rolls. */
export const ALL_RELIC_IDS = Object.keys(RELIC_DEFS) as RelicId[];
