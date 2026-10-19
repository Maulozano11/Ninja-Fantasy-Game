// A battle map: its geometry (levels, water, ramps), the props on it with what they do in battle,
// the hidden navigation grid (0.5 m cells) and the sight, cover and projection queries.

import type { BattleState, Cell, PropDef, PropRules, Pt, Wall, WaterKind } from './types';

export interface MapDef {
  id: string;
  widthM: number;
  depthM: number;
  /** Projection: 1 m across = perM px, 1 m of depth = perMDepth px, one level = level px. */
  px: { perM: number; perMDepth: number; level: number; backY: number; width: number; height: number };
  levelAt(x: number, z: number): number;
  isRamp(x: number, z: number): boolean;
  waterAt(x: number, z: number): WaterKind;
  walkable(x: number, z: number): boolean;
  props: PropDef[];
  /** Map edges a party can flee through. */
  exits: { left: boolean; right: boolean };
  bridge?: { x0: number; x1: number; z0: number; z1: number };
  river?: (z: number) => { c: number; hw: number };
}

export const CELL = 0.5;

const R = (radius: number, cover: 0 | 2 | 5, o: Partial<PropRules> = {}): PropRules => ({
  radius,
  cover,
  blocksSight: false,
  hideSpot: false,
  passable: false,
  ...o,
});

/** What each kind of prop does in battle (the sprite manifests' tags, made concrete). */
export const PROP_RULES: Record<string, PropRules & { halfLen?: number }> = {
  'trees/oak': R(0.45, 2, { blocksSight: true, flammable: true }),
  'trees/maple': R(0.4, 2, { blocksSight: true, flammable: true }),
  'trees/pine': R(0.35, 2, { blocksSight: true, flammable: true }),
  'trees/bamboo': R(0.7, 2, { blocksSight: true, hideSpot: true, passable: true, flammable: true }),
  'trees/stump': R(0.35, 2),
  'plants/bush_round': R(0.65, 2, { hideSpot: true, passable: true, flammable: true }),
  'plants/bush_wide': R(0.95, 2, { hideSpot: true, passable: true, flammable: true }),
  'plants/bush_flower': R(0.65, 2, { hideSpot: true, passable: true, flammable: true }),
  'plants/tall_grass': R(0.65, 0, { hideSpot: true, passable: true, flammable: true }),
  'plants/reeds': R(0.5, 0, { hideSpot: true, passable: true }),
  'plants/fern': R(0, 0, { passable: true }),
  'plants/flowers': R(0, 0, { passable: true }),
  'plants/lily_pads': R(0, 0, { passable: true }),
  'plants/mushroom_log': R(0.85, 2, { flammable: true }),
  'landmarks/stone_lantern': R(0.3, 2),
  'landmarks/signpost': R(0.15, 0),
  'landmarks/fence': { ...R(0.25, 2, { hp: 12 }), halfLen: 1.1 },
  'landmarks/fence_bamboo': { ...R(0.25, 2, { blocksSight: true, hp: 12 }), halfLen: 1.1 },
  'landmarks/boulder': R(0.95, 5),
  'landmarks/rock': R(0.45, 2),
  'landmarks/rocks_small': R(0, 0, { passable: true }),
  'landmarks/river_stones': R(0, 0, { passable: true }),
  'landmarks/hokora': R(0.4, 2),
  'camp/campfire': R(0.5, 0),
  'camp/smoke': R(0, 0, { passable: true }),
  'camp/tent': R(1.35, 5, { blocksSight: true, flammable: true, hp: 30 }),
  'camp/barrel': R(0.32, 2, { hp: 10 }),
  'camp/barrel_explosive': R(0.32, 2, { hp: 6, explosive: true }),
  'camp/crate': R(0.42, 2, { hp: 12 }),
  'camp/crate_stack': R(0.6, 5, { blocksSight: true, hp: 25 }),
  'camp/sacks': R(0.6, 2),
  'camp/weapon_rack': R(0.4, 0, { hp: 10 }),
};

const ANIMAL: PropRules = R(0, 0, { passable: true, animal: true });

export function propRules(p: PropDef): PropRules & { halfLen?: number } {
  if (p.group === 'animals') return ANIMAL;
  return PROP_RULES[`${p.group}/${p.name}`] ?? R(0, 0, { passable: true });
}

/** The derived navigation grid of a map. */
export interface Grid {
  map: MapDef;
  cols: number;
  rows: number;
  level: Float32Array;
  ramp: Uint8Array;
  /** 0 none, 1 shallow, 2 deep. */
  water: Uint8Array;
  /** Inside the playable ground. */
  inside: Uint8Array;
  /** The prop that blocks the cell, or -1. */
  block: Int16Array;
  /** The hide-spot prop covering the cell, or -1. */
  hide: Int16Array;
}

const grids = new Map<string, Grid>();
const maps = new Map<string, MapDef>();

export function registerMap(map: MapDef): void {
  maps.set(map.id, map);
}

export function getMap(id: string): MapDef {
  const m = maps.get(id);
  if (!m) throw new Error(`Unknown map ${id}`);
  return m;
}

export const cellCenter = (c: Cell): Pt => ({ x: (c.c + 0.5) * CELL, z: (c.r + 0.5) * CELL });
export const cellOf = (p: Pt): Cell => ({ c: Math.floor(p.x / CELL), r: Math.floor(p.z / CELL) });
export const sameCell = (a: Cell, b: Cell): boolean => a.c === b.c && a.r === b.r;
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Distance from p to the segment a-b (meters). */
export function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
}

export function gridFor(mapId: string): Grid {
  const cached = grids.get(mapId);
  if (cached) return cached;
  const map = getMap(mapId);
  const cols = Math.ceil(map.widthM / CELL);
  const rows = Math.ceil(map.depthM / CELL);
  const n = cols * rows;
  const g: Grid = {
    map,
    cols,
    rows,
    level: new Float32Array(n),
    ramp: new Uint8Array(n),
    water: new Uint8Array(n),
    inside: new Uint8Array(n),
    block: new Int16Array(n).fill(-1),
    hide: new Int16Array(n).fill(-1),
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const { x, z } = cellCenter({ c, r });
      g.level[i] = map.levelAt(x, z);
      g.ramp[i] = map.isRamp(x, z) ? 1 : 0;
      const w = map.waterAt(x, z);
      g.water[i] = w === 'deep' ? 2 : w === 'shallow' ? 1 : 0;
      g.inside[i] = map.walkable(x, z) ? 1 : 0;
    }
  }
  map.props.forEach((p, pi) => {
    const rules = propRules(p);
    if (rules.radius <= 0) return;
    const reach = rules.radius + (rules.halfLen ?? 0);
    const c0 = Math.max(0, Math.floor((p.x - reach) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((p.x + reach) / CELL));
    const r0 = Math.max(0, Math.floor((p.z - reach) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((p.z + reach) / CELL));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const ctr = cellCenter({ c, r });
        const d = rules.halfLen
          ? segDist(ctr, { x: p.x - rules.halfLen, z: p.z }, { x: p.x + rules.halfLen, z: p.z })
          : dist(ctr, p);
        if (d > rules.radius) continue;
        const i = r * cols + c;
        if (rules.hideSpot) g.hide[i] = pi;
        else if (!rules.passable) g.block[i] = pi;
      }
    }
  });
  grids.set(mapId, g);
  return g;
}

export const idx = (g: Grid, c: Cell): number => c.r * g.cols + c.c;
export const inGrid = (g: Grid, c: Cell): boolean => c.c >= 0 && c.r >= 0 && c.c < g.cols && c.r < g.rows;

/** Terrain level at a point (fractional on ramps and steps). */
export const levelAtPt = (s: BattleState, p: Pt): number => {
  const g = gridFor(s.mapId);
  const c = cellOf(p);
  return inGrid(g, c) ? g.level[idx(g, c)] : 0;
};

export const waterAtPt = (s: BattleState, p: Pt): 0 | 1 | 2 => {
  const g = gridFor(s.mapId);
  const c = cellOf(p);
  return inGrid(g, c) ? (g.water[idx(g, c)] as 0 | 1 | 2) : 0;
};

/** The hide-spot prop at a point (a bush, tall grass, reeds), or -1. */
export function hideSpotAt(s: BattleState, p: Pt): number {
  const g = gridFor(s.mapId);
  const c = cellOf(p);
  if (!inGrid(g, c)) return -1;
  const h = g.hide[idx(g, c)];
  return h >= 0 && !s.props[h]?.destroyed ? h : -1;
}

/** Half the side of a Kōton metal block (1.5 m, one of the owner's squares). */
export const BLOCK_HALF = 0.75;

/** A cell centre inside a metal block: exactly the 3 × 3 cells around the cell it stands on. */
const inBlock = (w: Wall, p: Pt): boolean => Math.max(Math.abs(p.x - w.a.x), Math.abs(p.z - w.a.z)) < BLOCK_HALF;

/** A static prop, a jutsu wall or a metal block stands in the cell. */
export function cellBlocked(s: BattleState, c: Cell): boolean {
  const g = gridFor(s.mapId);
  if (!inGrid(g, c)) return true;
  const i = idx(g, c);
  if (!g.inside[i]) return true;
  const b = g.block[i];
  if (b >= 0 && !s.props[b]?.destroyed) return true;
  if (s.walls.length) {
    const ctr = cellCenter(c);
    for (const w of s.walls) if (w.kind === 'metalBlock' ? inBlock(w, ctr) : segDist(ctr, w.a, w.b) < 0.35) return true;
  }
  return false;
}

/** Map pixels (1x) of a ground point. */
export function toScreen(map: MapDef, x: number, z: number, level: number): { X: number; Y: number } {
  return { X: x * map.px.perM, Y: map.px.backY + z * map.px.perMDepth - level * map.px.level };
}

function circleHitsSegment(c: Pt, r: number, a: Pt, b: Pt): boolean {
  return segDist(c, a, b) < r;
}

/** Nothing that blocks sight stands between two points (trees, tents, stacked crates, earth and metal walls). */
export function lineOfSight(s: BattleState, a: Pt, b: Pt): boolean {
  const map = getMap(s.mapId);
  for (let i = 0; i < map.props.length; i++) {
    const p = map.props[i];
    const rules = propRules(p);
    if (!rules.blocksSight || s.props[i]?.destroyed) continue;
    if (dist(p, a) < rules.radius + 0.1 || dist(p, b) < rules.radius + 0.1) continue;
    if (rules.halfLen) {
      // A bamboo fence: a segment along x.
      const pa = { x: p.x - rules.halfLen, z: p.z };
      const pb = { x: p.x + rules.halfLen, z: p.z };
      if (segmentsCross(a, b, pa, pb)) return false;
    } else if (circleHitsSegment(p, rules.radius * 0.8, a, b)) return false;
  }
  for (const w of s.walls) if ((w.kind === 'earth' || w.kind === 'metal') && segmentsCross(a, b, w.a, w.b)) return false;
  return true;
}

/** Full cover: a Kōton metal wall stands between two points, and nothing gets past it. */
export const fullCoverBetween = (s: BattleState, a: Pt, b: Pt): boolean => s.walls.some((w) => w.kind === 'metal' && segmentsCross(a, b, w.a, w.b));

export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** The segment a-b passes through the square of half side `half` centred on c (slab clipping). */
function segmentHitsSquare(a: Pt, b: Pt, c: Pt, half: number): boolean {
  let t0 = 0;
  let t1 = 1;
  for (const [p, d, lo, hi] of [
    [a.x, b.x - a.x, c.x - half, c.x + half],
    [a.z, b.z - a.z, c.z - half, c.z + half],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return false;
      continue;
    }
    const u0 = (lo - p) / d;
    const u1 = (hi - p) / d;
    t0 = Math.max(t0, Math.min(u0, u1));
    t1 = Math.min(t1, Math.max(u0, u1));
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Cover a target has against an attacker: +2 (half) or +5 (three-quarters), from props, jutsu walls
 * and other creatures between them, judged from the attacker's line (cover the attacker stands
 * behind doesn't count).
 */
export function coverBetween(s: BattleState, from: Pt, to: Pt, ignore: string[] = []): 0 | 2 | 5 {
  const map = getMap(s.mapId);
  let cover: 0 | 2 | 5 = 0;
  const near = (p: Pt) => dist(p, from) < 0.9;
  for (let i = 0; i < map.props.length; i++) {
    const p = map.props[i];
    const rules = propRules(p);
    if (!rules.cover || s.props[i]?.destroyed || near(p)) continue;
    const hit = rules.halfLen
      ? segmentsCross(from, to, { x: p.x - rules.halfLen, z: p.z }, { x: p.x + rules.halfLen, z: p.z }) || segDist(to, { x: p.x - rules.halfLen, z: p.z }, { x: p.x + rules.halfLen, z: p.z }) < 0.6
      : circleHitsSegment(p, rules.radius + 0.15, from, to);
    if (hit && rules.cover > cover) cover = rules.cover;
  }
  for (const w of s.walls) {
    if (w.kind === 'metalBlock') {
      // Half cover, unless the attacker stands right behind the block itself.
      if (dist(w.a, from) >= 1.2 && segmentHitsSquare(from, to, w.a, BLOCK_HALF)) cover = Math.max(cover, 2) as 0 | 2 | 5;
    } else if (segmentsCross(from, to, w.a, w.b)) cover = Math.max(cover, w.kind === 'earth' || w.kind === 'metal' ? 5 : 2) as 0 | 2 | 5;
  }
  if (cover < 2) {
    for (const u of Object.values(s.units)) {
      if (ignore.includes(u.id) || u.down === 'fled' || u.down === 'dead' || (u.down && u.down !== 'downed')) continue;
      if (dist(u.pos, from) < 0.6 || dist(u.pos, to) < 0.6) continue;
      if (segDist(u.pos, from, to) < 0.35) {
        cover = 2;
        break;
      }
    }
  }
  return cover;
}
