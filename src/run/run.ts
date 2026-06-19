import {
  ALL_POTION_IDS,
  ALL_RELIC_IDS,
  applyPlayerEffects,
  cardsByRarity,
  createInitialState,
  getPotionDef,
  makeRng,
  reduce as combatReduce,
  REWARD_POOL,
  STARTER_DECK,
  upgradedId,
  type CardRarity,
  type GameAction,
  type GameState,
  type PotionId,
  type RelicId,
  type RNG,
} from "../engine";
import { generateMap } from "./map";
import { applyRunEffects, EVENT_DEFS, pickEventId } from "./events";
import { getCharacter } from "./characters";
import type { MapNode, NodeType, RunAction, RunState, ShopState } from "./types";

const START_HP = 80;
const REST_HEAL_FRACTION = 0.3;
const MAX_POTIONS = 3;
const POTION_REWARD_NORMAL = 0.35; // potion drop chance after a normal fight
const POTION_REWARD_ELITE = 0.85; // …and after an elite fight

// ─── Setup ───────────────────────────────────────────────────────────────────

export interface RunOptions {
  seed?: number;
  /** Playable character id (sets default deck / maxHp / starting relic). */
  character?: string;
  /** Difficulty / ascension level (endless escalation). Default 0. */
  difficulty?: number;
  deck?: string[];
  maxHp?: number;
  relics?: RelicId[];
  potions?: PotionId[];
  /** If set (and `relics` not given), grant this many random starting relics. */
  randomRelics?: number;
}

// Enemies start at 1.5× HP; each difficulty level adds +15% HP and +1 Strength.
const BASE_ENEMY_HP_MULT = 1.5;
function difficultyMods(difficulty: number) {
  return {
    enemyHpMult: BASE_ENEMY_HP_MULT * (1 + 0.15 * difficulty),
    enemyStrength: difficulty,
  };
}

/** Picks `count` distinct random relics, deterministic per seed. */
function pickStartingRelics(seed: number, count: number): RelicId[] {
  const rng = makeRng(seed * 31 + 7);
  const pool = [...ALL_RELIC_IDS];
  const out: RelicId[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    out.push(pool.splice(rng.int(pool.length), 1)[0]);
  }
  return out;
}

export function createRun(opts: RunOptions = {}): RunState {
  const seed = opts.seed ?? 1;
  const char = opts.character ? getCharacter(opts.character) : undefined;
  const maxHp = opts.maxHp ?? char?.maxHp ?? START_HP;
  const deck = opts.deck ?? char?.deck ?? STARTER_DECK;
  const relics = opts.relics
    ? [...opts.relics]
    : char
      ? [...char.relics]
      : opts.randomRelics
        ? pickStartingRelics(seed, opts.randomRelics)
        : [];
  return {
    seed,
    character: opts.character,
    difficulty: opts.difficulty ?? 0,
    map: generateMap(seed),
    currentRow: -1,
    currentNodeId: null,
    visited: [],
    player: {
      hp: maxHp,
      maxHp,
      gold: 0,
      deck: [...deck],
      relics,
      potions: [...(opts.potions ?? [])].slice(0, MAX_POTIONS),
    },
    phase: "map",
    combat: null,
    reward: null,
    shop: null,
    event: null,
    notice: null,
  };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

/** Pure run-level reducer. Delegates fights to the engine's combat reducer. */
export function runReduce(run: RunState, action: RunAction, rng: RNG): RunState {
  switch (action.type) {
    case "selectNode":
      return selectNode(run, action.nodeId, rng);
    case "combat":
      return combatStep(run, action.action, rng);
    case "chooseReward":
      return chooseReward(run, action.cardId);
    case "takeRewardPotion":
      return takeRewardPotion(run);
    case "restHeal":
      return restHeal(run);
    case "restUpgrade":
      return restUpgrade(run, action.cardIndex);
    case "buyShopCard":
      return buyShopCard(run, action.index);
    case "buyShopRelic":
      return buyShopRelic(run, action.index);
    case "buyShopPotion":
      return buyShopPotion(run, action.index);
    case "removeCard":
      return removeCard(run, action.cardIndex);
    case "leaveShop":
      return run.phase === "shop" ? { ...run, phase: "map", shop: null } : run;
    case "usePotion":
      return usePotion(run, action.slot, rng);
    case "chooseEventOption":
      return chooseEventOption(run, action.index, rng);
  }
}

function chooseEventOption(run: RunState, index: number, rng: RNG): RunState {
  if (run.phase !== "event" || !run.event) return run;
  const def = EVENT_DEFS[run.event.id];
  const choice = def?.choices[index];
  if (!choice) return run;
  let next = applyRunEffects(run, choice.effects, rng);

  // A fight choice starts combat (post-combat reward handled like a normal node).
  if (choice.fight && choice.fight.length > 0 && next.player.hp > 0) {
    return { ...next, event: null, notice: null, phase: "combat", combat: startCombatWith(next, choice.fight, rng) };
  }

  return {
    ...next,
    event: null,
    notice: { key: `event.${def.id}.results.${index}` },
    phase: next.player.hp <= 0 ? "gameOver" : "map",
  };
}

function usePotion(run: RunState, slot: number, rng: RNG): RunState {
  // Potions are used during combat (their effects target the live GameState).
  if (run.phase !== "combat" || !run.combat || run.combat.phase !== "player") return run;
  const potionId = run.player.potions[slot];
  if (!potionId) return run;
  const potions = run.player.potions.slice();
  potions.splice(slot, 1);
  const combat = applyPlayerEffects(run.combat, getPotionDef(potionId).effects, undefined, rng);
  return { ...run, player: { ...run.player, potions }, combat };
}

function findNode(run: RunState, nodeId: string): MapNode | undefined {
  for (const row of run.map.rows) {
    const node = row.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return undefined;
}

function selectNode(run: RunState, nodeId: string, rng: RNG): RunState {
  if (run.phase !== "map") return run;
  const node = findNode(run, nodeId);
  if (!node || node.row !== run.currentRow + 1) return run; // not a legal next pick

  const base: RunState = {
    ...run,
    currentRow: node.row,
    currentNodeId: node.id,
    visited: [...run.visited, node.id],
    notice: null,
  };

  switch (node.type) {
    case "combat":
    case "elite":
    case "boss":
      return { ...base, phase: "combat", combat: buildCombat(base, node.type, rng) };
    case "rest":
      return { ...base, phase: "rest" };
    case "treasure":
      return takeTreasure(base, rng);
    case "shop":
      return { ...base, phase: "shop", shop: buildShop(base, rng) };
    case "event":
      return { ...base, phase: "event", event: { id: pickEventId(rng) } };
  }
}

function buildShop(run: RunState, rng: RNG): ShopState {
  const cardPool = [...REWARD_POOL];
  const cards = [];
  for (let i = 0; i < 3 && cardPool.length > 0; i++) {
    const id = cardPool.splice(rng.int(cardPool.length), 1)[0];
    cards.push({ id, price: 45 + rng.int(31), sold: false }); // 45–75
  }

  const owned = new Set(run.player.relics);
  const relicCandidates = ALL_RELIC_IDS.filter((id) => !owned.has(id));
  const relics = relicCandidates.length
    ? [{ id: relicCandidates[rng.int(relicCandidates.length)], price: 140 + rng.int(61), sold: false }] // 140–200
    : [];

  const potionPool = [...ALL_POTION_IDS];
  const potions = [];
  for (let i = 0; i < 2 && potionPool.length > 0; i++) {
    const id = potionPool.splice(rng.int(potionPool.length), 1)[0];
    potions.push({ id, price: 30 + rng.int(21), sold: false }); // 30–50
  }

  return { cards, relics, potions, removePrice: 60 + rng.int(21), removeUsed: false }; // 60–80
}

function buyShopPotion(run: RunState, index: number): RunState {
  if (run.phase !== "shop" || !run.shop) return run;
  const potion = run.shop.potions[index];
  if (!potion || potion.sold || run.player.gold < potion.price) return run;
  if (run.player.potions.length >= MAX_POTIONS) return run; // no free slot
  const potions = run.shop.potions.slice();
  potions[index] = { ...potion, sold: true };
  return {
    ...run,
    player: { ...run.player, gold: run.player.gold - potion.price, potions: [...run.player.potions, potion.id] },
    shop: { ...run.shop, potions },
  };
}

function buyShopCard(run: RunState, index: number): RunState {
  if (run.phase !== "shop" || !run.shop) return run;
  const card = run.shop.cards[index];
  if (!card || card.sold || run.player.gold < card.price) return run;
  const cards = run.shop.cards.slice();
  cards[index] = { ...card, sold: true };
  return {
    ...run,
    player: { ...run.player, gold: run.player.gold - card.price, deck: [...run.player.deck, card.id] },
    shop: { ...run.shop, cards },
  };
}

function buyShopRelic(run: RunState, index: number): RunState {
  if (run.phase !== "shop" || !run.shop) return run;
  const relic = run.shop.relics[index];
  if (!relic || relic.sold || run.player.gold < relic.price) return run;
  const relics = run.shop.relics.slice();
  relics[index] = { ...relic, sold: true };
  return {
    ...run,
    player: { ...run.player, gold: run.player.gold - relic.price, relics: [...run.player.relics, relic.id] },
    shop: { ...run.shop, relics },
  };
}

function removeCard(run: RunState, cardIndex: number): RunState {
  if (run.phase !== "shop" || !run.shop || run.shop.removeUsed) return run;
  if (run.player.gold < run.shop.removePrice || run.player.deck.length <= 1) return run;
  if (cardIndex < 0 || cardIndex >= run.player.deck.length) return run;
  const deck = run.player.deck.slice();
  deck.splice(cardIndex, 1);
  return {
    ...run,
    player: { ...run.player, gold: run.player.gold - run.shop.removePrice, deck },
    shop: { ...run.shop, removeUsed: true },
  };
}

function buildCombat(run: RunState, type: NodeType, rng: RNG): GameState {
  return startCombatWith(run, pickEnemies(type, rng), rng);
}

/** Builds a combat against a specific enemy list (carrying the run's loadout
 *  and applying difficulty scaling to the enemies). */
function startCombatWith(run: RunState, enemyIds: string[], rng: RNG): GameState {
  return createInitialState({
    seed: rng.int(1_000_000) + 1,
    deck: run.player.deck,
    enemyIds,
    maxHp: run.player.maxHp,
    hp: run.player.hp,
    relics: run.player.relics,
    ...difficultyMods(run.difficulty),
  });
}

function pickEnemies(type: NodeType, rng: RNG): string[] {
  if (type === "boss") {
    const bosses = [["theGuardian"], ["slimeKing"]];
    return bosses[rng.int(bosses.length)];
  }
  if (type === "elite") {
    const elites = [["cultist", "jawWorm"], ["stoneGolem"], ["acidSlime", "batSwarm"], ["looter", "looter", "looter"]];
    return elites[rng.int(elites.length)];
  }
  const combos = [
    ["jawWorm"],
    ["cultist"],
    ["spikeSlime", "spikeSlime"],
    ["spikeSlime", "jawWorm"],
    ["redLouse", "redLouse"],
    ["fungiBeast", "redLouse"],
    ["fungiBeast"],
    ["acidSlime"],
    ["batSwarm", "batSwarm"],
    ["goblin", "goblin"],
    ["madDog", "madDog", "madDog"],
    ["looter", "goblin"],
    ["acidSlime", "redLouse"],
  ];
  return combos[rng.int(combos.length)];
}

function restHeal(run: RunState): RunState {
  if (run.phase !== "rest") return run;
  const heal = Math.floor(run.player.maxHp * REST_HEAL_FRACTION);
  const hp = Math.min(run.player.maxHp, run.player.hp + heal);
  return {
    ...run,
    phase: "map",
    player: { ...run.player, hp },
    notice: { key: "notice.rested", params: { hp: hp - run.player.hp } },
  };
}

function restUpgrade(run: RunState, cardIndex: number): RunState {
  if (run.phase !== "rest") return run;
  const cardId = run.player.deck[cardIndex];
  const upgraded = cardId ? upgradedId(cardId) : undefined;
  if (!upgraded) return run; // not upgradeable; ignore
  const deck = run.player.deck.slice();
  deck[cardIndex] = upgraded;
  return {
    ...run,
    phase: "map",
    player: { ...run.player, deck },
    notice: { key: "notice.upgraded", params: { card: { tkey: `card.${upgraded}.name` } } },
  };
}

function takeTreasure(run: RunState, rng: RNG): RunState {
  const owned = new Set(run.player.relics);
  const candidates = ALL_RELIC_IDS.filter((id) => !owned.has(id));
  if (candidates.length === 0) {
    const gold = 25;
    return {
      ...run,
      player: { ...run.player, gold: run.player.gold + gold },
      notice: { key: "notice.treasureGold", params: { gold } },
    };
  }
  const relic = candidates[rng.int(candidates.length)];
  return {
    ...run,
    player: { ...run.player, relics: [...run.player.relics, relic] },
    notice: { key: "notice.treasure", params: { relic: { tkey: `relic.${relic}.name` } } },
  };
}

function combatStep(run: RunState, action: GameAction, rng: RNG): RunState {
  if (run.phase !== "combat" || !run.combat) return run;
  const combat = combatReduce(run.combat, action, rng);
  const node = run.currentNodeId ? findNode(run, run.currentNodeId) : undefined;

  if (combat.phase === "won") {
    const player = { ...run.player, hp: combat.player.hp };
    if (node?.type === "boss") {
      return { ...run, combat: null, player, phase: "victory" };
    }
    const gold = 10 + rng.int(11); // 10–20
    // Potion drop chance: low after a normal fight, high after an elite.
    const chance = node?.type === "elite" ? POTION_REWARD_ELITE : POTION_REWARD_NORMAL;
    const potion = rng.next() < chance ? ALL_POTION_IDS[rng.int(ALL_POTION_IDS.length)] : null;
    return {
      ...run,
      combat: null,
      player: { ...player, gold: player.gold + gold },
      reward: { cards: rollRewardCards(rng), gold, potion },
      phase: "reward",
    };
  }

  if (combat.phase === "lost") {
    return { ...run, combat: null, player: { ...run.player, hp: 0 }, phase: "gameOver" };
  }

  return { ...run, combat };
}

function rollRarity(rng: RNG): CardRarity {
  const r = rng.next();
  return r < 0.6 ? "common" : r < 0.9 ? "uncommon" : "rare";
}

/** Three distinct reward cards, each drawn from a rarity-weighted roll. */
function rollRewardCards(rng: RNG): string[] {
  const picks = new Set<string>();
  let guard = 0;
  while (picks.size < 3 && guard++ < 50) {
    const pool = cardsByRarity(rollRarity(rng));
    if (pool.length > 0) picks.add(pool[rng.int(pool.length)]);
  }
  return [...picks];
}

function chooseReward(run: RunState, cardId: string | null): RunState {
  if (run.phase !== "reward") return run;
  // The card is optional; the potion (if any) must be claimed separately via
  // takeRewardPotion before leaving — unclaimed potions are forfeited.
  const deck = cardId ? [...run.player.deck, cardId] : run.player.deck;
  return { ...run, player: { ...run.player, deck }, reward: null, phase: "map" };
}

function takeRewardPotion(run: RunState): RunState {
  if (run.phase !== "reward" || !run.reward?.potion) return run;
  if (run.player.potions.length >= MAX_POTIONS) return run; // no free slot
  return {
    ...run,
    player: { ...run.player, potions: [...run.player.potions, run.reward.potion] },
    reward: { ...run.reward, potion: null },
  };
}
