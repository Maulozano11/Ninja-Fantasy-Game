// Structures with HP on the battle map: the Kōton metal walls and blocks (docs/CLANS_DESIGN.md).
// They block like jutsu walls (map.ts), take damage from attacks and from the areas that reach them,
// and are gone at 0 HP. Earth and water walls stay unbreakable.

import { abilityMod } from '../rules/checks';
import type { Advantage } from '../rules/checks';
import type { AreaShape, BattleEvent, BattleState, Pt, Unit, Wall } from './types';
import { BLOCK_HALF, dist, lineOfSight, segDist } from './map';
import { inArea } from './jutsu';
import { hitChance, midpoint } from './combat';
import { KUNAI, KUNAI_LONG, wielded } from './units';

/** Every structure is AC 10, like the props that can be broken. */
export const STRUCTURE_AC = 10;

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
 * kunai flies to it in sight (with disadvantage beyond 9 m).
 */
export function structureAttack(s: BattleState, u: Unit, w: Wall, ranged: boolean): StructureAttack {
  const at = closestPoint(w, u.pos);
  const d = dist(u.pos, at);
  const mod = u.prof + abilityMod(ranged ? u.stats.dex : u.stats.str);
  const adv: Advantage = ranged && d > KUNAI.reach ? 'disadvantage' : 'none';
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
