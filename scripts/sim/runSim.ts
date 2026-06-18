// Headless balance simulator.
//
// Because the engine is pure and deterministic, we can auto-play thousands of
// combats across seeds and aggregate statistics — win rate, average turns,
// average damage taken. The `balance-simulator` agent extends this file.
//
// Run: pnpm sim
//
// It drives the game ONLY through the public engine API (createInitialState /
// reduce), so the numbers reflect the real game, not an engine shortcut.

import {
  createInitialState,
  reduce,
  getCardDef,
  makeRng,
  type GameState,
  type StartOptions,
} from "../../src/engine/index";

/** A policy decides the next action given the current state. */
type Policy = (state: GameState) => Parameters<typeof reduce>[1];

/**
 * A simple greedy policy: play every affordable attack at the enemy, then any
 * affordable skill (block), otherwise end the turn. Targets the first living
 * enemy. Good enough as a balance baseline, not an optimal player.
 */
const greedyPolicy: Policy = (state) => {
  const livingEnemy = state.enemies.findIndex((e) => e.hp > 0);

  // Prefer attacks while we can afford them.
  const attack = state.hand.find((c) => {
    const def = getCardDef(c.defId);
    return def.type === "attack" && state.player.energy >= def.cost;
  });
  if (attack) {
    return { type: "playCard", uid: attack.uid, targetIndex: Math.max(0, livingEnemy) };
  }

  // Then play affordable non-attacks (block etc.).
  const other = state.hand.find((c) => {
    const def = getCardDef(c.defId);
    return def.type !== "attack" && state.player.energy >= def.cost;
  });
  if (other) {
    const def = getCardDef(other.defId);
    return { type: "playCard", uid: other.uid, targetIndex: def.target === "enemy" ? Math.max(0, livingEnemy) : undefined };
  }

  return { type: "endTurn" };
};

interface RunResult {
  outcome: "won" | "lost";
  turns: number;
  damageTaken: number;
}

function runOne(opts: StartOptions, policy: Policy, maxSteps = 1000): RunResult {
  const rng = makeRng(opts.seed ?? 1);
  let state = createInitialState(opts);
  const startHp = state.player.hp;
  let steps = 0;

  while (state.phase === "player" && steps++ < maxSteps) {
    state = reduce(state, policy(state), rng);
  }

  return {
    outcome: state.phase === "won" ? "won" : "lost",
    turns: state.turn + 1,
    damageTaken: startHp - state.player.hp,
  };
}

interface Scenario {
  name: string;
  opts: Omit<StartOptions, "seed">;
}

function runScenario(scenario: Scenario, seeds: number[], policy: Policy) {
  const results = seeds.map((seed) => runOne({ ...scenario.opts, seed }, policy));
  const wins = results.filter((r) => r.outcome === "won");
  const winRate = (wins.length / results.length) * 100;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  console.log(`\n▶ ${scenario.name}  (${seeds.length} seeds)`);
  console.log(`   승률      : ${winRate.toFixed(1)}%  (${wins.length}/${results.length})`);
  console.log(`   평균 턴   : ${avg(results.map((r) => r.turns)).toFixed(1)}`);
  console.log(`   평균 피해 : ${avg(results.map((r) => r.damageTaken)).toFixed(1)}`);
  if (wins.length) {
    console.log(`   승리 시 평균 턴: ${avg(wins.map((r) => r.turns)).toFixed(1)}`);
  }
}

// ─── Scenarios ───────────────────────────────────────────────────────────────

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

const SCENARIOS: Scenario[] = [
  { name: "스타터 덱 vs Jaw Worm", opts: { enemyIds: ["jawWorm"] } },
  { name: "스타터 덱 vs Cultist", opts: { enemyIds: ["cultist"] } },
  { name: "스타터 덱 vs Spike Slime + Jaw Worm", opts: { enemyIds: ["spikeSlime", "jawWorm"] } },
];

console.log("=== Balance Simulator ===");
console.log(`정책: greedy (공격 우선) · 시드 ${SEEDS[0]}..${SEEDS[SEEDS.length - 1]}`);
for (const scenario of SCENARIOS) {
  runScenario(scenario, SEEDS, greedyPolicy);
}
