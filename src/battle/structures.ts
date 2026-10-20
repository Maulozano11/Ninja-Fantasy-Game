// Structures with HP on the battle map: the Kōton metal walls and blocks (docs/CLANS_DESIGN.md).
// Modular Architecture raises them, two at most for each Kōton. They block like jutsu walls
// (map.ts), take damage from attacks and from the areas that reach them, and are gone at 0 HP.
// Earth and water walls stay unbreakable.

import { abilityMod, combineAdvantage } from '../rules/checks';
import type { Advantage } from '../rules/checks';
import type { AreaShape, BattleEvent, BattleState, Pt, Unit, Wall } from './types';
import { BLOCK_HALF, CELL, cellCenter, cellOf, dist, gridFor, idx, inGrid, lineOfSight, segDist, wallCovers } from './map';
import { occupancy } from './nav';
import { inArea } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { hitChance, midpoint } from './combat';
import { KUNAI, KUNAI_LONG, wielded } from './units';

/** Every structure is AC 10, like the props that can be broken. */
export const STRUCTURE_AC = 10;
/** A Kōton structure's HP, and how many a Kōton keeps standing at once. */
export const STRUCTURE_HP = 20;
export const MAX_STRUCTURES = 2;

/** Kōton structures can be broken; earth and water walls can't. */
export const breakable = (w: Wall): boolean => w.kind === 'metal' || w.kind === 'metalBlock';

/** How far a structure reaches out from its line: a wall's half thickness, a block's half side. */
const thickness = (w: Wall): number => (w.kind === 'metalBlock' ? BLOCK_HALF : 0.35);

/** The point of a structure's line nearest to p (a block's is its centre). */
export function closestPoint(w: Wall, p: Pt): Pt {
  const dx = w.b.x - w.a.x;
  const dz = w.b.z - w.a.z;
  const l2 = dx * dx + dz * dz;
  if (l2 < 1e-9) return { ...w.a };
  const t = Math.max(0, Math.min(1, ((p.x - w.a.x) * dx + (p.z - w.a.z) * dz) / l2));
  return { x: w.a.x + dx * t, z: w.a.z + dz * t };
}

/** Where a blow or a kunai lands on a structure: the point of its surface facing p. */
export function faceToward(w: Wall, p: Pt): Pt {
  if (w.kind === 'metalBlock') {
    const clamp = (v: number, c: number) => Math.max(c - BLOCK_HALF, Math.min(c + BLOCK_HALF, v));
    return { x: clamp(p.x, w.a.x), z: clamp(p.z, w.a.z) };
  }
  const c = closestPoint(w, p);
  const d = dist(c, p);
  return d < 1e-9 ? c : { x: c.x + ((p.x - c.x) / d) * thickness(w), z: c.z + ((p.z - c.z) / d) * thickness(w) };
}

/** How far a point is from a structure's surface (0 on it). */
export function structureDist(w: Wall, p: Pt): number {
  if (w.kind === 'metalBlock') return Math.hypot(Math.max(0, Math.abs(p.x - w.a.x) - BLOCK_HALF), Math.max(0, Math.abs(p.z - w.a.z) - BLOCK_HALF));
  return Math.max(0, segDist(p, w.a, w.b) - thickness(w));
}

export interface StructureAttack {
  mod: number;
  adv: Advantage;
  chance: number;
  inRange: boolean;
  sight: boolean;
  /** Where the blow or the kunai lands. */
  at: Pt;
}

/**
 * Everything about an attack on a structure before rolling: AC 10, a blade reaches its surface, a
 * kunai flies to it in sight (with disadvantage beyond 9 m). A Ryusei's warp edge counts here too.
 */
export function structureAttack(s: BattleState, u: Unit, w: Wall, ranged: boolean): StructureAttack {
  const at = closestPoint(w, u.pos);
  const d = dist(u.pos, at);
  const mod = u.prof + abilityMod(ranged ? u.stats.dex : u.stats.str);
  const adv: Advantage = combineAdvantage(ranged && d > KUNAI.reach ? 'disadvantage' : 'none', u.cond.warpEdge ? 'advantage' : 'none');
  const inRange = ranged ? d <= KUNAI_LONG + 0.1 : d <= wielded(u).reach + thickness(w) + 0.1;
  // Aimed a hair short of the wall's face, so the wall itself doesn't hide it.
  const k = d > 0.1 ? 0.05 / d : 0;
  const sight = !ranged || lineOfSight(s, u.pos, { x: at.x + (u.pos.x - at.x) * k, z: at.z + (u.pos.z - at.z) * k });
  return { mod, adv, chance: hitChance(mod, STRUCTURE_AC, adv), inRange, sight, at };
}

/** Damage to a structure (no save): it loses that much HP and at 0 it breaks and is gone. */
export function damageStructure(s: BattleState, w: Wall, amount: number, ev: BattleEvent[], at: Pt = midpoint(w.a, w.b)): void {
  if (amount <= 0 || !s.walls.includes(w)) return;
  const lost = Math.min(w.hp, amount);
  w.hp -= lost;
  ev.push({ t: 'wallHit', wall: w.id, amount: lost, hp: w.hp, at });
  if (w.hp > 0) return;
  s.walls = s.walls.filter((x) => x.id !== w.id);
  ev.push({ t: 'wall', wall: { ...w }, on: false });
}

/** A structure some part of which is inside an area. */
function touches(area: AreaShape, w: Wall): boolean {
  const n = Math.max(1, Math.ceil(dist(w.a, w.b) / 0.25));
  for (let i = 0; i <= n; i++) {
    const p = { x: w.a.x + ((w.b.x - w.a.x) * i) / n, z: w.a.z + ((w.b.z - w.a.z) * i) / n };
    if (inArea(area, p, thickness(w))) return true;
  }
  return false;
}

/** An area jutsu or a blast: every breakable structure it reaches takes the rolled damage. */
export function hitStructuresIn(s: BattleState, area: AreaShape, amount: number, ev: BattleEvent[]): void {
  if (amount <= 0) return;
  const from = area.kind === 'circle' ? area.center : area.origin;
  for (const w of [...s.walls]) if (breakable(w) && touches(area, w)) damageStructure(s, w, amount, ev, closestPoint(w, from));
}

// --- Modular Architecture ------------------------------------------------------------------

/** A wall's ends: `length` meters standing across the line from `from` to `at`, centred on `at`. */
export function wallAcross(from: Pt, at: Pt, length: number): { a: Pt; b: Pt } {
  const dir = Math.atan2(at.z - from.z, at.x - from.x);
  const half = length / 2;
  const px = -Math.sin(dir);
  const pz = Math.cos(dir);
  return { a: { x: at.x + px * half, z: at.z + pz * half }, b: { x: at.x - px * half, z: at.z - pz * half } };
}

/**
 * The structure a Kōton raises at a point (the screen previews the same one): a block on the cell
 * under the point, or a 4.5 m wall across the caster's line, centred on it.
 */
export function structureAt(spec: JutsuSpec, from: Pt, at: Pt, owner: string, id: string): Wall {
  if (spec.special === 'metalBlock') {
    const c = cellCenter(cellOf(at));
    return { id, kind: 'metalBlock', a: c, b: { ...c }, hp: STRUCTURE_HP, maxHp: STRUCTURE_HP, owner };
  }
  return { id, kind: 'metal', ...wallAcross(from, at, spec.length ?? 4.5), hp: STRUCTURE_HP, maxHp: STRUCTURE_HP, owner };
}

/**
 * Why a structure can't stand there, or null: it would stand on someone (any unit, the hydra's bulk
 * too) or run off the map. Props and terrain under it are no obstacle, as for an earth wall.
 */
export function structureBlocker(s: BattleState, w: Wall): string | null {
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  const r = thickness(w) + CELL;
  const c0 = Math.floor((Math.min(w.a.x, w.b.x) - r) / CELL);
  const c1 = Math.floor((Math.max(w.a.x, w.b.x) + r) / CELL);
  const r0 = Math.floor((Math.min(w.a.z, w.b.z) - r) / CELL);
  const r1 = Math.floor((Math.max(w.a.z, w.b.z) + r) / CELL);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const c = { c: col, r: row };
      if (!wallCovers(w, cellCenter(c))) continue;
      if (!inGrid(g, c)) return 'outOfRange';
      if (occ.has(idx(g, c))) return 'occupied';
    }
  }
  return null;
}

/** The structures a Kōton has standing, oldest first. */
export const ownStructures = (s: BattleState, owner: string): Wall[] => s.walls.filter((w) => w.owner === owner && breakable(w));

/**
 * Modular Architecture: a structure of 20 HP rises, there until it is broken. A Kōton keeps two
 * standing at most: raising a third makes its oldest crumble.
 */
export function raiseStructure(s: BattleState, u: Unit, spec: JutsuSpec, at: Pt, ev: BattleEvent[]): void {
  const w = structureAt(spec, u.pos, at, u.id, `wall_${s.tick}_${u.id}`);
  s.walls.push(w);
  ev.push({ t: 'wall', wall: { ...w }, on: true });
  const own = ownStructures(s, u.id);
  for (const old of own.slice(0, Math.max(0, own.length - MAX_STRUCTURES))) {
    s.walls = s.walls.filter((x) => x.id !== old.id);
    ev.push({ t: 'wall', wall: { ...old }, on: false });
  }
}
