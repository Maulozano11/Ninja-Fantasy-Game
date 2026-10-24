// Movement on the hidden 0.5 m grid: what a step costs (diagonals, water, climbing, the ninja jump),
// where a unit can reach with the movement it has left, the path there, and free spots to land on
// (Kawarimi, a flash-in). Movement is shown in meters.

import type { BattleState, Cell, Pt, Unit } from './types';
import { CELL, DIAGONAL_RULE, LEVEL_M, cellBlocked, cellCenter, cellOf, dist, gridFor, idx, inGrid } from './map';
import type { DiagonalRule } from './map';

// The diagonal rule lives in map.ts (ranges count by it too); kept importable from here.
export { DIAGONAL_RULE } from './map';
export type { DiagonalRule } from './map';

const DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** A diagonal step's base cost in meters. */
export const diagonalCost = (rule: DiagonalRule = DIAGONAL_RULE): number => (rule === 'true' ? CELL * Math.SQRT2 : CELL);

/**
 * The fewest metres of walking from a to b on open ground under the diagonal rule: under 5-5-5 the
 * longer of the two sides (a diagonal step covers both at once), at true length the octile
 * distance. The AI uses it to tell what a unit can walk to this turn; reachable gives the real paths.
 */
export function walkDist(a: Pt, b: Pt, rule: DiagonalRule = DIAGONAL_RULE): number {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return rule === 'true' ? Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz) : Math.max(dx, dz);
}

/** A cliff edge: neighbors more than half a level apart with no ramp between them. */
const CLIFF = 0.6;
/**
 * Climbing (5e: climbing costs double). Up a ledge or a ladder each level costs 3 m on top of the
 * step, down 1.5 m. With the ninja jump (bonus action) a level up costs 0.5 m and down 0.25 m.
 */
export const CLIMB_UP = 2 * LEVEL_M;
export const CLIMB_DOWN = LEVEL_M;
export const JUMP_UP = 0.5;
export const JUMP_DOWN = 0.25;
/** A bare face this many levels high (a cliff, a tower's wall) can't be climbed: take a ladder, or the ninja jump (a wall run). */
export const WALL_LEVELS = 2;

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

/** A navigation cell as a key ("c,r"): cracked ground is kept by it (battle/charged.ts). */
export const crackKey = (c: Cell): string => `${c.c},${c.r}`;

export interface StepRules {
  /** The unit can afford walking on deep water this turn (2 chakra) or already paid. */
  waterWalk: boolean;
  ninjaJump: boolean;
  /** Dragging a body doubles every step. */
  dragging?: boolean;
  /** How diagonals are paid (default DIAGONAL_RULE; tests compare with the other). */
  diagonals?: DiagonalRule;
}

/** What climbing a step costs in meters on top of walking it (0 on flat ground and ramps, Infinity up or down a bare wall). */
export function climbCost(s: BattleState, from: Cell, to: Cell, rules: Pick<StepRules, 'ninjaJump'>): number {
  const g = gridFor(s.mapId);
  if (!inGrid(g, from) || !inGrid(g, to)) return 0;
  const i0 = idx(g, from);
  const i1 = idx(g, to);
  const dl = g.level[i1] - g.level[i0];
  const up = rules.ninjaJump ? JUMP_UP : CLIMB_UP;
  const down = rules.ninjaJump ? JUMP_DOWN : CLIMB_DOWN;
  // A ladder (or vines): climbed rung by rung, every bit of the height paid.
  if (g.climb[i0] || g.climb[i1]) return dl > 0 ? dl * up : -dl * down;
  if (Math.abs(dl) < CLIFF || (g.ramp[i0] && g.ramp[i1])) return 0;
  const levels = Math.round(Math.abs(dl));
  if (levels >= WALL_LEVELS && !rules.ninjaJump) return Infinity;
  return levels * (dl > 0 ? up : down);
}

/** What one step costs in meters (Infinity if it can't be taken). */
export function stepCost(s: BattleState, from: Cell, to: Cell, diag: boolean, rules: StepRules): number {
  const g = gridFor(s.mapId);
  if (!inGrid(g, to) || cellBlocked(s, to)) return Infinity;
  // No cutting corners past a blocked cell.
  if (diag && (cellBlocked(s, { c: to.c, r: from.r }) || cellBlocked(s, { c: from.c, r: to.r }))) return Infinity;
  const i1 = idx(g, to);
  let cost = diag ? diagonalCost(rules.diagonals) : CELL;
  const water = g.water[i1];
  if (water === 1) cost *= 2;
  else if (water === 2 && !rules.waterWalk) cost *= 2;
  cost += climbCost(s, from, to, rules);
  // Ground cracked by a charged ninja's steps is difficult terrain (battle/charged.ts).
  if (s.cracks && crackKey(to) in s.cracks) cost *= 2;
  if (rules.dragging) cost *= 2;
  return cost;
}

export interface Reach {
  start: Cell;
  /** The cheapest cost to reach each cell index. */
  cost: Map<number, number>;
  /** The cell (index) each reached cell was stepped onto from. */
  prev: Map<number, number>;
}

/**
 * Every cell a unit can reach with `budget` meters (Dijkstra over the cells). Allies can be walked
 * through but not stood on; enemies block.
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
  const prev = new Map<number, number>();
  const cost = new Map<number, number>();
  // Each cell's path at true length: of two paths that cost the same (5-5-5 has many), the
  // straighter one is kept, so the path shown doesn't zigzag.
  const len = new Map<number, number>();
  const s0 = idx(g, start);
  cost.set(s0, 0);
  len.set(s0, 0);
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
    if (c0 > (cost.get(i0) ?? Infinity) + 1e-9) continue;
    const cc = { c: i0 % g.cols, r: Math.floor(i0 / g.cols) };
    for (const [dc, dr] of DIRS) {
      const nc = { c: cc.c + dc, r: cc.r + dr };
      if (!inGrid(g, nc)) continue;
      const ni = idx(g, nc);
      const who = occ.get(ni);
      if (who && who.id !== unit.id && who.team !== unit.team && !who.down) continue;
      const diag = dc !== 0 && dr !== 0;
      const step = stepCost(s, cc, nc, diag, r);
      if (!isFinite(step)) continue;
      const nc0 = c0 + step;
      if (nc0 > budget + 1e-6) continue;
      const was = cost.get(ni) ?? Infinity;
      const nl = len.get(i0)! + (diag ? CELL * Math.SQRT2 : CELL);
      if (nc0 > was + 1e-9 || (nc0 > was - 1e-9 && nl >= (len.get(ni) ?? Infinity) - 1e-9)) continue;
      cost.set(ni, Math.min(nc0, was));
      len.set(ni, nl);
      prev.set(ni, i0);
      push([nc0, ni]);
    }
  }
  return { start, cost, prev };
}

/** Cells a unit may end its move on (reachable, not on a ladder and not taken by another unit). */
export function canStop(s: BattleState, unit: Unit, c: Cell, occ = occupancy(s)): boolean {
  const g = gridFor(s.mapId);
  if (!inGrid(g, c)) return false;
  const i = idx(g, c);
  if (g.climb[i]) return false;
  const who = occ.get(i);
  return !who || who.id === unit.id;
}

/** The best free cell between `min` and `max` meters from a point (dry, open, off ladders, nobody on it). */
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
  for (let p = reach.prev.get(i); p !== undefined; p = reach.prev.get(i)) {
    out.push({ c: i % g.cols, r: Math.floor(i / g.cols) });
    i = p;
  }
  return out.reverse();
}

/** What walking a path costs: the meters, and the part of them spent climbing. */
export interface WalkCost {
  total: number;
  climb: number;
}

/** What a path costs a unit (the same rules as reachable). */
export function walkCost(s: BattleState, unit: Unit, path: Cell[], rules?: Partial<StepRules>): WalkCost {
  const r: StepRules = { waterWalk: unit.cond.waterWalk || unit.chakra >= 2, ninjaJump: !!unit.cond.ninjaJump, ...rules };
  let at = cellOf(unit.pos);
  let total = 0;
  let climb = 0;
  for (const c of path) {
    total += stepCost(s, at, c, at.c !== c.c && at.r !== c.r, r);
    climb += climbCost(s, at, c, r) * (r.dragging ? 2 : 1);
    at = c;
  }
  return { total, climb };
}

/** Meters a path costs for a unit (the same rules as reachable). */
export function pathCost(s: BattleState, unit: Unit, path: Cell[], rules?: Partial<StepRules>): number {
  return walkCost(s, unit, path, rules).total;
}

/** What a unit's next step costs. */
export const unitStepCost = (s: BattleState, _u: Unit, from: Cell, to: Cell, rules: StepRules): number => stepCost(s, from, to, from.c !== to.c && from.r !== to.r, rules);

/** The path passes over deep water (the unit pays 2 chakra to walk on it, or swims). */
export function pathTouchesDeep(s: BattleState, path: Cell[]): boolean {
  const g = gridFor(s.mapId);
  return path.some((c) => g.water[idx(g, c)] === 2);
}

export const ptOf = (c: Cell): Pt => cellCenter(c);
