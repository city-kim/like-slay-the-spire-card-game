import { describe, expect, it } from "vitest";
import { ALL_POTION_IDS, ALL_RELIC_IDS, CARD_DEFS, ENEMY_DEFS } from "./engine";
import { CHARACTERS, EVENT_DEFS } from "./run";
import { LOCALES, type Locale } from "./i18n";

const LOCS: Locale[] = ["ko", "en"];

/** True if the dotted path resolves to a non-empty string in that locale. */
function has(locale: Locale, path: string): boolean {
  let cur: unknown = LOCALES[locale];
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return typeof cur === "string" && cur.length > 0;
}

function expectKey(path: string) {
  for (const loc of LOCS) {
    expect(has(loc, path), `missing i18n: ${loc} → ${path}`).toBe(true);
  }
}

describe("content definitions", () => {
  it("every card has name + description in all locales", () => {
    for (const id of Object.keys(CARD_DEFS)) {
      expectKey(`card.${id}.name`);
      expectKey(`card.${id}.description`);
    }
  });

  it("every enemy has a name in all locales", () => {
    for (const id of Object.keys(ENEMY_DEFS)) expectKey(`enemy.${id}.name`);
  });

  it("every relic has name + description in all locales", () => {
    for (const id of ALL_RELIC_IDS) {
      expectKey(`relic.${id}.name`);
      expectKey(`relic.${id}.description`);
    }
  });

  it("every potion has name + description in all locales", () => {
    for (const id of ALL_POTION_IDS) {
      expectKey(`potion.${id}.name`);
      expectKey(`potion.${id}.description`);
    }
  });

  it("every status referenced by a card has an i18n label", () => {
    const used = new Set<string>();
    for (const def of Object.values(CARD_DEFS)) {
      for (const effect of def.effects) {
        if (effect.kind === "applyStatus" || effect.kind === "applyStatusAll") used.add(effect.status);
      }
    }
    for (const s of used) expectKey(`status.${s}`);
  });

  it("card defs are structurally valid (id matches key, valid cost, has effects)", () => {
    for (const [id, def] of Object.entries(CARD_DEFS)) {
      expect(def.id, `${id} id mismatch`).toBe(id);
      if (def.cost === "x") {
        expect(def.xEffects?.length ?? 0, `${id} X card needs xEffects`).toBeGreaterThan(0);
      } else {
        expect(def.cost, `${id} cost`).toBeGreaterThanOrEqual(0);
      }
      expect(["attack", "skill", "power"], `${id} type`).toContain(def.type);
      // Every card does something: base effects or (for X cards) xEffects.
      expect(def.effects.length + (def.xEffects?.length ?? 0), `${id} effects`).toBeGreaterThan(0);
    }
  });

  it("enemy defs are structurally valid (id matches key, positive HP)", () => {
    for (const [id, def] of Object.entries(ENEMY_DEFS)) {
      expect(def.id, `${id} id mismatch`).toBe(id);
      expect(def.maxHp, `${id} maxHp`).toBeGreaterThan(0);
    }
  });

  it("every event has title/body and per-choice labels + results in all locales", () => {
    for (const [id, def] of Object.entries(EVENT_DEFS)) {
      expectKey(`event.${id}.title`);
      expectKey(`event.${id}.body`);
      def.choices.forEach((_, i) => {
        expectKey(`event.${id}.choices.${i}`);
        expectKey(`event.${id}.results.${i}`);
      });
    }
  });

  it("every character has name + desc i18n and a deck of known cards", () => {
    for (const [id, def] of Object.entries(CHARACTERS)) {
      expectKey(`character.${id}.name`);
      expectKey(`character.${id}.desc`);
      expect(def.maxHp, `${id} maxHp`).toBeGreaterThan(0);
      expect(def.deck.length, `${id} deck`).toBeGreaterThan(0);
      for (const cardId of def.deck) {
        expect(CARD_DEFS[cardId], `${id} deck references unknown card ${cardId}`).toBeDefined();
      }
    }
  });
});
