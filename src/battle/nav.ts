// Movement on the hidden 0.5 m grid: what a step costs (diagonals, water, climbing, the ninja jump),
// where a unit can reach with the movement it has left, the path there, and free spots to land on
// (Kawarimi, a flash-in). Movement is shown in meters.

import type { BattleState, Cell, Pt, Unit } from './types';
import { CELL, LEVEL_M, cellBlocked, cellCenter, cellOf, dist, gridFor, idx, inGrid } from './map';

/**
 * How a diagonal step is paid (docs/GAMEPLAY_DESIGN.md, "Diagonals: 5-10-5"):
 * - '5-10-5': the 5e variant the owner is trying (2026-10-22, "vamos a probar 5-10-5"). Diagonal
 *   steps alternate between one cell (0.5 m) and two (1 m): the 1st, 3rd, 5th... cost 0.5 m, the
 *   2nd, 4th... 1 m, counted over the whole turn. On the 5e grid a 5 ft square is 1.5 m (3 of our
 *   cells) and its diagonals cost 5, 10, 5 ft: the same 1.5 times a straight step on average.
 * - 'true': a diagonal step costs its true length, sqrt 2 cells (0.71 m), as before.
 * The one switch: change it here to compare the two.
 */
export type DiagonalRule = '5-10-5' | 'true';
export const DIAGONAL_RULE: DiagonalRule = '5-10-5';

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

/** A diagonal step's base cost in meters: `odd` when an odd number of diagonals came before it this turn. */
export function diagonalCost(odd: boolean, rule: DiagonalRule = DIAGONAL_RULE): number {
  return rule === 'true' ? CELL * Math.SQRT2 : odd ? 2 * CELL : CELL;
}

/** The diagonal count's parity after a step: under 5-10-5 a diagonal flips it. */
const afterStep = (odd: boolean, diag: boolean, rule: DiagonalRule = DIAGONAL_RULE): boolean => (diag && rule === '5-10-5' ? !odd : odd);

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
  /** How diagonals are paid (default DIAGONAL_RULE; the move preview also shows the other). */
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

/**
 * What one step costs in meters (Infinity if it can't be taken). `odd`: an odd number of diagonal
 * steps came before it this turn (5-10-5).
 */
export function stepCost(s: BattleState, from: Cell, to: Cell, diag: boolean, rules: StepRules, odd = false): number {
  const g = gridFor(s.mapId);
  if (!inGrid(g, to) || cellBlocked(s, to)) return Infinity;
  // No cutting corners past a blocked cell.
  if (diag && (cellBlocked(s, { c: to.c, r: from.r }) || cellBlocked(s, { c: from.c, r: to.r }))) return Infinity;
  const i1 = idx(g, to);
  let cost = diag ? diagonalCost(odd, rules.diagonals) : CELL;
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
  /**
   * Where each search node came from. A node is a cell with the diagonal parity it was reached at
   * (index * 2, + 1 when odd): under 5-10-5 the cheapest way to a cell may not be the best way on.
   */
  prev: Map<number, number>;
  /** The node at which each cell's cheapest cost was reached. */
  best: Map<number, number>;
}

/**
 * Every cell a unit can reach with `budget` meters (Dijkstra over the cells and the diagonal
 * parity). Allies can be walked through but not stood on; enemies block.
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
  const nodeCost = new Map<number, number>();
  const prev = new Map<number, number>();
  const cost = new Map<number, number>();
  const best = new Map<number, number>();
  const s0 = idx(g, start);
  const n0 = s0 * 2 + (unit.turn?.diag ? 1 : 0);
  nodeCost.set(n0, 0);
  cost.set(s0, 0);
  best.set(s0, n0);
  // A small binary heap of [cost, node].
  const heap: [number, number][] = [[0, n0]];
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
    const [c0, n] = pop();
    if (c0 > (nodeCost.get(n) ?? Infinity)) continue;
    const i0 = n >> 1;
    const odd = (n & 1) === 1;
    const cc = { c: i0 % g.cols, r: Math.floor(i0 / g.cols) };
    for (const [dc, dr] of DIRS) {
      const nc = { c: cc.c + dc, r: cc.r + dr };
      if (!inGrid(g, nc)) continue;
      const ni = idx(g, nc);
      const who = occ.get(ni);
      if (who && who.id !== unit.id && who.team !== unit.team && !who.down) continue;
      const diag = dc !== 0 && dr !== 0;
      const step = stepCost(s, cc, nc, diag, r, odd);
      if (!isFinite(step)) continue;
      const nc0 = c0 + step;
      const nn = ni * 2 + (afterStep(odd, diag, r.diagonals) ? 1 : 0);
      if (nc0 > budget + 1e-6 || nc0 >= (nodeCost.get(nn) ?? Infinity)) continue;
      nodeCost.set(nn, nc0);
      prev.set(nn, n);
      if (nc0 < (cost.get(ni) ?? Infinity)) {
        cost.set(ni, nc0);
        best.set(ni, nn);
      }
      push([nc0, nn]);
    }
  }
  return { start, cost, prev, best };
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
  let n = reach.best.get(idx(g, target));
  if (n === undefined) return null;
  const out: Cell[] = [];
  for (let p = reach.prev.get(n); p !== undefined; p = reach.prev.get(n)) {
    const i = n >> 1;
    out.push({ c: i % g.cols, r: Math.floor(i / g.cols) });
    n = p;
  }
  return out.reverse();
}

/** What walking a path costs: the meters, the part of them spent climbing, and the diagonal parity after it. */
export interface WalkCost {
  total: number;
  climb: number;
  odd: boolean;
}

/** What a path costs a unit (the same rules as reachable), from the diagonal parity of its turn. */
export function walkCost(s: BattleState, unit: Unit, path: Cell[], rules?: Partial<StepRules>): WalkCost {
  const r: StepRules = { waterWalk: unit.cond.waterWalk || unit.chakra >= 2, ninjaJump: !!unit.cond.ninjaJump, ...rules };
  let at = cellOf(unit.pos);
  let odd = !!unit.turn?.diag;
  let total = 0;
  let climb = 0;
  for (const c of path) {
    const diag = at.c !== c.c && at.r !== c.r;
    total += stepCost(s, at, c, diag, r, odd);
    climb += climbCost(s, at, c, r) * (r.dragging ? 2 : 1);
    odd = afterStep(odd, diag, r.diagonals);
    at = c;
  }
  return { total, climb, odd };
}

/** Meters a path costs for a unit (the same rules as reachable). */
export function pathCost(s: BattleState, unit: Unit, path: Cell[], rules?: Partial<StepRules>): number {
  return walkCost(s, unit, path, rules).total;
}

/** What a unit's next step costs, at the diagonal parity of its turn so far. */
export const unitStepCost = (s: BattleState, u: Unit, from: Cell, to: Cell, rules: StepRules): number =>
  stepCost(s, from, to, from.c !== to.c && from.r !== to.r, rules, !!u.turn.diag);

/** A unit took a step: its turn's diagonal parity moves on (5-10-5). */
export function countStep(u: Unit, from: Cell, to: Cell, rules?: Partial<StepRules>): void {
  if (afterStep(!!u.turn.diag, from.c !== to.c && from.r !== to.r, rules?.diagonals)) u.turn.diag = 1;
  else delete u.turn.diag;
}

/** The path passes over deep water (the unit pays 2 chakra to walk on it, or swims). */
export function pathTouchesDeep(s: BattleState, path: Cell[]): boolean {
  const g = gridFor(s.mapId);
  return path.some((c) => g.water[idx(g, c)] === 2);
}

export const ptOf = (c: Cell): Pt => cellCenter(c);
