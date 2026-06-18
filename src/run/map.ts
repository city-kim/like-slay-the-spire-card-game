import { makeRng, type RNG } from "../engine";
import type { MapNode, NodeType, RunMap } from "./types";

const ROW_COUNT = 36;
const MID_REST_ROW = Math.floor(ROW_COUNT / 2); // a guaranteed rest mid-run

/**
 * Generates a layered map deterministically from `seed`. The last row is the
 * boss; the row before it (and the midpoint) are guaranteed rests. Row 0 is
 * always combat. Middle rows roll a weighted mix of combat / elite / treasure /
 * shop / event / rest (rest at low odds). Consecutive rows are fully connected,
 * so the strategic choice is *which node type* to take next.
 */
export function generateMap(seed: number): RunMap {
  const rng = makeRng(seed);
  const rows: MapNode[][] = [];

  for (let r = 0; r < ROW_COUNT; r++) {
    const isBoss = r === ROW_COUNT - 1;
    const isRest = r === ROW_COUNT - 2 || r === MID_REST_ROW;
    const count = isBoss || isRest ? 1 : r === 0 ? 3 : 2 + rng.int(2); // 2–3
    const row: MapNode[] = [];
    for (let c = 0; c < count; c++) {
      row.push({ id: `r${r}c${c}`, type: rollType(r, isBoss, isRest, rng), row: r, col: c });
    }
    rows.push(row);
  }
  return { rows };
}

function rollType(row: number, isBoss: boolean, isRest: boolean, rng: RNG): NodeType {
  if (isBoss) return "boss";
  if (isRest) return "rest";
  if (row === 0) return "combat";
  const roll = rng.next();
  if (roll < 0.08) return "rest"; // occasional random rest
  if (roll < 0.5) return "combat";
  if (roll < 0.65) return "elite";
  if (roll < 0.77) return "treasure";
  if (roll < 0.89) return "shop";
  return "event";
}

/** The nodes the player may pick next given the current row (-1 = start). */
export function availableNodes(map: RunMap, currentRow: number): MapNode[] {
  const next = currentRow + 1;
  return next < map.rows.length ? map.rows[next] : [];
}
