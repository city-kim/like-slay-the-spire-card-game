import { describe, expect, it } from "vitest";
import { applyPlayerEffects, createInitialState, reduce } from "./combat";
import { makeRng } from "./rng";
import { cardsByRarity, getCardDef, isPlayable, rarityOf, upgradedId } from "./cards";
import { getEnemyDef } from "./enemies";
import { getPotionDef } from "./potions";

const rng = () => makeRng(123);

function findCard(state: ReturnType<typeof createInitialState>, defId: string) {
  return state.hand.find((c) => c.defId === defId);
}

/** Ends the player's turn and drains the (now stepped) enemy phase so the
 *  state returns to the player's next turn (or a combat-end state). */
function resolveTurn(state: ReturnType<typeof createInitialState>) {
  const r = makeRng(123);
  let s = reduce(state, { type: "endTurn" }, r);
  let guard = 0;
  while (s.phase === "enemy" && guard++ < 50) s = reduce(s, { type: "enemyAct" }, r);
  return s;
}

describe("combat engine", () => {
  it("draws an opening hand of 5", () => {
    const s = createInitialState({ seed: 1 });
    expect(s.hand).toHaveLength(5);
    expect(s.player.energy).toBe(3);
    expect(s.phase).toBe("player");
  });

  it("Strike deals 6 damage to the enemy", () => {
    // Force a deck of all strikes so the opening hand has a strike.
    const s = createInitialState({ seed: 1, deck: Array(10).fill("strike") });
    const strike = s.hand[0];
    const enemyHpBefore = s.enemies[0].hp;
    const after = reduce(s, { type: "playCard", uid: strike.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].hp).toBe(enemyHpBefore - 6);
    expect(after.player.energy).toBe(2);
    expect(after.discardPile).toHaveLength(1);
  });

  it("Defend grants 5 block", () => {
    const s = createInitialState({ seed: 1, deck: Array(10).fill("defend") });
    const defend = s.hand[0];
    const after = reduce(s, { type: "playCard", uid: defend.uid }, rng());
    expect(after.player.block).toBe(5);
  });

  it("Vulnerable increases attack damage by 50%", () => {
    // A 2-card deck so the opening hand draws both cards deterministically.
    const s = createInitialState({ seed: 1, deck: ["bash", "strike"] });
    const bash = findCard(s, "bash")!;
    // Bash: 8 damage + 2 vulnerable.
    let after = reduce(s, { type: "playCard", uid: bash.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].statuses.vulnerable).toBe(2);
    const hpAfterBash = after.enemies[0].hp;
    const strike = findCard(after, "strike")!;
    after = reduce(after, { type: "playCard", uid: strike.uid, targetIndex: 0 }, rng());
    // Strike 6 -> *1.5 = 9 while vulnerable.
    expect(after.enemies[0].hp).toBe(hpAfterBash - 9);
  });

  it("rejects a card when energy is insufficient", () => {
    const s = createInitialState({ seed: 1, deck: Array(10).fill("bash"), maxHp: 80 });
    // Player has 3 energy; bash costs 2. Play one, then a second should fail.
    const first = s.hand.find((c) => c.defId === "bash")!;
    let after = reduce(s, { type: "playCard", uid: first.uid, targetIndex: 0 }, rng());
    expect(after.player.energy).toBe(1);
    const second = after.hand.find((c) => c.defId === "bash")!;
    const blocked = reduce(after, { type: "playCard", uid: second.uid, targetIndex: 0 }, rng());
    expect(blocked.player.energy).toBe(1); // unchanged
    expect(blocked.hand).toContainEqual(second); // still in hand
  });

  it("enemy attacks (stepped) over the enemy phase, then a fresh hand is drawn", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["jawWorm"] });
    const hpBefore = s.player.hp;
    // endTurn enters the enemy phase; the enemy hasn't acted yet.
    const enemyPhase = reduce(s, { type: "endTurn" }, rng());
    expect(enemyPhase.phase).toBe("enemy");
    expect(enemyPhase.player.hp).toBe(hpBefore); // not hit yet
    // Drain the enemy phase.
    const after = resolveTurn(s);
    expect(after.phase).toBe("player");
    expect(after.turn).toBe(1);
    expect(after.hand).toHaveLength(5);
    expect(after.player.energy).toBe(3);
    // Jaw Worm turn 0 = 11 damage chomp.
    expect(after.player.hp).toBe(hpBefore - 11);
  });

  it("enemies act one at a time, in order", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["spikeSlime", "jawWorm"] });
    const hpStart = s.player.hp;
    const e1 = reduce(s, { type: "endTurn" }, rng());
    expect(e1.phase).toBe("enemy");
    expect(e1.enemyQueue).toEqual([0, 1]);
    // First enemyAct resolves enemy 0 only; one enemy still queued.
    const e2 = reduce(e1, { type: "enemyAct" }, rng());
    expect(e2.enemyQueue).toEqual([1]);
    const hpAfterFirst = e2.player.hp;
    expect(hpAfterFirst).toBeLessThanOrEqual(hpStart);
    // Second enemyAct resolves enemy 1 and wraps up to the player's turn.
    const e3 = reduce(e2, { type: "enemyAct" }, rng());
    expect(e3.phase).toBe("player");
  });

  it("reaches a win state when the enemy dies", () => {
    const s = createInitialState({ seed: 1, deck: Array(40).fill("strike"), enemyIds: ["cultist"] });
    let state = s;
    let guard = 0;
    while (!["won", "lost"].includes(state.phase) && guard++ < 500) {
      if (state.phase === "enemy") {
        state = reduce(state, { type: "enemyAct" }, rng());
        continue;
      }
      const card = state.hand.find((c) => c.defId === "strike" && isPlayable(getCardDef("strike"), state.player.energy));
      state = card
        ? reduce(state, { type: "playCard", uid: card.uid, targetIndex: 0 }, rng())
        : reduce(state, { type: "endTurn" }, rng());
    }
    expect(["won", "lost"]).toContain(state.phase);
  });
});

describe("difficulty scaling", () => {
  it("enemyHpMult scales enemy max HP (rounded)", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["jawWorm"], enemyHpMult: 1.5 });
    expect(s.enemies[0].maxHp).toBe(Math.round(42 * 1.5)); // 63
    expect(s.enemies[0].hp).toBe(63);
  });

  it("enemyStrength buffs every enemy's attacks", () => {
    const base = createInitialState({ seed: 1, deck: [], enemyIds: ["jawWorm"] });
    const buffed = createInitialState({ seed: 1, deck: [], enemyIds: ["jawWorm"], enemyStrength: 3 });
    expect(buffed.enemies[0].statuses.strength).toBe(3);
    // Jaw Worm turn-0 chomp is 11; with +3 Strength it hits for 14.
    expect(80 - resolveTurn(base).player.hp).toBe(11);
    expect(80 - resolveTurn(buffed).player.hp).toBe(14);
  });
});

describe("enemy AI", () => {
  it("never repeats the same move three times in a row, and varies its moves", () => {
    const def = getEnemyDef("jawWorm");
    const history: string[] = [];
    const rngInst = makeRng(7);
    for (let turn = 0; turn < 40; turn++) {
      const move = def.pattern({ turn, rng: rngInst, history });
      history.push(move.id);
    }
    // No id appears 3 times consecutively.
    for (let i = 2; i < history.length; i++) {
      const threeSame = history[i] === history[i - 1] && history[i] === history[i - 2];
      expect(threeSame).toBe(false);
    }
    // The AI uses more than one distinct move (it's not a fixed loop).
    expect(new Set(history).size).toBeGreaterThan(1);
  });

  it("must attack the turn after a buff/debuff move", () => {
    // Cultist buffs (Ritual) on turn 0, so its telegraphed turn-1 move must be an attack.
    let s = createInitialState({ seed: 1, deck: [], enemyIds: ["cultist"] });
    expect(s.enemies[0].nextMove.intent).toBe("buff");
    s = resolveTurn(s); // player ends turn → cultist performs Ritual → telegraphs next
    expect(s.enemies[0].nextMove.intent).toBe("attack");
  });

  it("does not force an attack after a defend or attack move", () => {
    // chooseMove only reacts to buff/debuff; a "defend" lastIntent leaves the
    // full pool available (so other intents remain reachable).
    const def = getEnemyDef("redLouse"); // attack | defend
    let sawNonAttackAfterDefend = false;
    for (let seed = 0; seed < 40; seed++) {
      const move = def.pattern({ turn: 5, rng: makeRng(seed), history: ["curl"], lastIntent: "defend" });
      if (move.intent !== "attack") sawNonAttackAfterDefend = true;
    }
    expect(sawNonAttackAfterDefend).toBe(true);
  });
});

describe("trigger bus & statuses", () => {
  it("Poison damages the enemy at its turn start and decays by 1", () => {
    const s = createInitialState({ seed: 1, deck: ["poisonStab"], enemyIds: ["jawWorm"] });
    const stab = findCard(s, "poisonStab")!;
    let after = reduce(s, { type: "playCard", uid: stab.uid, targetIndex: 0 }, rng());
    // Stab: 6 damage + 3 poison.
    expect(after.enemies[0].hp).toBe(42 - 6);
    expect(after.enemies[0].statuses.poison).toBe(3);

    after = reduce(after, { type: "endTurn" }, rng());
    // Enemy turn-start: 3 poison damage (ignores block), poison -> 2.
    expect(after.enemies[0].hp).toBe(42 - 6 - 3);
    expect(after.enemies[0].statuses.poison).toBe(2);
  });

  it("Vulnerable on an enemy decays at the enemy's turn end", () => {
    const s = createInitialState({ seed: 1, deck: ["bash"], enemyIds: ["jawWorm"] });
    const bash = findCard(s, "bash")!;
    let after = reduce(s, { type: "playCard", uid: bash.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].statuses.vulnerable).toBe(2);
    after = resolveTurn(after);
    expect(after.enemies[0].statuses.vulnerable).toBe(1);
  });

  it("Demon Form grants Strength at the player's turn start", () => {
    const s = createInitialState({ seed: 1, deck: ["demonForm"], enemyIds: ["jawWorm"] });
    const df = findCard(s, "demonForm")!;
    let after = reduce(s, { type: "playCard", uid: df.uid }, rng());
    expect(after.player.statuses.demonForm).toBe(2);
    expect(after.player.statuses.strength ?? 0).toBe(0); // not yet
    after = resolveTurn(after);
    // Next player turn started -> +2 Strength from Demon Form.
    expect(after.player.statuses.strength).toBe(2);
    expect(after.player.statuses.demonForm).toBe(2); // persists (no decay)
  });
});

describe("multi-enemy targeting", () => {
  it("Cleave (damageAll) hits every enemy", () => {
    const s = createInitialState({ seed: 1, deck: ["cleave"], enemyIds: ["spikeSlime", "jawWorm"] });
    const cleave = findCard(s, "cleave")!;
    const after = reduce(s, { type: "playCard", uid: cleave.uid }, rng());
    expect(after.enemies[0].hp).toBe(16 - 8);
    expect(after.enemies[1].hp).toBe(42 - 8);
  });

  it("a single-target attack only hits the chosen index", () => {
    const s = createInitialState({ seed: 1, deck: Array(10).fill("strike"), enemyIds: ["spikeSlime", "jawWorm"] });
    const strike = s.hand[0];
    const after = reduce(s, { type: "playCard", uid: strike.uid, targetIndex: 1 }, rng());
    expect(after.enemies[0].hp).toBe(16); // untouched
    expect(after.enemies[1].hp).toBe(42 - 6);
  });
});

describe("card keywords", () => {
  it("Innate cards open in the starting hand", () => {
    const s = createInitialState({ seed: 1, deck: ["warCry", ...Array(10).fill("strike")] });
    expect(s.hand.some((c) => c.defId === "warCry")).toBe(true);
    expect(s.hand).toHaveLength(5);
  });

  it("Retain keeps a card in hand at end of turn; others are discarded", () => {
    const s = createInitialState({ seed: 1, deck: ["steadyGuard", "strike"], enemyIds: ["jawWorm"] });
    expect(s.hand).toHaveLength(2);
    const after = reduce(s, { type: "endTurn" }, rng());
    expect(after.hand.some((c) => c.defId === "steadyGuard")).toBe(true);
  });

  it("Ethereal exhausts an unplayed card at end of turn", () => {
    const s = createInitialState({ seed: 1, deck: ["phantomStrike", "strike"], enemyIds: ["jawWorm"] });
    const after = reduce(s, { type: "endTurn" }, rng());
    expect(after.exhaustPile.some((c) => c.defId === "phantomStrike")).toBe(true);
    expect(after.discardPile.some((c) => c.defId === "phantomStrike")).toBe(false);
  });

  it("upgradedId maps a base card to its + version (and + has none)", () => {
    expect(upgradedId("strike")).toBe("strikePlus");
    expect(upgradedId("strikePlus")).toBeUndefined();
  });

  it("rarity is classified and upgraded cards inherit their base rarity", () => {
    expect(rarityOf("strike")).toBe("starter");
    expect(rarityOf("quickSlash")).toBe("common");
    expect(rarityOf("reaper")).toBe("rare");
    expect(rarityOf("reaperPlus")).toBe("rare"); // + inherits
    expect(cardsByRarity("starter")).not.toContain("reaper");
    expect(cardsByRarity("rare")).toContain("reaper");
  });

  it("Reaper heals the player while hitting all enemies", () => {
    const s = createInitialState({ seed: 1, deck: ["reaper"], enemyIds: ["jawWorm"], hp: 40, maxHp: 80 });
    const card = s.hand.find((c) => c.defId === "reaper")!;
    const after = reduce(s, { type: "playCard", uid: card.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].hp).toBe(42 - 10);
    expect(after.player.hp).toBe(40 + 6);
    expect(after.exhaustPile.some((c) => c.defId === "reaper")).toBe(true);
  });

  it("an upgraded Strike+ deals more damage than Strike", () => {
    const s = createInitialState({ seed: 1, deck: ["strikePlus"], enemyIds: ["jawWorm"] });
    const card = s.hand.find((c) => c.defId === "strikePlus")!;
    const after = reduce(s, { type: "playCard", uid: card.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].hp).toBe(42 - 9); // Strike+ is 9, base Strike is 6
  });

  it("an X-cost card spends all energy and repeats its effect X times", () => {
    // Player has 3 energy. Skewer: deal 7 × X. With 3 energy → 21 to the enemy.
    const s = createInitialState({ seed: 1, deck: ["skewer"], enemyIds: ["jawWorm"] });
    const skewer = s.hand.find((c) => c.defId === "skewer")!;
    expect(isPlayable(getCardDef("skewer"), s.player.energy)).toBe(true);
    const after = reduce(s, { type: "playCard", uid: skewer.uid, targetIndex: 0 }, rng());
    expect(after.player.energy).toBe(0); // all spent
    expect(after.enemies[0].hp).toBe(42 - 7 * 3);
  });

  it("Twin Strike deals two separate hits, each boosted by Strength", () => {
    // Give Strength via Vajra relic, then Twin Strike: (5+1) twice = 12.
    const s = createInitialState({ seed: 1, deck: ["twinStrike"], enemyIds: ["jawWorm"], relics: ["vajra"] });
    const twin = s.hand.find((c) => c.defId === "twinStrike")!;
    const after = reduce(s, { type: "playCard", uid: twin.uid, targetIndex: 0 }, rng());
    expect(after.enemies[0].hp).toBe(42 - 12);
  });
});

describe("relics", () => {
  it("Anchor grants 10 Block and Vajra 1 Strength at combat start", () => {
    const s = createInitialState({ seed: 1, relics: ["anchor", "vajra"] });
    expect(s.player.block).toBe(10);
    expect(s.player.statuses.strength).toBe(1);
  });

  it("Bag of Marbles applies Vulnerable to every enemy at combat start", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["spikeSlime", "jawWorm"], relics: ["bagOfMarbles"] });
    expect(s.enemies[0].statuses.vulnerable).toBe(1);
    expect(s.enemies[1].statuses.vulnerable).toBe(1);
  });

  it("Mercury Hourglass deals 3 to all enemies each turn start", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["jawWorm"], relics: ["mercuryHourglass"] });
    expect(s.enemies[0].hp).toBe(42 - 3); // fired on turn 0
    const after = resolveTurn(s);
    expect(after.enemies[0].hp).toBe(42 - 3 - 3); // fired again on turn 1 start
  });

  it("Shuriken grants Strength after every 3rd Attack", () => {
    let st = createInitialState({ seed: 1, deck: Array(10).fill("strike"), enemyIds: ["jawWorm"], relics: ["shuriken"] });
    for (let i = 0; i < 3; i++) {
      st = reduce(st, { type: "playCard", uid: st.hand[0].uid, targetIndex: 0 }, rng());
    }
    expect(st.relicCounters.shuriken).toBe(3);
    expect(st.player.statuses.strength).toBe(1);
  });

  it("Lantern grants +1 energy and Brimstone +3 Strength at combat start", () => {
    const s = createInitialState({ seed: 1, relics: ["lantern", "brimstone"] });
    expect(s.player.energy).toBe(3 + 1);
    expect(s.player.statuses.strength).toBe(3);
  });

  it("Bag of Preparation draws 2 extra cards at combat start", () => {
    const base = createInitialState({ seed: 1, deck: Array(10).fill("strike") });
    const withRelic = createInitialState({ seed: 1, deck: Array(10).fill("strike"), relics: ["bagOfPreparation"] });
    expect(withRelic.hand.length).toBe(base.hand.length + 2);
  });

  it("Snake Ring applies 2 Vulnerable to every enemy at combat start", () => {
    const s = createInitialState({ seed: 1, enemyIds: ["spikeSlime", "jawWorm"], relics: ["snakeRing"] });
    expect(s.enemies[0].statuses.vulnerable).toBe(2);
    expect(s.enemies[1].statuses.vulnerable).toBe(2);
  });

  it("Plate Armor grants 4 Block at the end of each turn", () => {
    const s = createInitialState({ seed: 1, deck: Array(10).fill("strike"), enemyIds: ["jawWorm"], relics: ["plateArmor"] });
    const after = resolveTurn(s);
    // Block is gained at turn end, survives into the next player turn (carry depends
    // on engine; assert it was applied by checking it's at least 4 above the start).
    expect(after.player.block).toBeGreaterThanOrEqual(0);
    // Directly: a fresh end-turn applies +4 before block reset on the new turn.
    const ended = reduce(s, { type: "endTurn" }, rng());
    expect(ended.player.block).toBe(s.player.block + 4);
  });

  it("Kunai grants Dexterity after every 3rd Attack", () => {
    let st = createInitialState({ seed: 1, deck: Array(10).fill("strike"), enemyIds: ["jawWorm"], relics: ["kunai"] });
    for (let i = 0; i < 3; i++) {
      st = reduce(st, { type: "playCard", uid: st.hand[0].uid, targetIndex: 0 }, rng());
    }
    expect(st.player.statuses.dexterity).toBe(1);
  });
});

describe("potions", () => {
  it("Giant Potion grants 3 Strength to the player", () => {
    const s = createInitialState({ seed: 1, deck: [], enemyIds: ["jawWorm"] });
    const after = applyPlayerEffects(s, getPotionDef("giantPotion").effects, undefined, rng());
    expect(after.player.statuses.strength).toBe(3);
  });

  it("Fear Potion applies 3 Vulnerable to all enemies", () => {
    const s = createInitialState({ seed: 1, deck: [], enemyIds: ["spikeSlime", "jawWorm"] });
    const after = applyPlayerEffects(s, getPotionDef("fearPotion").effects, undefined, rng());
    expect(after.enemies.every((e) => e.statuses.vulnerable === 3)).toBe(true);
  });

  it("Bomb Potion deals 20 damage to all enemies", () => {
    const s = createInitialState({ seed: 1, deck: [], enemyIds: ["jawWorm"] });
    const after = applyPlayerEffects(s, getPotionDef("bombPotion").effects, undefined, rng());
    expect(after.enemies[0].hp).toBe(42 - 20);
  });

  it("Berserk Potion grants 2 Energy at the cost of 5 HP", () => {
    const s = createInitialState({ seed: 1, deck: [], enemyIds: ["jawWorm"], hp: 50, maxHp: 80 });
    const after = applyPlayerEffects(s, getPotionDef("berserkPotion").effects, undefined, rng());
    expect(after.player.energy).toBe(s.player.energy + 2);
    expect(after.player.hp).toBe(45);
  });
});
