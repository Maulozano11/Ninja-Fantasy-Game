// What the elements leave on the ground and do to each other there (the owner, 2026-10-21;
// docs/GAMEPLAY_DESIGN.md, "The elements on the ground"): water soaks the ground it passes over for a
// while, wet ground puts out flames and carries lightning to everyone standing on it, and fire on wet
// ground makes steam, which blinds and burns whoever is in it. Wind blows the steam away. Pure and
// seeded like the rest of the engine: the cells are kept in the state as plain data.

import type { AreaShape, BattleEvent, BattleState, Cell, Pt, Unit } from './types';
import { CELL, cellBlocked, cellCenter, cellKey, cellOf, gridFor, idx, inGrid, keyCell, steamAt, waterAtPt } from './map';
import { inArea } from './jutsu';
import { damage, rollDiceExpr } from './combat';

/**
 * How long wet ground stays wet: the rest of the round and two more (it dries as the third new round
 * begins), so everyone has at least two turns with it, the owner's "por 2 turnos" (he kept it:
 * "el resto de la ronda y dos mas").
 */
export const WET_ROUNDS = 3;
/**
 * How long steam hangs: the rest of the round and one more (it thins away as the second new round
 * begins). The owner: "dura resto de la ronda y 1 mas".
 */
export const STEAM_ROUNDS = 2;
/** What steam does to whoever starts a turn in it (our proposal, which he kept). */
export const STEAM_DICE = '1d6';

/** The cells (inside the map) whose middle lies in an area. */
export function cellsInArea(s: BattleState, area: AreaShape): Cell[] {
  const g = gridFor(s.mapId);
  let x0: number, x1: number, z0: number, z1: number;
  if (area.kind === 'circle') {
    [x0, x1, z0, z1] = [area.center.x - area.radius, area.center.x + area.radius, area.center.z - area.radius, area.center.z + area.radius];
  } else {
    const reach = area.length + (area.kind === 'line' ? area.width : 0);
    [x0, x1, z0, z1] = [area.origin.x - reach, area.origin.x + reach, area.origin.z - reach, area.origin.z + reach];
  }
  const out: Cell[] = [];
  for (let r = Math.max(0, Math.floor(z0 / CELL)); r <= Math.min(g.rows - 1, Math.floor(z1 / CELL)); r++)
    for (let c = Math.max(0, Math.floor(x0 / CELL)); c <= Math.min(g.cols - 1, Math.floor(x1 / CELL)); c++) {
      const cell = { c, r };
      if (g.inside[idx(g, cell)] && inArea(area, cellCenter(cell), 0)) out.push(cell);
    }
  return out;
}

/**
 * A water jutsu soaks the ground its area covers (a river or a pond is water already; a tree's or a
 * wall's cell stays dry): wet for WET_ROUNDS, or again for that long if it was wet. Steam it passes
 * over stays (the water doesn't cool it).
 */
export function soak(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[]): string[] {
  const cells = cellsInArea(s, area)
    .filter((c) => waterAtPt(s, cellCenter(c)) === 0 && !cellBlocked(s, c))
    .map(cellKey);
  if (!cells.length) return [];
  s.wet = { ...(s.wet ?? {}) };
  for (const k of cells) s.wet[k] = WET_ROUNDS;
  ev.push({ t: 'ground', kind: 'wet', cells, on: true, by });
  return cells;
}

/**
 * Fire on wet ground (a fire jutsu, an explosion): the wet cells it reaches turn to steam (the
 * water is used up). Returns the steaming cells.
 */
export function steamUp(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[]): string[] {
  if (!s.wet) return [];
  const cells = cellsInArea(s, area).map(cellKey).filter((k) => k in s.wet!);
  if (!cells.length) return [];
  s.wet = { ...s.wet };
  s.steam = { ...(s.steam ?? {}) };
  for (const k of cells) {
    delete s.wet[k];
    s.steam[k] = { rounds: STEAM_ROUNDS, by };
  }
  ev.push({ t: 'ground', kind: 'wet', cells, on: false, by });
  ev.push({ t: 'ground', kind: 'steam', cells, on: true, by });
  ev.push({ t: 'note', key: 'steamRises', params: {} });
  // Whoever hid in the steam is still hidden; whoever stands in it now can't be seen (lineOfSight).
  return cells;
}

/**
 * Wind blows the steam it reaches away (the owner: "puede ser eliminada con ataques elementales de
 * aire"): every wind attack, over its area (a cone, a line, a circle, a gale starting to turn) or, a
 * single-target one, along its path to the target; plus the cells at `also` (the caster's own, which
 * a cone or a line starts beside). It drifts off away from `from` (the caster, or a circle's middle).
 */
export function blowSteam(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[], from: Pt = areaFrom(area), also: Pt[] = []): string[] {
  if (!s.steam) return [];
  const keys = new Set(cellsInArea(s, area).map(cellKey));
  for (const p of also) keys.add(cellKey(cellOf(p)));
  const cells = [...keys].filter((k) => k in s.steam!);
  if (!cells.length) return [];
  s.steam = { ...s.steam };
  for (const k of cells) delete s.steam[k];
  ev.push({ t: 'ground', kind: 'steam', cells, on: false, by, blown: { ...from } });
  ev.push({ t: 'note', key: 'steamBlown', params: {} });
  return cells;
}

/** Where an area's wind blows from: a circle's middle, a cone's or a line's origin. */
const areaFrom = (area: AreaShape): Pt => (area.kind === 'circle' ? area.center : area.origin);

/** The path of a single-target jutsu, from the caster to its target, as a 1 m wide line. */
export function pathArea(from: Pt, to: Pt): AreaShape {
  return { kind: 'line', origin: from, dir: (Math.atan2(to.z - from.z, to.x - from.x) * 180) / Math.PI, length: Math.hypot(to.x - from.x, to.z - from.z), width: 1 };
}

/** The wet cells joined to `seeds` (8 ways round: a diagonal touch carries it too). */
export function wetPatch(s: BattleState, seeds: string[]): Set<string> {
  const out = new Set<string>();
  if (!s.wet) return out;
  const g = gridFor(s.mapId);
  const todo = seeds.filter((k) => k in s.wet!);
  for (const k of todo) out.add(k);
  while (todo.length) {
    const { c, r } = keyCell(todo.pop()!);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const n = { c: c + dc, r: r + dr };
        const k = cellKey(n);
        if (!inGrid(g, n) || out.has(k) || !(k in s.wet)) continue;
        out.add(k);
        todo.push(k);
      }
  }
  return out;
}

/**
 * Where lightning touches wet ground: the cells of its area, and the points it strikes (the ones it
 * reaches, where a circle bursts). Only the wet ones count.
 */
export function lightningSeeds(s: BattleState, area: AreaShape | null, points: Pt[]): string[] {
  if (!s.wet) return [];
  const keys = new Set<string>();
  if (area) for (const c of cellsInArea(s, area)) keys.add(cellKey(c));
  for (const p of points) keys.add(cellKey(cellOf(p)));
  return [...keys].filter((k) => k in s.wet!);
}

/** The units standing on a wet patch (not in `skip`): hydra bodies and severed heads aside, like the water's. */
export function unitsOnPatch(s: BattleState, patch: Set<string>, skip: string[] = []): Unit[] {
  if (!patch.size) return [];
  return Object.values(s.units).filter((u) => u.down !== 'dead' && u.down !== 'fled' && u.down !== 'ko' && !skip.includes(u.id) && patch.has(cellKey(cellOf(u.pos))));
}

/** Steam burns whoever starts a turn in it (STEAM_DICE fire, no save); its burns are its maker's. */
export function steamBurns(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  if (!steamAt(s, u.pos) || u.down) return;
  const by = s.steam![cellKey(cellOf(u.pos))].by;
  ev.push({ t: 'note', key: 'steamBurns', params: { name: u.name } });
  damage(s, u, rollDiceExpr(s, STEAM_DICE), 'Fire', { source: by }, ev);
}

/** A new round: wet ground dries and steam thins away when their rounds run out. */
export function tickGround(s: BattleState, ev: BattleEvent[]): void {
  if (s.wet) {
    const dry: string[] = [];
    const next: Record<string, number> = {};
    for (const [k, n] of Object.entries(s.wet)) {
      if (n > 1) next[k] = n - 1;
      else dry.push(k);
    }
    s.wet = next;
    if (dry.length) ev.push({ t: 'ground', kind: 'wet', cells: dry, on: false });
  }
  if (s.steam) {
    const gone: string[] = [];
    const next: Record<string, { rounds: number; by: string }> = {};
    for (const [k, v] of Object.entries(s.steam)) {
      if (v.rounds > 1) next[k] = { ...v, rounds: v.rounds - 1 };
      else gone.push(k);
    }
    s.steam = next;
    if (gone.length) ev.push({ t: 'ground', kind: 'steam', cells: gone, on: false });
  }
}
