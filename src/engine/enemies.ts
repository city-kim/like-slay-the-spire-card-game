import type { EnemyDef, EnemyMove, EnemyMoveContext } from "./types";

// Enemy definitions. `pattern(ctx)` chooses the telegraphed move using the rng
// and move history, so intents are probabilistic rather than a fixed loop —
// with a "no same move three times in a row" rule for fairness.

interface MoveOption {
  move: EnemyMove;
  weight: number;
}

/** Weighted-random move pick with two AI rules:
 *  1. After a buff/debuff turn, the enemy MUST attack this turn (if it has any
 *     attack option) — no chaining buffs/debuffs back to back.
 *  2. It cannot repeat the same move a 3rd time in a row. */
function chooseMove(ctx: EnemyMoveContext, options: MoveOption[]): EnemyMove {
  let pool = options;

  // Rule 1: forced attack after a buff/debuff.
  if (ctx.lastIntent === "buff" || ctx.lastIntent === "debuff") {
    const attacks = pool.filter((o) => o.move.intent === "attack");
    if (attacks.length > 0) pool = attacks;
  }

  // Rule 2: forbid a 3rd consecutive identical move.
  const h = ctx.history;
  const bannedId = h.length >= 2 && h[h.length - 1] === h[h.length - 2] ? h[h.length - 1] : null;
  const deduped = pool.filter((o) => o.move.id !== bannedId);
  if (deduped.length > 0) pool = deduped;

  const total = pool.reduce((sum, o) => sum + o.weight, 0);
  let r = ctx.rng.next() * total;
  for (const o of pool) {
    r -= o.weight;
    if (r < 0) return o.move;
  }
  return pool[pool.length - 1].move;
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  jawWorm: {
    id: "jawWorm",
    maxHp: 42,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "chomp", intent: "attack", displayDamage: 11, effects: [{ kind: "damage", amount: 11 }] };
      }
      return chooseMove(ctx, [
        { weight: 4, move: { id: "chomp", intent: "attack", displayDamage: 11, effects: [{ kind: "damage", amount: 11 }] } },
        {
          weight: 4,
          move: {
            id: "thrash",
            intent: "attack",
            displayDamage: 7,
            effects: [{ kind: "damage", amount: 7 }, { kind: "block", amount: 5 }],
          },
        },
        {
          weight: 2,
          move: {
            id: "bellow",
            intent: "buff",
            effects: [{ kind: "applyStatus", status: "strength", amount: 3, target: "self" }, { kind: "block", amount: 6 }],
          },
        },
      ]);
    },
  },

  cultist: {
    id: "cultist",
    maxHp: 48,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "ritual", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 3, target: "self" }] };
      }
      return chooseMove(ctx, [
        { weight: 7, move: { id: "darkStrike", intent: "attack", displayDamage: 6, effects: [{ kind: "damage", amount: 6 }] } },
        { weight: 3, move: { id: "ritual2", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }] } },
      ]);
    },
  },

  spikeSlime: {
    id: "spikeSlime",
    maxHp: 16,
    pattern: (ctx) =>
      chooseMove(ctx, [
        { weight: 6, move: { id: "tackle", intent: "attack", displayDamage: 5, effects: [{ kind: "damage", amount: 5 }] } },
        { weight: 4, move: { id: "weaken", intent: "debuff", effects: [{ kind: "applyStatus", status: "weak", amount: 1, target: "enemy" }] } },
      ]),
  },

  redLouse: {
    id: "redLouse",
    maxHp: 12,
    pattern: (ctx) =>
      chooseMove(ctx, [
        { weight: 7, move: { id: "bite", intent: "attack", displayDamage: 6, effects: [{ kind: "damage", amount: 6 }] } },
        { weight: 3, move: { id: "curl", intent: "defend", effects: [{ kind: "block", amount: 6 }] } },
      ]),
  },

  fungiBeast: {
    id: "fungiBeast",
    maxHp: 22,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "grow", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }] };
      }
      return chooseMove(ctx, [
        { weight: 7, move: { id: "bite", intent: "attack", displayDamage: 6, effects: [{ kind: "damage", amount: 6 }] } },
        { weight: 3, move: { id: "grow", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 1, target: "self" }] } },
      ]);
    },
  },

  acidSlime: {
    id: "acidSlime",
    maxHp: 28,
    pattern: (ctx) =>
      chooseMove(ctx, [
        {
          weight: 5,
          move: {
            id: "corrode",
            intent: "attack",
            displayDamage: 7,
            effects: [{ kind: "damage", amount: 7 }, { kind: "applyStatus", status: "frail", amount: 1, target: "enemy" }],
          },
        },
        { weight: 5, move: { id: "tackle", intent: "attack", displayDamage: 10, effects: [{ kind: "damage", amount: 10 }] } },
      ]),
  },

  batSwarm: {
    id: "batSwarm",
    maxHp: 18,
    pattern: (ctx) =>
      chooseMove(ctx, [
        {
          weight: 5,
          move: {
            id: "swarm",
            intent: "attack",
            displayDamage: 6,
            effects: [{ kind: "damage", amount: 2 }, { kind: "damage", amount: 2 }, { kind: "damage", amount: 2 }],
          },
        },
        {
          weight: 5,
          move: {
            id: "screech",
            intent: "attack",
            displayDamage: 4,
            effects: [{ kind: "damage", amount: 4 }, { kind: "applyStatus", status: "weak", amount: 1, target: "enemy" }],
          },
        },
      ]),
  },

  stoneGolem: {
    id: "stoneGolem",
    maxHp: 55,
    pattern: (ctx) =>
      chooseMove(ctx, [
        { weight: 5, move: { id: "boulder", intent: "attack", displayDamage: 18, effects: [{ kind: "damage", amount: 18 }] } },
        { weight: 4, move: { id: "harden", intent: "defend", effects: [{ kind: "block", amount: 12 }] } },
      ]),
  },

  goblin: {
    id: "goblin",
    maxHp: 16,
    pattern: (ctx) =>
      chooseMove(ctx, [
        { weight: 6, move: { id: "slash", intent: "attack", displayDamage: 7, effects: [{ kind: "damage", amount: 7 }] } },
        {
          weight: 4,
          move: {
            id: "lowBlow",
            intent: "attack",
            displayDamage: 4,
            effects: [{ kind: "damage", amount: 4 }, { kind: "applyStatus", status: "weak", amount: 1, target: "enemy" }],
          },
        },
      ]),
  },

  looter: {
    id: "looter",
    maxHp: 20,
    pattern: (ctx) =>
      chooseMove(ctx, [
        { weight: 6, move: { id: "mug", intent: "attack", displayDamage: 9, effects: [{ kind: "damage", amount: 9 }] } },
        { weight: 3, move: { id: "smokeBomb", intent: "defend", effects: [{ kind: "block", amount: 6 }] } },
      ]),
  },

  madDog: {
    id: "madDog",
    maxHp: 14,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "frenzy", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }] };
      }
      return chooseMove(ctx, [
        { weight: 7, move: { id: "bite", intent: "attack", displayDamage: 6, effects: [{ kind: "damage", amount: 6 }] } },
        { weight: 3, move: { id: "frenzy", intent: "buff", effects: [{ kind: "applyStatus", status: "strength", amount: 2, target: "self" }] } },
      ]);
    },
  },

  theGuardian: {
    id: "theGuardian",
    maxHp: 100,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "slam", intent: "attack", displayDamage: 16, effects: [{ kind: "damage", amount: 16 }] };
      }
      return chooseMove(ctx, [
        { weight: 4, move: { id: "slam", intent: "attack", displayDamage: 16, effects: [{ kind: "damage", amount: 16 }] } },
        {
          weight: 3,
          move: {
            id: "defensiveBash",
            intent: "attack",
            displayDamage: 9,
            effects: [{ kind: "block", amount: 10 }, { kind: "damage", amount: 9 }],
          },
        },
        {
          weight: 3,
          move: {
            id: "vulnStrike",
            intent: "attack",
            displayDamage: 11,
            effects: [{ kind: "damage", amount: 11 }, { kind: "applyStatus", status: "vulnerable", amount: 1, target: "enemy" }],
          },
        },
      ]);
    },
  },

  slimeKing: {
    id: "slimeKing",
    maxHp: 120,
    pattern: (ctx) => {
      if (ctx.turn === 0) {
        return { id: "slam", intent: "attack", displayDamage: 20, effects: [{ kind: "damage", amount: 20 }] };
      }
      return chooseMove(ctx, [
        { weight: 4, move: { id: "slam", intent: "attack", displayDamage: 20, effects: [{ kind: "damage", amount: 20 }] } },
        {
          weight: 3,
          move: {
            id: "splatter",
            intent: "attack",
            displayDamage: 12,
            effects: [{ kind: "damage", amount: 12 }, { kind: "applyStatus", status: "frail", amount: 1, target: "enemy" }],
          },
        },
        { weight: 3, move: { id: "prepare", intent: "defend", effects: [{ kind: "block", amount: 15 }] } },
      ]);
    },
  },
};

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_DEFS[id];
  if (!def) throw new Error(`Unknown enemy def: ${id}`);
  return def;
}
