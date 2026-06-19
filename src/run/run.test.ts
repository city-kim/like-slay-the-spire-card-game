import { describe, expect, it } from "vitest";
import { getCardDef, isPlayable, makeRng, restoreRng, type GameState } from "../engine";
import { availableNodes, createRun, generateMap, runReduce, type RunState } from "./index";

const rng = () => makeRng(999);

function firstLivingEnemy(c: GameState): number {
  return Math.max(0, c.enemies.findIndex((e) => e.hp > 0));
}

/** Greedily resolves the active combat: attack while able, else end turn.
 *  Drives the stepped enemy phase to completion via enemyAct. */
function autoCombat(run: RunState, r = rng()): RunState {
  let next = run;
  let guard = 0;
  while (next.phase === "combat" && guard++ < 2000) {
    const c = next.combat!;
    if (c.phase === "enemy") {
      next = runReduce(next, { type: "combat", action: { type: "enemyAct" } }, r);
      continue;
    }
    const playable = c.hand.find((card) => isPlayable(getCardDef(card.defId), c.player.energy));
    if (playable) {
      const def = getCardDef(playable.defId);
      const targetIndex = def.target === "enemy" ? firstLivingEnemy(c) : undefined;
      next = runReduce(next, { type: "combat", action: { type: "playCard", uid: playable.uid, targetIndex } }, r);
    } else {
      next = runReduce(next, { type: "combat", action: { type: "endTurn" } }, r);
    }
  }
  return next;
}

describe("map generation", () => {
  it("builds a 36-row map with a boss top, guaranteed rests, combat at the start", () => {
    const map = generateMap(1);
    expect(map.rows).toHaveLength(36);
    const last = map.rows.length - 1;
    expect(map.rows[last]).toHaveLength(1);
    expect(map.rows[last][0].type).toBe("boss");
    expect(map.rows[last - 1].every((n) => n.type === "rest")).toBe(true); // pre-boss rest
    expect(map.rows[18].every((n) => n.type === "rest")).toBe(true); // mid-run rest (row 18)
    expect(map.rows[0].every((n) => n.type === "combat")).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    expect(JSON.stringify(generateMap(7))).toBe(JSON.stringify(generateMap(7)));
  });
});

describe("starting loadout", () => {
  it("has no relics or potions by default", () => {
    const run = createRun({ seed: 1 });
    expect(run.player.relics).toHaveLength(0);
    expect(run.player.potions).toHaveLength(0);
  });

  it("a character sets the starting deck, max HP, and relic", () => {
    const warrior = createRun({ seed: 1, character: "warrior" });
    expect(warrior.player.maxHp).toBe(80);
    expect(warrior.player.deck).toContain("bash");
    expect(warrior.player.relics).toEqual(["vajra"]);

    const rogue = createRun({ seed: 1, character: "rogue" });
    expect(rogue.player.maxHp).toBe(68);
    expect(rogue.player.deck).toContain("poisonStab");
    expect(rogue.player.relics).toEqual(["shuriken"]);
  });

  it("grants random starting relics when requested (deterministic per seed)", () => {
    const a = createRun({ seed: 5, randomRelics: 1 });
    const b = createRun({ seed: 5, randomRelics: 1 });
    expect(a.player.relics).toHaveLength(1);
    expect(a.player.relics).toEqual(b.player.relics); // same seed → same relic
  });
});

describe("reward potion (take or skip)", () => {
  function winFightAt(nodeType: "combat" | "elite"): RunState {
    // Find a node of the desired type, jump to it, and auto-win.
    const base = createRun({ seed: 3, deck: Array(30).fill("strike"), maxHp: 999 });
    const node = base.map.rows.flat().find((n) => n.type === nodeType)!;
    let run: RunState = { ...base, currentRow: node.row - 1 };
    run = runReduce(run, { type: "selectNode", nodeId: node.id }, rng());
    return autoCombat(run);
  }

  it("does not auto-grant the potion; it must be claimed", () => {
    let run = winFightAt("elite"); // high drop chance
    if (run.phase !== "reward" || !run.reward?.potion) return; // no drop this seed
    expect(run.player.potions).toHaveLength(0);
    run = runReduce(run, { type: "takeRewardPotion" }, rng());
    expect(run.player.potions).toHaveLength(1);
    expect(run.reward?.potion ?? null).toBeNull();
  });

  it("leaving the reward without claiming forfeits the potion", () => {
    let run = winFightAt("elite");
    if (run.phase !== "reward") return;
    run = runReduce(run, { type: "chooseReward", cardId: null }, rng());
    expect(run.phase).toBe("map");
    expect(run.player.potions).toHaveLength(0);
  });
});

describe("run transitions", () => {
  it("selecting a combat node starts combat carrying HP, deck, and relics", () => {
    const run = createRun({ seed: 1, maxHp: 80, relics: ["vajra"] });
    const node = availableNodes(run.map, run.currentRow)[0];
    const after = runReduce(run, { type: "selectNode", nodeId: node.id }, rng());
    expect(after.phase).toBe("combat");
    expect(after.combat).not.toBeNull();
    expect(after.combat!.player.maxHp).toBe(80);
    expect(after.combat!.player.relics).toEqual(["vajra"]);
  });

  it("winning a non-boss fight carries HP back and offers a reward", () => {
    let run = createRun({ seed: 1, deck: Array(20).fill("strike"), maxHp: 200 });
    const node = availableNodes(run.map, run.currentRow)[0];
    run = runReduce(run, { type: "selectNode", nodeId: node.id }, rng());
    run = autoCombat(run);
    expect(run.phase).toBe("reward");
    expect(run.reward!.cards).toHaveLength(3);
    expect(run.player.hp).toBeLessThanOrEqual(200);
    expect(run.player.gold).toBeGreaterThan(0);
  });

  it("choosing a reward card adds it to the deck and returns to the map", () => {
    let run = createRun({ seed: 1, deck: Array(20).fill("strike"), maxHp: 200 });
    const node = availableNodes(run.map, run.currentRow)[0];
    run = runReduce(run, { type: "selectNode", nodeId: node.id }, rng());
    run = autoCombat(run);
    const before = run.player.deck.length;
    const card = run.reward!.cards[0];
    run = runReduce(run, { type: "chooseReward", cardId: card }, rng());
    expect(run.phase).toBe("map");
    expect(run.player.deck).toHaveLength(before + 1);
    expect(run.player.deck).toContain(card);
  });

  it("a rest node offers a choice; healing restores 30% of max HP", () => {
    const base = createRun({ seed: 1, maxHp: 100 });
    const restNode = base.map.rows.flat().find((n) => n.type === "rest")!;
    expect(restNode.type).toBe("rest");
    const damaged: RunState = { ...base, currentRow: restNode.row - 1, player: { ...base.player, hp: 50 } };
    const atRest = runReduce(damaged, { type: "selectNode", nodeId: restNode.id }, rng());
    expect(atRest.phase).toBe("rest");
    const healed = runReduce(atRest, { type: "restHeal" }, rng());
    expect(healed.player.hp).toBe(80);
    expect(healed.phase).toBe("map");
    expect(healed.notice?.key).toBe("notice.rested");
  });

  it("a rest node can upgrade a card instead of healing", () => {
    const base = createRun({ seed: 1, deck: ["strike", "defend"] });
    const restNode = base.map.rows.flat().find((n) => n.type === "rest")!;
    const atRest: RunState = { ...base, currentRow: restNode.row - 1, phase: "rest", currentNodeId: restNode.id };
    const after = runReduce(atRest, { type: "restUpgrade", cardIndex: 0 }, rng());
    expect(after.player.deck[0]).toBe("strikePlus");
    expect(after.phase).toBe("map");
    expect(after.notice?.key).toBe("notice.upgraded");
  });

  it("a treasure node grants a relic", () => {
    const base = createRun({ seed: 1 });
    const treasure = base.map.rows.flat().find((n) => n.type === "treasure");
    if (!treasure) return; // map for this seed had none; covered by other seeds
    const at: RunState = { ...base, currentRow: treasure.row - 1 };
    const after = runReduce(at, { type: "selectNode", nodeId: treasure.id }, rng());
    expect(after.player.relics).toHaveLength(1);
    expect(after.phase).toBe("map");
  });

  it("plays a whole run to victory with an overwhelming deck", () => {
    let run = createRun({ seed: 1, deck: Array(30).fill("strike"), maxHp: 9999 });
    let guard = 0;
    while (run.phase !== "victory" && run.phase !== "gameOver" && guard++ < 400) {
      if (run.phase === "map") {
        const avail = availableNodes(run.map, run.currentRow);
        run = runReduce(run, { type: "selectNode", nodeId: avail[0].id }, rng());
      } else if (run.phase === "combat") {
        run = autoCombat(run);
      } else if (run.phase === "reward") {
        run = runReduce(run, { type: "chooseReward", cardId: null }, rng());
      } else if (run.phase === "rest") {
        run = runReduce(run, { type: "restHeal" }, rng());
      } else if (run.phase === "shop") {
        run = runReduce(run, { type: "leaveShop" }, rng());
      } else if (run.phase === "event") {
        run = runReduce(run, { type: "chooseEventOption", index: 0 }, rng());
      }
    }
    expect(run.phase).toBe("victory");
  });
});

describe("shop", () => {
  // Build a run sitting in a shop by jumping to a shop node directly.
  function enterShop(gold: number): RunState {
    const base = createRun({ seed: 1, deck: ["strike", "strike", "defend"] });
    const shopNode = base.map.rows.flat().find((n) => n.type === "shop");
    if (!shopNode) throw new Error("seed 1 produced no shop node");
    const at: RunState = { ...base, currentRow: shopNode.row - 1, player: { ...base.player, gold } };
    return runReduce(at, { type: "selectNode", nodeId: shopNode.id }, rng());
  }

  it("entering a shop generates stock", () => {
    const run = enterShop(0);
    expect(run.phase).toBe("shop");
    expect(run.shop!.cards.length).toBeGreaterThan(0);
  });

  it("buying a card spends gold and adds it to the deck", () => {
    let run = enterShop(999);
    const card = run.shop!.cards[0];
    const beforeDeck = run.player.deck.length;
    run = runReduce(run, { type: "buyShopCard", index: 0 }, rng());
    expect(run.player.gold).toBe(999 - card.price);
    expect(run.player.deck).toHaveLength(beforeDeck + 1);
    expect(run.shop!.cards[0].sold).toBe(true);
  });

  it("cannot buy without enough gold", () => {
    let run = enterShop(0);
    run = runReduce(run, { type: "buyShopCard", index: 0 }, rng());
    expect(run.shop!.cards[0].sold).toBe(false);
    expect(run.player.gold).toBe(0);
  });

  it("card removal spends gold, shrinks the deck, and is one-time", () => {
    let run = enterShop(999);
    const price = run.shop!.removePrice;
    const beforeDeck = run.player.deck.length;
    run = runReduce(run, { type: "removeCard", cardIndex: 0 }, rng());
    expect(run.player.deck).toHaveLength(beforeDeck - 1);
    expect(run.player.gold).toBe(999 - price);
    expect(run.shop!.removeUsed).toBe(true);
    // Second removal is rejected.
    run = runReduce(run, { type: "removeCard", cardIndex: 0 }, rng());
    expect(run.player.deck).toHaveLength(beforeDeck - 1);
  });

  it("leaving the shop returns to the map", () => {
    let run = enterShop(0);
    run = runReduce(run, { type: "leaveShop" }, rng());
    expect(run.phase).toBe("map");
    expect(run.shop).toBeNull();
  });
});

describe("potions", () => {
  // Enter a combat node so potions can be used.
  function enterCombat(potions: ("healingPotion" | "explosivePotion")[]): RunState {
    const base = createRun({ seed: 1, deck: Array(10).fill("strike"), maxHp: 80, potions });
    const node = availableNodes(base.map, base.currentRow)[0];
    return runReduce(base, { type: "selectNode", nodeId: node.id }, rng());
  }

  it("using a potion applies its effect and consumes the slot", () => {
    let run = enterCombat(["explosivePotion"]);
    const hpBefore = run.combat!.enemies[0].hp;
    run = runReduce(run, { type: "usePotion", slot: 0 }, rng());
    expect(run.player.potions).toHaveLength(0);
    expect(run.combat!.enemies[0].hp).toBe(hpBefore - 10);
  });

  it("a healing potion restores HP, capped at max", () => {
    // maxHp 80, but combat starts at full; damage the player first via a turn.
    let run = enterCombat(["healingPotion"]);
    run = runReduce(run, { type: "combat", action: { type: "endTurn" } }, rng()); // take a hit
    const hurt = run.combat!.player.hp;
    if (run.phase !== "combat") return; // safety
    run = runReduce(run, { type: "usePotion", slot: 0 }, rng());
    expect(run.combat!.player.hp).toBe(Math.min(80, hurt + 15));
  });

  it("potions can't be used outside combat", () => {
    const base = createRun({ seed: 1, potions: ["healingPotion"] });
    const after = runReduce(base, { type: "usePotion", slot: 0 }, rng());
    expect(after.player.potions).toHaveLength(1); // unchanged on the map
  });

  it("inventory is capped at 3 slots", () => {
    const run = createRun({
      seed: 1,
      potions: ["healingPotion", "blockPotion", "strengthPotion", "swiftPotion"],
    });
    expect(run.player.potions).toHaveLength(3);
  });
});

describe("events", () => {
  // Sit the run in a specific event (events are otherwise randomly chosen).
  function eventWith(id: string): RunState {
    const base = createRun({ seed: 1, maxHp: 100, deck: ["strike", "defend"] });
    const node = base.map.rows.flat().find((n) => n.type === "event")!;
    return {
      ...base,
      currentRow: node.row,
      currentNodeId: node.id,
      visited: [node.id],
      phase: "event",
      event: { id },
      player: { ...base.player, hp: 60, gold: 100 },
    };
  }

  it("entering an event sets the event phase", () => {
    const base = createRun({ seed: 1 });
    const node = base.map.rows.flat().find((n) => n.type === "event")!;
    const run = runReduce({ ...base, currentRow: node.row - 1 }, { type: "selectNode", nodeId: node.id }, rng());
    expect(run.phase).toBe("event");
    expect(run.event).not.toBeNull();
  });

  it("a non-combat choice applies effects and returns to the map", () => {
    // Shrine, choice 0 = gain a random relic.
    let run = eventWith("shrine");
    run = runReduce(run, { type: "chooseEventOption", index: 0 }, rng());
    expect(run.phase).toBe("map");
    expect(run.event).toBeNull();
    expect(run.notice).not.toBeNull();
    expect(run.player.relics).toHaveLength(1);
  });

  it("a fight choice starts combat with the listed enemies", () => {
    // Goblin Ambush, choice 0 = stand and fight (2 goblins).
    let run = eventWith("goblinAmbush");
    run = runReduce(run, { type: "chooseEventOption", index: 0 }, rng());
    expect(run.phase).toBe("combat");
    expect(run.combat).not.toBeNull();
    expect(run.combat!.enemies.map((e) => e.defId)).toEqual(["goblin", "goblin"]);
    // Winning the event-fight yields a normal reward (not boss/gameOver).
    run = autoCombat(run);
    expect(["reward", "map"]).toContain(run.phase);
  });
});

describe("save / load", () => {
  it("rng state round-trips so a resumed stream is identical", () => {
    const r1 = makeRng(5);
    r1.next();
    r1.int(10);
    const r2 = restoreRng(r1.state());
    expect(r2.next()).toBe(r1.next());
    expect(r2.int(100)).toBe(r1.int(100));
  });

  it("a RunState survives a JSON round-trip unchanged", () => {
    let run = createRun({ seed: 3, deck: Array(12).fill("strike"), relics: ["anchor"] });
    const node = availableNodes(run.map, run.currentRow)[0];
    run = runReduce(run, { type: "selectNode", nodeId: node.id }, rng()); // mid-combat
    const restored: RunState = JSON.parse(JSON.stringify(run));
    expect(restored).toEqual(run);
  });

  it("a resumed run continues identically with the restored rng", () => {
    // Drive a run partway, snapshot (state + rng state), then continue two ways.
    let run = createRun({ seed: 9, deck: Array(20).fill("strike"), maxHp: 500 });
    const driveRng = makeRng(42);
    const node = availableNodes(run.map, run.currentRow)[0];
    run = runReduce(run, { type: "selectNode", nodeId: node.id }, driveRng);
    const snapshot: RunState = JSON.parse(JSON.stringify(run));
    const rngState = driveRng.state();

    // Path A: keep going on the original rng.
    const a = runReduce(run, { type: "combat", action: { type: "endTurn" } }, driveRng);
    // Path B: reload from the snapshot + restored rng, same action.
    const b = runReduce(snapshot, { type: "combat", action: { type: "endTurn" } }, restoreRng(rngState));

    expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(a)));
  });
});
