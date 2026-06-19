// The "run" layer sits above the pure combat engine. A run is a sequence of
// map nodes (combats, rests, treasures, a boss) that carry the player's HP,
// gold, deck, and relics forward. Combat itself is delegated to the engine's
// reducer; the run reducer owns everything between fights.
//
// Like the engine, the run is a pure reducer: runReduce(run, action, rng).

import type { GameAction, GameState, PotionId, RelicId } from "../engine";

export type NodeType = "combat" | "elite" | "rest" | "treasure" | "shop" | "event" | "boss";

export interface MapNode {
  id: string;
  type: NodeType;
  row: number;
  col: number;
}

/** A layered map: the player advances one row at a time, picking any node in
 *  the next row (consecutive rows are fully connected). */
export interface RunMap {
  rows: MapNode[][];
}

export type RunPhase = "map" | "combat" | "reward" | "rest" | "shop" | "event" | "gameOver" | "victory";

/** The active "?" event while phase === "event". */
export interface EventState {
  id: string;
}

export interface RunPlayer {
  hp: number;
  maxHp: number;
  gold: number;
  /** Card def ids making up the deck (the master list carried between fights). */
  deck: string[];
  relics: RelicId[];
  /** Held consumables, capped at MAX_POTIONS slots. */
  potions: PotionId[];
}

/** Cards/gold offered after winning a (non-boss) fight. */
export interface RewardState {
  cards: string[];
  gold: number;
  /** A potion drop, granted (if there's a free slot) when leaving the reward. */
  potion: PotionId | null;
}

export interface ShopCard {
  id: string;
  price: number;
  sold: boolean;
}
export interface ShopRelic {
  id: RelicId;
  price: number;
  sold: boolean;
}
/** A shop's stock; generated when the player enters the node. */
export interface ShopPotion {
  id: PotionId;
  price: number;
  sold: boolean;
}
export interface ShopState {
  cards: ShopCard[];
  relics: ShopRelic[];
  potions: ShopPotion[];
  removePrice: number;
  removeUsed: boolean;
}

/** A transient message shown on the map after a rest/treasure node. */
export interface Notice {
  key: string;
  params?: Record<string, string | number | { tkey: string }>;
}

export interface RunState {
  seed: number;
  /** Chosen character id (drives the combat portrait, etc.). */
  character?: string;
  /** Difficulty / ascension level — escalates each cleared run (endless). */
  difficulty: number;
  map: RunMap;
  /** Row the player currently sits on (-1 before the first pick). */
  currentRow: number;
  currentNodeId: string | null;
  visited: string[];
  player: RunPlayer;
  phase: RunPhase;
  /** Active combat state while phase === "combat", else null. */
  combat: GameState | null;
  reward: RewardState | null;
  shop: ShopState | null;
  event: EventState | null;
  notice: Notice | null;
}

export type RunAction =
  | { type: "selectNode"; nodeId: string }
  | { type: "combat"; action: GameAction }
  | { type: "chooseReward"; cardId: string | null }
  | { type: "takeRewardPotion" }
  | { type: "restHeal" }
  | { type: "restUpgrade"; cardIndex: number }
  | { type: "buyShopCard"; index: number }
  | { type: "buyShopRelic"; index: number }
  | { type: "buyShopPotion"; index: number }
  | { type: "removeCard"; cardIndex: number }
  | { type: "leaveShop" }
  | { type: "usePotion"; slot: number }
  | { type: "chooseEventOption"; index: number };
