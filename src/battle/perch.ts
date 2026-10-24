// The Vanish Jump into a tree or a bush (docs/GAMEPLAY_DESIGN.md, Stealth, "Hiding in a tree or a
// bush", the owner's rules of 2026-10-24): which props take a ninja, how many fit, where it sits in
// one, and getting out of it. The actions themselves are in engine.ts (they need its opportunity
// attacks and hits).

import type { BattleEvent, BattleState, Pt, Unit } from './types';
import { cellOf, dist, getMap, gridFor, idx, inGrid, propRules } from './map';
import { freeSpot, occupancy } from './nav';
import { reveal, revealOutOfHiding } from './combat';

/** How far the jump reaches: a tree or bush up to 6 m away (to its middle). */
export const VANISH_RANGE = 6;
/** Dropping onto a foe: one within 3 m of the trunk. */
export const DROP_REACH = 3;

/** The kind of hiding place a prop is for the jump ('tree', 'bush'), or undefined. */
export function perchKind(s: BattleState, i: number): 'tree' | 'bush' | undefined {
  const p = getMap(s.mapId).props[i];
  return p ? propRules(p).perch : undefined;
}

/** How many ninjas fit in it: one in a tree or a bush, two in the big oak (the owner). */
export function perchRoom(s: BattleState, i: number): number {
  const p = getMap(s.mapId).props[i];
  return p ? propRules(p).perchRoom ?? 1 : 0;
}

/** Who sits in a prop now (even one that has just burnt: the fire throws them out). */
export function perchers(s: BattleState, i: number): Unit[] {
  const p = getMap(s.mapId).props[i];
  if (!p) return [];
  return Object.values(s.units).filter((u) => u.cond.perch === i && u.down !== 'fled' && u.down !== 'dead' && dist(u.pos, p) <= 0.45);
}

/**
 * Where a ninja sits in a prop: the middle of a bush; in a tree side by side by the trunk (the oak
 * takes two), so each has its own spot.
 */
export function perchSpot(s: BattleState, i: number, n: number): Pt {
  const p = getMap(s.mapId).props[i];
  if (perchKind(s, i) === 'bush') return { x: p.x, z: p.z };
  return { x: p.x + (n === 0 ? -0.15 : 0.15), z: p.z };
}

/** Why a unit can't jump into prop `i` now (null: it can, as far as the prop goes). */
export function perchBlocker(s: BattleState, u: Unit, i: number): string | null {
  const p = getMap(s.mapId).props[i];
  if (!p || s.props[i]?.destroyed) return 'badTarget';
  const kind = perchKind(s, i);
  if (!kind) return 'noPerch';
  const all = perchers(s, i);
  if (all.some((o) => o.id === u.id)) return 'alreadyThere';
  const inside = all;
  if (inside.length >= perchRoom(s, i)) return 'perchFull';
  if (kind === 'bush') {
    // Someone standing in the bush's middle takes it too.
    const g = gridFor(s.mapId);
    const c = cellOf(perchSpot(s, i, 0));
    const who = inGrid(g, c) ? occupancy(s).get(idx(g, c)) : undefined;
    if (who && who.id !== u.id) return 'perchFull';
  }
  return null;
}

/** The free spot at the foot of a tree or beside a bush where a ninja comes down. */
export function footOf(s: BattleState, u: Unit, i: number, toward?: Pt): Pt {
  const p = getMap(s.mapId).props[i];
  const r = propRules(p).radius;
  return freeSpot(s, u, p, Math.min(0.4, r), r + 2, (q) => -dist(q, p) - (toward ? dist(q, toward) * 0.3 : 0));
}

/**
 * Out of its tree or bush, to `to` (the foot of it, unless said): climbed down, dropped onto a
 * foe, knocked out by a hit (`fall`) or thrown out by fire. It is seen again unless `keepHidden`
 * (dropping onto a foe: the blow is still struck from hiding, then gives it away).
 */
export function leavePerch(s: BattleState, u: Unit, ev: BattleEvent[], o: { to?: Pt; fall?: boolean; keepHidden?: boolean } = {}): void {
  const i = u.cond.perch;
  if (i === undefined) return;
  const from = { ...u.pos };
  const to = o.to ?? footOf(s, u, i);
  u.cond.perch = undefined;
  u.cond.crouched = false;
  u.pos = { ...to };
  if (Math.abs(to.x - from.x) > 1e-6) u.facing = to.x > from.x ? 1 : -1;
  ev.push({ t: 'leavePerch', unit: u.id, prop: i, from, to: { ...to }, ...(o.fall ? { fall: true } : {}) });
  if (o.fall) reveal(u, ev);
  else if (!o.keepHidden) revealOutOfHiding(s, u, ev);
}

/** A tree or bush burnt or cut: whoever sat in it jumps out (free), seen. */
export function throwOut(s: BattleState, i: number, ev: BattleEvent[]): void {
  for (const u of perchers(s, i)) {
    leavePerch(s, u, ev);
    reveal(u, ev);
  }
}
