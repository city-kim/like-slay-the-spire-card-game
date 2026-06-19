import { describe, expect, it } from "vitest";
import { CARD_DEFS, getCardDef, isPlayable } from "./cards";
import { createInitialState, reduce } from "./combat";
import { makeRng } from "./rng";
import type { CardDef, Effect } from "./types";

const rng = () => makeRng(123);

/** Returns the lone effect of a card if it has exactly one of the given kind. */
function soleEffect(def: CardDef, kind: Effect["kind"]): Extract<Effect, { kind: typeof kind }> | undefined {
  if (def.cost === "x" || def.effects.length !== 1) return undefined;
  const e = def.effects[0];
  return e.kind === kind ? (e as Extract<Effect, { kind: typeof kind }>) : undefined;
}

const ALL = Object.values(CARD_DEFS);

// ── Data → engine consistency: a card's resolved effect matches its data. ─────
// These cover the whole "simple" pool automatically — if effect resolution ever
// drifts from the card definitions, the relevant case fails.

describe("golden: card data matches engine resolution", () => {
  it("every single-target damage card deals exactly its listed amount", () => {
    const cards = ALL.filter((d) => soleEffect(d, "damage") && d.target === "enemy" && !d.aoe);
    expect(cards.length).toBeGreaterThan(5); // sanity: we're actually testing many
    for (const def of cards) {
      const s = createInitialState({ seed: 1, deck: [def.id], enemyIds: ["jawWorm"] });
      const card = s.hand.find((c) => c.defId === def.id)!;
      expect(isPlayable(def, s.player.energy), `${def.id} unplayable at 3 energy`).toBe(true);
      const after = reduce(s, { type: "playCard", uid: card.uid, targetIndex: 0 }, rng());
      const amount = soleEffect(def, "damage")!.amount;
      expect(after.enemies[0].hp, `${def.id}`).toBe(42 - amount);
    }
  });

  it("every single Block card grants exactly its listed amount", () => {
    const cards = ALL.filter((d) => soleEffect(d, "block"));
    for (const def of cards) {
      const s = createInitialState({ seed: 1, deck: [def.id], enemyIds: ["jawWorm"] });
      const card = s.hand.find((c) => c.defId === def.id)!;
      const after = reduce(s, { type: "playCard", uid: card.uid }, rng());
      expect(after.player.block, `${def.id}`).toBe(soleEffect(def, "block")!.amount);
    }
  });

  it("every single Heal card restores exactly its listed amount (capped at max)", () => {
    const cards = ALL.filter((d) => soleEffect(d, "heal"));
    for (const def of cards) {
      const s = createInitialState({ seed: 1, deck: [def.id], enemyIds: ["jawWorm"], maxHp: 80, hp: 30 });
      const card = s.hand.find((c) => c.defId === def.id)!;
      const after = reduce(s, { type: "playCard", uid: card.uid }, rng());
      expect(after.player.hp, `${def.id}`).toBe(Math.min(80, 30 + soleEffect(def, "heal")!.amount));
    }
  });
});

// ── Seed replay determinism: same (seed, scripted actions) → same final state.─
// A greedy auto-player drives a full multi-enemy combat; running it twice from
// the same seed must produce byte-identical results. Guards the whole reducer.

describe("golden: seed replay determinism", () => {
  function playOut(seed: number) {
    const r = makeRng(seed);
    let s = createInitialState({
      seed,
      deck: [...Array(12).fill("strike"), ...Array(5).fill("defend"), "bash", "cleave"],
      enemyIds: ["spikeSlime", "jawWorm", "redLouse"],
    });
    let guard = 0;
    while (s.phase !== "won" && s.phase !== "lost" && guard++ < 300) {
      if (s.phase === "enemy") {
        s = reduce(s, { type: "enemyAct" }, r);
        continue;
      }
      const card = s.hand.find((c) => isPlayable(getCardDef(c.defId), s.player.energy));
      if (card) {
        const target = Math.max(0, s.enemies.findIndex((e) => e.hp > 0));
        s = reduce(s, { type: "playCard", uid: card.uid, targetIndex: target }, r);
      } else {
        s = reduce(s, { type: "endTurn" }, r);
      }
    }
    return s;
  }

  it("a full combat replays identically for a fixed seed", () => {
    const a = playOut(2024);
    const b = playOut(2024);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    expect(["won", "lost"]).toContain(a.phase); // it actually finished
  });

  it("different seeds can diverge (the rng is actually used)", () => {
    const a = playOut(1);
    const b = playOut(99999);
    // Not a strict requirement of correctness, but confirms seeds matter.
    expect(JSON.stringify(a) === JSON.stringify(b)).toBe(false);
  });
});
