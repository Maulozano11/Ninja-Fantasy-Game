// Movement on the hidden 0.5 m grid: what a step costs (water, cliffs, the ninja jump), where a unit
// can reach with the movement it has left, the path there, and free spots to land on (Kawarimi, a
// flash-in). Movement is shown in meters.

import type { BattleState, Cell, Pt, Unit } from './types';
import { CELL, cellBlocked, cellCenter, cellOf, dist, gridFor, idx, inGrid } from './map';

const DIRS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** A cliff edge: neighbors more than half a level apart with no ramp between them. */
const CLIFF = 0.6;
/** Extra meters to climb one level (1.5 m) or to drop one, with and without the ninja jump. */
export const CLIMB_UP = 4;
export const CLIMB_DOWN = 1;
export const JUMP_UP = 0.5;
export const JUMP_DOWN = 0.25;

export const isAlive = (u: Unit): boolean => !u.down;
export const isOnMap = (u: Unit): boolean => u.down !== 'fled' && u.down !== 'dead';

/** Cells taken by units (and the hydra's bulk): who stands where. */
export function occupancy(s: BattleState): Map<number, Unit> {
  const g = gridFor(s.mapId);
  const occ = new Map<number, Unit>();
  for (const u of Object.values(s.units)) {
    if (!isOnMap(u) || u.kind === 'hydra_head') continue;
    const c = cellOf(u.pos);
    if (u.bulk) {
      const r = Math.ceil(u.bulk / CELL);
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          const cc = { c: c.c + dc, r: c.r + dr };
          if (!inGrid(g, cc)) continue;
          const p = cellCenter(cc);
          if (Math.hypot((p.x - u.pos.x) / u.bulk, (p.z - u.pos.z) / (u.bulk * 0.6)) <= 1) occ.set(idx(g, cc), u);
        }
      }
    } else if (inGrid(g, c)) occ.set(idx(g, c), u);
  }
  return occ;
}

export interface StepRules {
  /** The unit can afford walking on deep water this turn (2 chakra) or already paid. */
  waterWalk: boolean;
  ninjaJump: boolean;
  /** Dragging a body doubles every step. */
  dragging?: boolean;
}

/** What one step costs in meters (Infinity if it can't be taken). */
export function stepCost(s: BattleState, from: Cell, to: Cell, diag: boolean, rules: StepRules): number {
  const g = gridFor(s.mapId);
  if (!inGrid(g, to) || cellBlocked(s, to)) return Infinity;
  // No cutting corners past a blocked cell.
  if (diag && (cellBlocked(s, { c: to.c, r: from.r }) || cellBlocked(s, { c: from.c, r: to.r }))) return Infinity;
  const i0 = idx(g, from);
  const i1 = idx(g, to);
  let cost = CELL * (diag ? Math.SQRT2 : 1);
  const water = g.water[i1];
  if (water === 1) cost *= 2;
  else if (water === 2 && !rules.waterWalk) cost *= 2;
  const dl = g.level[i1] - g.level[i0];
  if (Math.abs(dl) >= CLIFF && !(g.ramp[i0] && g.ramp[i1])) {
    const levels = Math.round(Math.abs(dl));
    cost += dl > 0 ? levels * (rules.ninjaJump ? JUMP_UP : CLIMB_UP) : levels * (rules.ninjaJump ? JUMP_DOWN : CLIMB_DOWN);
  }
  if (rules.dragging) cost *= 2;
  return cost;
}

export interface Reach {
  start: Cell;
  /** Cost to reach each cell index, and where it came from. */
  cost: Map<number, number>;
  prev: Map<number, number>;
}

/**
 * Every cell a unit can reach with `budget` meters (Dijkstra). Allies can be walked through but
 * not stood on; enemies block.
 */
export function reachable(s: BattleState, unit: Unit, budget: number, rules?: Partial<StepRules>): Reach {
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  const start = cellOf(unit.pos);
  const r: StepRules = {
    waterWalk: unit.cond.waterWalk || unit.chakra >= 2,
    ninjaJump: !!unit.cond.ninjaJump,
    ...rules,
  };
  const cost = new Map<number, number>();
  const prev = new Map<number, number>();
  const s0 = idx(g, start);
  cost.set(s0, 0);
  // A small binary heap of [cost, index].
  const heap: [number, number][] = [[0, s0]];
  const push = (e: [number, number]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const rr = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [c0, i0] = pop();
    if (c0 > (cost.get(i0) ?? Infinity)) continue;
    const cc = { c: i0 % g.cols, r: Math.floor(i0 / g.cols) };
    for (const [dc, dr, k] of DIRS) {
      const nc = { c: cc.c + dc, r: cc.r + dr };
      if (!inGrid(g, nc)) continue;
      const ni = idx(g, nc);
      const who = occ.get(ni);
      if (who && who.id !== unit.id && who.team !== unit.team && !who.down) continue;
      const step = stepCost(s, cc, nc, k > 1, r);
      if (!isFinite(step)) continue;
      const nc0 = c0 + step;
      if (nc0 > budget + 1e-6 || nc0 >= (cost.get(ni) ?? Infinity)) continue;
      cost.set(ni, nc0);
      prev.set(ni, i0);
      push([nc0, ni]);
    }
  }
  return { start, cost, prev };
}

/** Cells a unit may end its move on (reachable and not taken by another unit). */
export function canStop(s: BattleState, unit: Unit, c: Cell, occ = occupancy(s)): boolean {
  const g = gridFor(s.mapId);
  if (!inGrid(g, c)) return false;
  const who = occ.get(idx(g, c));
  return !who || who.id === unit.id;
}

/** The best free cell between `min` and `max` meters from a point (dry, open, nobody on it). */
export function freeSpot(s: BattleState, u: Unit, around: Pt, min: number, max: number, score: (p: Pt) => number): Pt {
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  const c0 = cellOf(around);
  const r = Math.ceil(max / CELL);
  let best = around;
  let bestScore = -Infinity;
  for (let dr = -r; dr <= r; dr++) {
    for (let dc = -r; dc <= r; dc++) {
      const c = { c: c0.c + dc, r: c0.r + dr };
      if (!inGrid(g, c) || cellBlocked(s, c) || g.water[idx(g, c)] === 2) continue;
      const p = cellCenter(c);
      const d = dist(p, around);
      if (d < min || d > max || !canStop(s, u, c, occ)) continue;
      const sc = score(p);
      if (sc > bestScore) {
        best = p;
        bestScore = sc;
      }
    }
  }
  return best;
}

/** The path to a reached cell, from the first step to the target. */
export function pathTo(s: BattleState, reach: Reach, target: Cell): Cell[] | null {
  const g = gridFor(s.mapId);
  let i = idx(g, target);
  if (!reach.cost.has(i)) return null;
  const out: Cell[] = [];
  const s0 = idx(g, reach.start);
  while (i !== s0) {
    out.push({ c: i % g.cols, r: Math.floor(i / g.cols) });
    const p = reach.prev.get(i);
    if (p === undefined) return null;
    i = p;
  }
  return out.reverse();
}

/** Meters a path costs for a unit (the same rules as reachable). */
export function pathCost(s: BattleState, unit: Unit, path: Cell[], rules?: Partial<StepRules>): number {
  const r: StepRules = { waterWalk: unit.cond.waterWalk || unit.chakra >= 2, ninjaJump: !!unit.cond.ninjaJump, ...rules };
  let at = cellOf(unit.pos);
  let total = 0;
  for (const c of path) {
    total += stepCost(s, at, c, at.c !== c.c && at.r !== c.r, r);
    at = c;
  }
  return total;
}

/** The path passes over deep water (the unit pays 2 chakra to walk on it, or swims). */
export function pathTouchesDeep(s: BattleState, path: Cell[]): boolean {
  const g = gridFor(s.mapId);
  return path.some((c) => g.water[idx(g, c)] === 2);
}

export const ptOf = (c: Cell): Pt => cellCenter(c);
