// What the elements leave on the ground and do to each other there (the owner, 2026-10-21;
// docs/GAMEPLAY_DESIGN.md, "The elements on the ground"): water soaks the ground it passes over for a
// while, wet ground puts out flames and carries lightning to everyone standing on it, and fire on wet
// ground makes steam, which blinds and burns whoever is in it. Wind blows the steam away. Pure and
// seeded like the rest of the engine: the cells are kept in the state as plain data.
//
// Three more since 2026-10-28 (the owner, bringing his sci-fi design home: "refrigerante se refiere
// a hielo, que también lo añadiremos al de shinobi; combustible es como gasolina o aceite inflamable";
// "habrá jutsus de tierra relacionados al aceite y también una tierra que sería arena movediza estilo
// fango"): ice, which an ice jutsu leaves (wet ground freezes, water is used up): slippery, half speed
// to whoever starts a turn on it, conducting lightning like wet ground, melted back to wet by fire;
// oil, which an earth jutsu or a broken barrel spills: difficult terrain that blazes when fire touches
// it (the whole joined pool, for BLAZE_ROUNDS), put out by water or ice, with the oil used up when the
// blaze ends; mud (quicksand), difficult terrain that an earth jutsu leaves.

import type { AreaShape, BattleEvent, BattleState, Cell, OilCell, Pt, Unit } from './types';
import { CELL, cellBlocked, cellCenter, cellKey, cellOf, gridFor, idx, inGrid, keyCell, steamAt, waterAtPt } from './map';
import { inArea } from './jutsu';
import { damage, rollDiceExpr, savingThrow } from './combat';

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
/** Ice lasts as long as wet ground. */
export const ICE_ROUNDS = WET_ROUNDS;
/** The DEX save against slipping on ice (H1, 2026-10-28: "CD 13"). */
export const ICE_DC = 13;
/** How long a spilt pool of oil stays (H3: 3 rounds), and how long it blazes once lit (H4: 2). */
export const OIL_ROUNDS = 3;
export const BLAZE_ROUNDS = 2;
/** What blazing oil does to whoever is in it when it lights, starts a turn in it or walks in (H4: 2d6, DEX 13 for half). */
export const BLAZE_DICE = '2d6';
export const BLAZE_DC = 13;
/** How long quicksand mud stays. */
export const MUD_ROUNDS = 3;

export const iceAt = (s: BattleState, p: Pt): boolean => !!s.ice && cellKey(cellOf(p)) in s.ice;
export const oilAt = (s: BattleState, p: Pt): boolean => !!s.oil && cellKey(cellOf(p)) in s.oil;
export const blazeAt = (s: BattleState, p: Pt): boolean => !!s.oil?.[cellKey(cellOf(p))]?.blazing;
export const mudAt = (s: BattleState, p: Pt): boolean => !!s.mud && cellKey(cellOf(p)) in s.mud;
/** Lightning runs across wet ground and ice alike. */
const conducts = (s: BattleState, k: string): boolean => (!!s.wet && k in s.wet) || (!!s.ice && k in s.ice);

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
 * wall's cell stays dry): wet for `rounds` (WET_ROUNDS; the Dragon Tsunami's one more), or again for
 * that long if it was wet (never shorter than it still had). Steam it passes over stays (the water
 * doesn't cool it).
 */
export function soak(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[], rounds = WET_ROUNDS): string[] {
  // water on blazing oil puts the blaze out (the oil stays, floating)
  douseOil(s, area, by, ev);
  const cells = cellsInArea(s, area)
    .filter((c) => waterAtPt(s, cellCenter(c)) === 0 && !cellBlocked(s, c) && !(s.ice && cellKey(c) in s.ice))
    .map(cellKey);
  if (!cells.length) return [];
  s.wet = { ...(s.wet ?? {}) };
  for (const k of cells) s.wet[k] = Math.max(s.wet[k] ?? 0, rounds);
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
 * An ice jutsu freezes the ground its area covers: wet ground and dry ground alike (a river or a
 * pond, a wall's or a tree's cell stay as they are; the water of wet ground is used up). A blazing
 * pool it reaches goes out. Returns the frozen cells.
 */
export function freeze(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[], rounds = ICE_ROUNDS): string[] {
  douseOil(s, area, by, ev);
  const cells = cellsInArea(s, area)
    .filter((c) => waterAtPt(s, cellCenter(c)) === 0 && !cellBlocked(s, c))
    .map(cellKey);
  if (!cells.length) return [];
  const wasWet = s.wet ? cells.filter((k) => k in s.wet!) : [];
  if (wasWet.length) {
    s.wet = { ...s.wet };
    for (const k of wasWet) delete s.wet![k];
    ev.push({ t: 'ground', kind: 'wet', cells: wasWet, on: false, by });
  }
  s.ice = { ...(s.ice ?? {}) };
  for (const k of cells) s.ice[k] = Math.max(s.ice[k] ?? 0, rounds);
  ev.push({ t: 'ground', kind: 'ice', cells, on: true, by });
  return cells;
}

/** Fire melts the ice it reaches back to wet ground. Returns the melted cells. */
export function melt(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[]): string[] {
  if (!s.ice) return [];
  const cells = cellsInArea(s, area).map(cellKey).filter((k) => k in s.ice!);
  if (!cells.length) return [];
  s.ice = { ...s.ice };
  s.wet = { ...(s.wet ?? {}) };
  for (const k of cells) {
    delete s.ice[k];
    s.wet[k] = Math.max(s.wet[k] ?? 0, WET_ROUNDS);
  }
  ev.push({ t: 'ground', kind: 'ice', cells, on: false, by });
  ev.push({ t: 'ground', kind: 'wet', cells, on: true, by });
  return cells;
}

/**
 * Oil spills over the ground an area covers (an earth jutsu, a broken barrel): a pool for
 * OIL_ROUNDS, difficult terrain, that blazes when fire touches it. Deep water takes none.
 */
export function spill(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[], rounds = OIL_ROUNDS): string[] {
  const cells = cellsInArea(s, area)
    .filter((c) => waterAtPt(s, cellCenter(c)) !== 2 && !cellBlocked(s, c))
    .map(cellKey);
  if (!cells.length) return [];
  s.oil = { ...(s.oil ?? {}) };
  for (const k of cells) s.oil[k] = { ...(s.oil[k] ?? { by }), rounds: Math.max(s.oil[k]?.rounds ?? 0, rounds) };
  ev.push({ t: 'ground', kind: 'oil', cells, on: true, by });
  return cells;
}

/** The oil cells joined to `seeds` (8 ways round), lit or not. */
export function oilPatch(s: BattleState, seeds: string[]): Set<string> {
  const out = new Set<string>();
  if (!s.oil) return out;
  const g = gridFor(s.mapId);
  const todo = seeds.filter((k) => k in s.oil!);
  for (const k of todo) out.add(k);
  while (todo.length) {
    const { c, r } = keyCell(todo.pop()!);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const n = { c: c + dc, r: r + dr };
        const k = cellKey(n);
        if (!inGrid(g, n) || out.has(k) || !(k in s.oil)) continue;
        out.add(k);
        todo.push(k);
      }
  }
  return out;
}

/**
 * Fire on oil: the whole joined pool blazes for BLAZE_ROUNDS (the owner, H4: "arde: todo el charco
 * es fuego 2 rondas ... y expande a otros charcos contiguos"). Returns the cells that just caught,
 * so the caller can burn whoever stands in them (hazards.ts: BLAZE_DICE, DEX BLAZE_DC for half).
 */
export function ignite(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[]): string[] {
  if (!s.oil) return [];
  const seeds = cellsInArea(s, area).map(cellKey).filter((k) => k in s.oil!);
  const cells = [...oilPatch(s, seeds)].filter((k) => !s.oil![k].blazing);
  if (!cells.length) return [];
  s.oil = { ...s.oil };
  for (const k of cells) s.oil[k] = { ...s.oil[k], blazing: BLAZE_ROUNDS, by };
  // an ice cell under a blaze melts
  melt(s, area, by, ev);
  ev.push({ t: 'ground', kind: 'blaze', cells, on: true, by });
  ev.push({ t: 'note', key: 'oilBlazes', params: {} });
  return cells;
}

/** Water or ice over a blaze puts it out (the oil stays). Returns the cells put out. */
export function douseOil(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[]): string[] {
  if (!s.oil) return [];
  const seeds = cellsInArea(s, area).map(cellKey).filter((k) => s.oil![k]?.blazing);
  const cells = [...oilPatch(s, seeds)].filter((k) => s.oil![k].blazing);
  if (!cells.length) return [];
  s.oil = { ...s.oil };
  for (const k of cells) {
    const { blazing: _b, ...rest } = s.oil[k];
    s.oil[k] = rest;
  }
  ev.push({ t: 'ground', kind: 'blaze', cells, on: false, by });
  return cells;
}

/** An earth jutsu turns the ground to quicksand mud: difficult terrain for MUD_ROUNDS. */
export function mire(s: BattleState, area: AreaShape, by: string, ev: BattleEvent[], rounds = MUD_ROUNDS): string[] {
  const cells = cellsInArea(s, area)
    .filter((c) => waterAtPt(s, cellCenter(c)) === 0 && !cellBlocked(s, c))
    .map(cellKey);
  if (!cells.length) return [];
  s.mud = { ...(s.mud ?? {}) };
  for (const k of cells) s.mud[k] = Math.max(s.mud[k] ?? 0, rounds);
  ev.push({ t: 'ground', kind: 'mud', cells, on: true, by });
  return cells;
}

/**
 * Blazing oil burns whoever stands in it (when it lights, at the start of a turn in it, on walking
 * in): BLAZE_DICE fire, a DEX save against BLAZE_DC for half. The burns are the blaze's maker's.
 */
export function blazeBurns(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  if (!blazeAt(s, u.pos) || u.down) return;
  const by = s.oil![cellKey(cellOf(u.pos))].by;
  const roll = savingThrow(s, u, 'dex', BLAZE_DC);
  ev.push({ t: 'save', unit: u.id, what: 'blaze', roll, ab: 'dex' });
  const amount = rollDiceExpr(s, BLAZE_DICE);
  ev.push({ t: 'note', key: 'blazeBurns', params: { name: u.name } });
  damage(s, u, roll.success ? Math.floor(amount / 2) : amount, 'Fire', { source: by }, ev);
}

/**
 * Stepping onto ice: a DEX save against ICE_DC or the walker slips, falls prone and the move ends
 * there (H1). One save per walk: whoever keeps their feet stays on them for the rest of it.
 */
export function slips(s: BattleState, u: Unit, ev: BattleEvent[]): boolean {
  const roll = savingThrow(s, u, 'dex', ICE_DC);
  ev.push({ t: 'save', unit: u.id, what: 'ice', roll, ab: 'dex' });
  if (roll.success) return false;
  ev.push({ t: 'note', key: 'slipsOnIce', params: { name: u.name } });
  return true;
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

/** The wet and icy cells joined to `seeds` (8 ways round: a diagonal touch carries it too). */
export function wetPatch(s: BattleState, seeds: string[]): Set<string> {
  const out = new Set<string>();
  if (!s.wet && !s.ice) return out;
  const g = gridFor(s.mapId);
  const todo = seeds.filter((k) => conducts(s, k));
  for (const k of todo) out.add(k);
  while (todo.length) {
    const { c, r } = keyCell(todo.pop()!);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const n = { c: c + dc, r: r + dr };
        const k = cellKey(n);
        if (!inGrid(g, n) || out.has(k) || !conducts(s, k)) continue;
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
  if (!s.wet && !s.ice) return [];
  const keys = new Set<string>();
  if (area) for (const c of cellsInArea(s, area)) keys.add(cellKey(c));
  for (const p of points) keys.add(cellKey(cellOf(p)));
  return [...keys].filter((k) => conducts(s, k));
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
  if (s.ice) {
    const thawed: string[] = [];
    const next: Record<string, number> = {};
    for (const [k, n] of Object.entries(s.ice)) {
      if (n > 1) next[k] = n - 1;
      else thawed.push(k);
    }
    s.ice = next;
    if (thawed.length) ev.push({ t: 'ground', kind: 'ice', cells: thawed, on: false });
  }
  if (s.oil) {
    // a blaze counts its own rounds and burns the oil up when it ends; unlit oil seeps away
    const out: string[] = [];
    const gone: string[] = [];
    const next: Record<string, OilCell> = {};
    for (const [k, v] of Object.entries(s.oil)) {
      if (v.blazing) {
        if (v.blazing > 1) next[k] = { ...v, blazing: v.blazing - 1 };
        else {
          out.push(k);
          gone.push(k);
        }
      } else if (v.rounds > 1) next[k] = { ...v, rounds: v.rounds - 1 };
      else gone.push(k);
    }
    s.oil = next;
    if (out.length) ev.push({ t: 'ground', kind: 'blaze', cells: out, on: false });
    if (gone.length) ev.push({ t: 'ground', kind: 'oil', cells: gone, on: false });
  }
  if (s.mud) {
    const dried: string[] = [];
    const next: Record<string, number> = {};
    for (const [k, n] of Object.entries(s.mud)) {
      if (n > 1) next[k] = n - 1;
      else dried.push(k);
    }
    s.mud = next;
    if (dried.length) ev.push({ t: 'ground', kind: 'mud', cells: dried, on: false });
  }
}
