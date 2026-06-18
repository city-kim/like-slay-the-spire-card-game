import {
  type CardInstance,
  type Effect,
  type Enemy,
  type EnemyDef,
  type GameAction,
  type GameState,
  type RelicId,
  type StatusId,
  type TargetType,
} from "./types";
import { getCardDef, STARTER_DECK } from "./cards";
import { getEnemyDef } from "./enemies";
import { makeRng, shuffle, type RNG } from "./rng";
import {
  addStatus,
  applyDamage,
  computeAttackDamage,
  computeBlock,
} from "./internal";
import { applyTurnEndTriggers, applyTurnStartTriggers } from "./triggers";
import { relicOnCardPlayed, relicOnCombatStart, relicOnPlayerTurnStart } from "./relics";

const HAND_SIZE = 5;
const MAX_HAND = 10;
const START_ENERGY = 3;
const START_HP = 80;

let uidCounter = 0;
function makeCardInstance(defId: string): CardInstance {
  return { uid: `c${uidCounter++}`, defId };
}

/** Builds a `{ tkey }` reference to an enemy's localized name. */
function enemyName(defId: string): { tkey: string } {
  return { tkey: `enemy.${defId}.name` };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export interface StartOptions {
  seed?: number;
  deck?: string[];
  enemyIds?: string[];
  maxHp?: number;
  /** Current HP at the start of this combat (defaults to maxHp). Used by the
   *  run layer to carry damage between fights. */
  hp?: number;
  relics?: RelicId[];
}

export function createInitialState(opts: StartOptions = {}): GameState {
  const seed = opts.seed ?? 1;
  const rng = makeRng(seed);
  const maxHp = opts.maxHp ?? START_HP;
  const hp = Math.min(opts.hp ?? maxHp, maxHp);

  const deck = (opts.deck ?? STARTER_DECK).map(makeCardInstance);
  const enemyIds = opts.enemyIds ?? ["jawWorm"];

  // Innate cards open in hand; the rest form the draw pile. (Shuffle first so
  // deck order stays independent of the enemy-AI rng draws below.)
  const shuffled = shuffle(deck, rng);
  const innate = shuffled.filter((c) => getCardDef(c.defId).innate);
  const normal = shuffled.filter((c) => !getCardDef(c.defId).innate);

  const enemies: Enemy[] = enemyIds.map((id) => spawnEnemy(getEnemyDef(id), rng));

  let state: GameState = {
    turn: 0,
    phase: "player",
    player: {
      hp,
      maxHp,
      block: 0,
      energy: START_ENERGY,
      maxEnergy: START_ENERGY,
      statuses: {},
      relics: opts.relics ?? [],
    },
    enemies,
    drawPile: normal,
    hand: innate.slice(0, MAX_HAND),
    discardPile: [],
    exhaustPile: [],
    relicCounters: {},
    log: [{ key: "log.combatStart" }],
  };

  // Combat-start relics, then turn-0 turn-start relics, then fill the hand.
  state = relicOnCombatStart(state, rng);
  state = relicOnPlayerTurnStart(state, rng);
  return drawCards(state, Math.max(0, HAND_SIZE - state.hand.length), rng);
}

function spawnEnemy(def: EnemyDef, rng: RNG): Enemy {
  const firstMove = def.pattern({ turn: 0, rng, history: [] });
  return {
    defId: def.id,
    hp: def.maxHp,
    maxHp: def.maxHp,
    block: 0,
    statuses: {},
    history: [firstMove.id],
    nextMove: firstMove,
  };
}

// ─── Card draw ───────────────────────────────────────────────────────────────

function drawCards(state: GameState, count: number, rng: RNG): GameState {
  let drawPile = state.drawPile.slice();
  let discardPile = state.discardPile.slice();
  const hand = state.hand.slice();
  const log = state.log.slice();

  for (let i = 0; i < count; i++) {
    if (hand.length >= MAX_HAND) break; // hand is full; excess draws are burned
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break; // nothing left to draw
      drawPile = shuffle(discardPile, rng);
      discardPile = [];
      log.push({ key: "log.reshuffle" });
    }
    hand.push(drawPile.shift()!);
  }

  return { ...state, drawPile, discardPile, hand, log };
}

// ─── Effect resolution ───────────────────────────────────────────────────────

function resolveEffects(
  state: GameState,
  effects: Effect[],
  source: "player" | { enemyIndex: number },
  targetIndex: number | undefined,
  rng: RNG,
): GameState {
  let next = state;
  for (const effect of effects) {
    next = resolveEffect(next, effect, source, targetIndex, rng);
  }
  return next;
}

/** Player attack against one enemy index. Returns new state (no-op if dead). */
function playerHitEnemy(state: GameState, idx: number, amount: number): GameState {
  const enemy = state.enemies[idx];
  if (!enemy || enemy.hp <= 0) return state;
  const dmg = computeAttackDamage(amount, state.player.statuses, enemy.statuses);
  const after = applyDamage(enemy.hp, enemy.block, dmg);
  const enemies = state.enemies.slice();
  enemies[idx] = { ...enemy, hp: after.hp, block: after.block };
  return {
    ...state,
    enemies,
    log: [...state.log, { key: "log.youHit", params: { enemy: enemyName(enemy.defId), dmg } }],
  };
}

function resolveEffect(
  state: GameState,
  effect: Effect,
  source: "player" | { enemyIndex: number },
  targetIndex: number | undefined,
  rng: RNG,
): GameState {
  const fromPlayer = source === "player";

  switch (effect.kind) {
    case "damage": {
      if (fromPlayer) {
        return playerHitEnemy(state, targetIndex ?? 0, effect.amount);
      }
      const enemy = state.enemies[source.enemyIndex];
      const dmg = computeAttackDamage(effect.amount, enemy.statuses, state.player.statuses);
      const after = applyDamage(state.player.hp, state.player.block, dmg);
      return {
        ...state,
        player: { ...state.player, hp: after.hp, block: after.block },
        log: [...state.log, { key: "log.enemyHits", params: { enemy: enemyName(enemy.defId), dmg } }],
      };
    }

    case "damageAll": {
      // Player AoE hits every living enemy. (No enemy uses this yet; if one did,
      // it would just strike the single player.)
      if (!fromPlayer) {
        const enemy = state.enemies[source.enemyIndex];
        const dmg = computeAttackDamage(effect.amount, enemy.statuses, state.player.statuses);
        const after = applyDamage(state.player.hp, state.player.block, dmg);
        return { ...state, player: { ...state.player, hp: after.hp, block: after.block } };
      }
      let next = state;
      for (let i = 0; i < state.enemies.length; i++) {
        next = playerHitEnemy(next, i, effect.amount);
      }
      return next;
    }

    case "heal": {
      if (!fromPlayer) return state;
      const hp = Math.min(state.player.maxHp, state.player.hp + effect.amount);
      return { ...state, player: { ...state.player, hp } };
    }

    case "loseHp": {
      if (!fromPlayer) return state;
      return { ...state, player: { ...state.player, hp: Math.max(0, state.player.hp - effect.amount) } };
    }

    case "applyStatusAll": {
      // Player applies a status to every living enemy.
      if (!fromPlayer) return state;
      const enemies = state.enemies.map((e) =>
        e.hp > 0 ? { ...e, statuses: addStatus(e.statuses, effect.status, effect.amount) } : e,
      );
      return { ...state, enemies };
    }

    case "block": {
      if (fromPlayer) {
        const amt = computeBlock(effect.amount, state.player.statuses);
        return { ...state, player: { ...state.player, block: state.player.block + amt } };
      }
      const idx = source.enemyIndex;
      const enemy = state.enemies[idx];
      const enemies = state.enemies.slice();
      enemies[idx] = { ...enemy, block: enemy.block + effect.amount };
      return { ...state, enemies };
    }

    case "draw":
      return fromPlayer ? drawCards(state, effect.amount, rng) : state;

    case "gainEnergy":
      return fromPlayer
        ? { ...state, player: { ...state.player, energy: state.player.energy + effect.amount } }
        : state;

    case "applyStatus":
      return applyStatusEffect(state, effect.status, effect.amount, effect.target, source, targetIndex);
  }
}

function applyStatusEffect(
  state: GameState,
  status: StatusId,
  amount: number,
  target: TargetType,
  source: "player" | { enemyIndex: number },
  targetIndex: number | undefined,
): GameState {
  const fromPlayer = source === "player";
  if (target === "none") return state;

  // "self" lands on the source; "enemy" lands on the source's opponent.
  const onPlayer = target === "self" ? fromPlayer : !fromPlayer;

  if (onPlayer) {
    return { ...state, player: { ...state.player, statuses: addStatus(state.player.statuses, status, amount) } };
  }

  const idx = fromPlayer ? targetIndex ?? 0 : source.enemyIndex;
  const enemy = state.enemies[idx];
  if (!enemy) return state;
  const enemies = state.enemies.slice();
  enemies[idx] = { ...enemy, statuses: addStatus(enemy.statuses, status, amount) };
  return { ...state, enemies };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

/**
 * The single entry point for advancing combat. Pure given (state, action, rng).
 * Always returns a new GameState; never mutates the input.
 */
export function reduce(state: GameState, action: GameAction, rng: RNG): GameState {
  if (state.phase !== "player") return state;

  switch (action.type) {
    case "playCard":
      return playCard(state, action.uid, action.targetIndex, rng);
    case "endTurn":
      return endTurn(state, rng);
  }
}

/**
 * Resolves a list of effects as if the player triggered them (e.g. a potion),
 * outside the card system. Pure; returns a new GameState. Used by the run layer
 * so item effects reuse the same combat resolution as cards.
 */
export function applyPlayerEffects(
  state: GameState,
  effects: Effect[],
  targetIndex: number | undefined,
  rng: RNG,
): GameState {
  if (state.phase !== "player") return state;
  return checkCombatEnd(resolveEffects(state, effects, "player", targetIndex, rng));
}

function playCard(state: GameState, uid: string, targetIndex: number | undefined, rng: RNG): GameState {
  const card = state.hand.find((c) => c.uid === uid);
  if (!card) return state;
  const def = getCardDef(card.defId);

  const cardName = { tkey: `card.${def.id}.name` };
  if (state.player.energy < def.cost) {
    return { ...state, log: [...state.log, { key: "log.notEnoughEnergy", params: { card: cardName } }] };
  }

  // Spend energy and remove the card from hand first.
  let next: GameState = {
    ...state,
    player: { ...state.player, energy: state.player.energy - def.cost },
    hand: state.hand.filter((c) => c.uid !== uid),
    log: [...state.log, { key: "log.playCard", params: { card: cardName } }],
  };

  next = resolveEffects(next, def.effects, "player", targetIndex, rng);

  // Send the spent card to discard or exhaust.
  next = def.exhaust
    ? { ...next, exhaustPile: [...next.exhaustPile, card] }
    : { ...next, discardPile: [...next.discardPile, card] };

  // Relics that react to a card being played (e.g. Shuriken's attack tally).
  next = relicOnCardPlayed(next, def, rng);

  return checkCombatEnd(next);
}

/** The whole enemy phase: turn-start triggers, each enemy acts, turn-end decay.
 *  Returns early (phase "won"/"lost") if combat ends partway through. */
function runEnemyPhase(state: GameState, rng: RNG): GameState {
  // Enemy turn-start triggers (poison ticks, enemy powers) — may end combat.
  let next = checkCombatEnd(applyTurnStartTriggers({ ...state, phase: "enemy" }, "enemy"));
  if (next.phase !== "enemy") return next;

  // Enemies act in order.
  next.enemies.forEach((enemy, idx) => {
    if (enemy.hp <= 0) return;
    next = resolveEffects(next, enemy.nextMove.effects, { enemyIndex: idx }, undefined, rng);
    next = checkCombatEnd(next);
  });
  if (next.phase !== "enemy") return next;

  // Enemy turn-end triggers (decay enemy debuffs, e.g. Vulnerable from Bash).
  return applyTurnEndTriggers(next, "enemy");
}

function endTurn(state: GameState, rng: RNG): GameState {
  // 1. Resolve the leftover hand by keyword: Retain stays, Ethereal exhausts,
  //    everything else is discarded. The player's turn ends.
  const retained: CardInstance[] = [];
  const discarded: CardInstance[] = [];
  const exhausted: CardInstance[] = [];
  for (const card of state.hand) {
    const def = getCardDef(card.defId);
    if (def.ethereal) exhausted.push(card);
    else if (def.retain) retained.push(card);
    else discarded.push(card);
  }
  let next: GameState = {
    ...state,
    hand: retained,
    discardPile: [...state.discardPile, ...discarded],
    exhaustPile: [...state.exhaustPile, ...exhausted],
    log: [...state.log, { key: "log.endOfTurn" }],
  };

  // 2. Player turn-end triggers (decay the player's temporary debuffs).
  next = applyTurnEndTriggers(next, "player");

  // 3. Enemy phase (may end combat).
  next = runEnemyPhase(next, rng);
  if (next.phase !== "enemy") return next;

  // 4. Start the next player turn: bump turn, reset block/energy, telegraph each
  //    enemy's next intent (resetting their block), and draw a fresh hand.
  const turn = next.turn + 1;
  const enemies = next.enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    const move = getEnemyDef(enemy.defId).pattern({ turn, rng, history: enemy.history });
    return { ...enemy, block: 0, nextMove: move, history: [...enemy.history, move.id].slice(-6) };
  });
  next = {
    ...next,
    turn,
    phase: "player",
    enemies,
    player: { ...next.player, block: 0, energy: next.player.maxEnergy },
    log: [...next.log, { key: "log.turnStart", params: { turn: turn + 1 } }],
  };
  next = drawCards(next, HAND_SIZE, rng);

  // 4a. Player turn-start triggers (poison, powers) then turn-start relics
  //     (e.g. Mercury Hourglass) — either may end combat.
  next = applyTurnStartTriggers(next, "player");
  next = relicOnPlayerTurnStart(next, rng);
  return checkCombatEnd(next);
}

function checkCombatEnd(state: GameState): GameState {
  if (state.player.hp <= 0) {
    return { ...state, phase: "lost", log: [...state.log, { key: "log.youDied" }] };
  }
  if (state.enemies.every((e) => e.hp <= 0)) {
    return { ...state, phase: "won", log: [...state.log, { key: "log.victory" }] };
  }
  return state;
}
