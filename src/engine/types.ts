// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for the combat engine.
// The engine is pure: no DOM, no React, no randomness baked into the types.
// ─────────────────────────────────────────────────────────────────────────────

import type { RNG } from "./rng";

export type CardType = "attack" | "skill" | "power";
export type TargetType = "enemy" | "self" | "none";
export type CardRarity = "starter" | "common" | "uncommon" | "rare";

/** Which side of combat a thing belongs to. */
export type Side = "player" | "enemy";

/** A pointer to a specific combatant in the current state. */
export type CombatantRef = { side: "player" } | { side: "enemy"; index: number };

/**
 * Status effects (a.k.a. "powers") that can be stacked on any combatant.
 * Some are pure modifiers resolved during damage math (strength/weak/...);
 * others have lifecycle behaviors registered in `triggers.ts` (poison ticks,
 * demonForm grants strength) and/or decay each turn (vulnerable/weak).
 */
export type StatusId =
  | "vulnerable" // takes +50% attack damage; decays each turn
  | "weak" // deals -25% attack damage; decays each turn
  | "frail" // gains -25% block; decays each turn
  | "strength" // +N damage per attack hit
  | "dexterity" // +N block from skills
  | "poison" // at owner's turn start: take N damage (ignores block), then N-1
  | "demonForm" // at owner's turn start: gain N Strength (a "power")
  | "metallicize" // at owner's turn end: gain N Block (a "power")
  | "regeneration"; // at owner's turn start: heal N, then N-1

export type Statuses = Partial<Record<StatusId, number>>;

/** A single primitive effect a card or enemy can apply when resolved. */
export type Effect =
  | { kind: "damage"; amount: number }
  | { kind: "damageAll"; amount: number } // hits every living enemy (AoE)
  | { kind: "block"; amount: number }
  | { kind: "heal"; amount: number } // restores the player's HP (capped at max)
  | { kind: "loseHp"; amount: number } // self-damage, ignores block
  | { kind: "draw"; amount: number }
  | { kind: "gainEnergy"; amount: number }
  | { kind: "applyStatus"; status: StatusId; amount: number; target: TargetType }
  | { kind: "applyStatusAll"; status: StatusId; amount: number }; // status to all enemies

/**
 * Static card definition (the "template"). Instances reference these by id.
 * Display text (name/description) lives in the i18n locale files, keyed by id
 * (`card.<id>.name`), so the engine stays free of presentation strings.
 */
export interface CardDef {
  id: string;
  type: CardType;
  /** Energy cost. "x" spends ALL current energy; `xEffects` then fire that many
   *  times (e.g. Whirlwind). */
  cost: number | "x";
  target: TargetType;
  /** Card rarity; drives reward weighting. Defaults to "common" if unset. */
  rarity?: CardRarity;
  effects: Effect[];
  /** For cost "x" cards: these effects resolve once per energy spent. */
  xEffects?: Effect[];
  /** When played, this card is removed from the deck for the rest of combat. */
  exhaust?: boolean;
  /** Single-target attacks need a chosen enemy; AoE cards (target "enemy" +
   *  aoe) and self cards resolve immediately without target selection. */
  aoe?: boolean;
  /** Starts the combat already in the opening hand. */
  innate?: boolean;
  /** Kept in hand at end of turn instead of being discarded. */
  retain?: boolean;
  /** If still in hand at end of turn, it is Exhausted instead of discarded. */
  ethereal?: boolean;
}

/** A card instance living in a pile, with a unique uid so duplicates differ. */
export interface CardInstance {
  uid: string;
  defId: string;
}

/**
 * Relics are passive items that subscribe to combat events (combat start, card
 * played, turn start). Behavior lives in `relics.ts`, keyed by id — adding a
 * relic needs no reducer changes.
 */
export type RelicId =
  | "anchor" // combat start: gain 10 Block
  | "vajra" // combat start: gain 1 Strength
  | "bagOfMarbles" // combat start: apply 1 Vulnerable to all enemies
  | "shuriken" // every 3rd Attack played: gain 1 Strength
  | "mercuryHourglass"; // each turn start: deal 3 damage to all enemies

export interface Player {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  statuses: Statuses;
  relics: RelicId[];
}

export interface EnemyMove {
  /** Stable id used for move history / no-repeat AI rules. */
  id: string;
  /** Shown to the player as the telegraphed "intent". */
  intent: "attack" | "defend" | "buff" | "debuff";
  effects: Effect[];
  /** Damage shown on the intent icon (for attack intents). */
  displayDamage?: number;
}

/** Context passed to an enemy's AI when choosing its next move. */
export interface EnemyMoveContext {
  turn: number;
  rng: RNG;
  /** Recent move ids (oldest → newest), for probabilistic / no-repeat AI. */
  history: string[];
}

export interface EnemyDef {
  id: string;
  maxHp: number;
  /** Chooses the next telegraphed move. Pure given the context (incl. rng). */
  pattern: (ctx: EnemyMoveContext) => EnemyMove;
}

export interface Enemy {
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  statuses: Statuses;
  /** The move queued for the enemy's next turn (its telegraphed intent). */
  nextMove: EnemyMove;
  /** Move id history (oldest → newest) used by the AI. */
  history: string[];
}

export type Phase = "player" | "enemy" | "won" | "lost";

/**
 * A combat log entry. The engine never stores localized text — it stores a
 * translation `key` plus `params`. A param can be a literal value or a
 * `{ tkey }` reference to another translation key (e.g. an enemy/card name),
 * which the UI resolves in the active language. This keeps the engine pure of
 * presentation strings.
 */
export type LogParam = string | number | { tkey: string };
export interface LogEntry {
  key: string;
  params?: Record<string, LogParam>;
}

export interface GameState {
  turn: number;
  phase: Phase;
  player: Player;
  enemies: Enemy[];
  drawPile: CardInstance[];
  hand: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];
  /** During the enemy phase, the indices of enemies still waiting to act
   *  (oldest first). Empty outside the enemy phase. Drained by `enemyAct`. */
  enemyQueue: number[];
  /** Per-combat counters keyed by relic/power id (e.g. Shuriken's attack tally). */
  relicCounters: Record<string, number>;
  /** Append-only combat log of translation keys; rendered by the UI in-locale. */
  log: LogEntry[];
}

/** Player-issued actions the reducer understands. */
export type GameAction =
  | { type: "playCard"; uid: string; targetIndex?: number }
  | { type: "endTurn" }
  | { type: "enemyAct" };
