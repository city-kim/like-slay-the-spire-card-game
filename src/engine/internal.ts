// Low-level pure helpers shared by the reducer (combat.ts) and the trigger bus
// (triggers.ts). Extracted into their own module so those two can both depend
// on these without importing each other (no cycle). Everything here is pure and
// immutable: functions return new state/values and never mutate inputs.

import type { CombatantRef, GameState, Side, Statuses, StatusId } from "./types";
import { shuffle, type RNG } from "./rng";

export const MAX_HAND = 10;

/** Draws `count` cards (reshuffling discard if needed), capped at MAX_HAND.
 *  Shared by the reducer and relics so both can draw. */
export function drawCards(state: GameState, count: number, rng: RNG): GameState {
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

/** Add `amount` to a status, clamping at 0 (a stack reaching 0 is removed). */
export function addStatus(statuses: Statuses, id: StatusId, amount: number): Statuses {
  const next = { ...statuses };
  next[id] = (next[id] ?? 0) + amount;
  if ((next[id] ?? 0) <= 0) delete next[id];
  return next;
}

/** Attack damage after the attacker's Strength/Weak and the target's Vulnerable. */
export function computeAttackDamage(base: number, attacker: Statuses, target: Statuses): number {
  let dmg = base + (attacker.strength ?? 0);
  if (attacker.weak) dmg = Math.floor(dmg * 0.75);
  if (target.vulnerable) dmg = Math.floor(dmg * 1.5);
  return Math.max(0, dmg);
}

/** Block gained after Dexterity (additive) and Frail (-25%). */
export function computeBlock(base: number, statuses: Statuses): number {
  let block = base + (statuses.dexterity ?? 0);
  if (statuses.frail) block = Math.floor(block * 0.75);
  return Math.max(0, block);
}

/** Apply raw damage to a hp/block pair: block soaks first, remainder hits hp. */
export function applyDamage(hp: number, block: number, dmg: number): { hp: number; block: number } {
  const absorbed = Math.min(block, dmg);
  return { hp: hp - (dmg - absorbed), block: block - absorbed };
}

// ─── Combatant-ref accessors ─────────────────────────────────────────────────

export function listSideRefs(state: GameState, side: Side): CombatantRef[] {
  if (side === "player") return [{ side: "player" }];
  return state.enemies.map((_, index) => ({ side: "enemy", index }));
}

export function getStatuses(state: GameState, ref: CombatantRef): Statuses {
  return ref.side === "player" ? state.player.statuses : state.enemies[ref.index].statuses;
}

export function isAlive(state: GameState, ref: CombatantRef): boolean {
  return ref.side === "player" ? state.player.hp > 0 : (state.enemies[ref.index]?.hp ?? 0) > 0;
}

/** A `{ tkey }` reference to a combatant's localized name, for log lines. */
export function combatantNameKey(state: GameState, ref: CombatantRef): { tkey: string } {
  if (ref.side === "player") return { tkey: "ui.you" };
  return { tkey: `enemy.${state.enemies[ref.index].defId}.name` };
}

/** Replace a combatant's statuses immutably. */
function withStatuses(state: GameState, ref: CombatantRef, statuses: Statuses): GameState {
  if (ref.side === "player") return { ...state, player: { ...state.player, statuses } };
  const enemies = state.enemies.slice();
  enemies[ref.index] = { ...enemies[ref.index], statuses };
  return { ...state, enemies };
}

export function addStatusTo(state: GameState, ref: CombatantRef, id: StatusId, amount: number): GameState {
  return withStatuses(state, ref, addStatus(getStatuses(state, ref), id, amount));
}

/** Heal a combatant by ref (player capped at maxHp; enemies at their maxHp). */
export function healCombatant(state: GameState, ref: CombatantRef, amount: number): GameState {
  if (ref.side === "player") {
    const p = state.player;
    return { ...state, player: { ...p, hp: Math.min(p.maxHp, p.hp + amount) } };
  }
  const e = state.enemies[ref.index];
  if (!e) return state;
  const enemies = state.enemies.slice();
  enemies[ref.index] = { ...e, hp: Math.min(e.maxHp, e.hp + amount) };
  return { ...state, enemies };
}

/** Damage a combatant by ref. `ignoreBlock` (e.g. poison) bypasses block. */
export function damageCombatant(
  state: GameState,
  ref: CombatantRef,
  dmg: number,
  opts: { ignoreBlock?: boolean } = {},
): GameState {
  const amount = Math.max(0, dmg);
  if (ref.side === "player") {
    const p = state.player;
    const after = opts.ignoreBlock ? { hp: p.hp - amount, block: p.block } : applyDamage(p.hp, p.block, amount);
    return { ...state, player: { ...p, hp: after.hp, block: after.block } };
  }
  const e = state.enemies[ref.index];
  if (!e) return state;
  const after = opts.ignoreBlock ? { hp: e.hp - amount, block: e.block } : applyDamage(e.hp, e.block, amount);
  const enemies = state.enemies.slice();
  enemies[ref.index] = { ...e, hp: after.hp, block: after.block };
  return { ...state, enemies };
}
