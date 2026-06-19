import { useEffect, useRef, useState } from "react";
import type { GameState } from "../engine";
import { playSound } from "./sound";

export interface HpPopup {
  key: number;
  /** Enemy index, or "player". */
  target: number | "player";
  amount: number;
  kind: "damage" | "heal";
}

/**
 * Derives floating damage/heal numbers purely from HP changes between renders —
 * the engine stays unaware of presentation. Each popup self-removes after the
 * animation. Block-absorbed hits show no popup (HP didn't change), which is fine.
 */
export function useHpPopups(state: GameState): HpPopup[] {
  const [popups, setPopups] = useState<HpPopup[]>([]);
  const prev = useRef<{ enemies: number[]; player: number } | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    const before = prev.current;
    prev.current = { enemies: state.enemies.map((e) => e.hp), player: state.player.hp };
    if (!before) return; // first render — nothing to diff

    const fresh: HpPopup[] = [];
    state.enemies.forEach((e, i) => {
      const was = before.enemies[i];
      if (was !== undefined && e.hp < was) {
        fresh.push({ key: counter.current++, target: i, amount: was - e.hp, kind: "damage" });
      }
    });
    if (state.player.hp < before.player) {
      fresh.push({ key: counter.current++, target: "player", amount: before.player - state.player.hp, kind: "damage" });
    } else if (state.player.hp > before.player) {
      fresh.push({ key: counter.current++, target: "player", amount: state.player.hp - before.player, kind: "heal" });
    }
    if (fresh.length === 0) return;

    // One sound per batch (avoid stacking many on multi-hit).
    if (fresh.some((p) => p.kind === "damage" && p.target !== "player")) playSound("attack");
    if (fresh.some((p) => p.kind === "damage" && p.target === "player")) playSound("hurt");
    if (fresh.some((p) => p.kind === "heal")) playSound("heal");

    setPopups((ps) => [...ps, ...fresh]);
    const keys = new Set(fresh.map((p) => p.key));
    setTimeout(() => setPopups((ps) => ps.filter((p) => !keys.has(p.key))), 900);
  }, [state]);

  return popups;
}
