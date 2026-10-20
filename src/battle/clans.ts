// The clans' own rules (docs/CLANS_DESIGN.md, phase 1), one section per clan. The engine, the AI
// and the screen call these; nothing here calls the engine, the AI or the turns back.

import { effectMods } from '../rules/effects';
import type { BattleEvent, BattleState, Hit, Pt, Unit, WeaponNode } from './types';
import { cellBlocked, cellCenter, cellOf, coverBetween, dist, fullCoverBetween, gridFor, lineOfSight, sameCell, waterAtPt } from './map';
import { canStop, freeSpot, occupancy, reachable } from './nav';
import { passivePerception, savingThrow } from './combat';
import { JUTSU } from './jutsu';
import { trapAt } from './hazards';
import { wielded } from './units';

// --- Mirai: Eye of Tomorrow, Premonitory Evasion -------------------------------------------

/** How far a Mirai's Eye of Tomorrow reads an enemy's next move (and sees a blow coming). */
export const FORESIGHT_RANGE = 18;

export const EVASION = 'mirai_evasion';

/** The step aside is one square (1.5 m): a cell 1 to 1.6 m away, at most 2.2 m of walking. */
const STEP_MIN = 1;
const STEP_MAX = 1.6;
const STEP_WALK = 2.2;

/**
 * The Mirai saw the blow coming: the attacker is a foe within the Eye's reach, in sight and not
 * hidden from it. (A blow struck from hiding is marked on the hit itself: `unseen`.)
 */
export function sawComing(s: BattleState, m: Unit, attacker: Unit | undefined): boolean {
  if (!attacker || attacker.team === m.team) return false;
  if (attacker.cond.hidden !== undefined && passivePerception(m) < attacker.cond.hidden) return false;
  return dist(m.pos, attacker.pos) <= FORESIGHT_RANGE && lineOfSight(s, m.pos, attacker.pos);
}

/**
 * Where a Mirai steps to make a blow miss: a free cell 1 to 1.6 m away that it can walk to (no
 * wall, prop or foe in between), dry and with no enemy trap; as far from the attacker as it can,
 * and behind cover if there is some. Null if there is nowhere to step.
 */
export function evasionSpot(s: BattleState, m: Unit, h: Hit): Pt | null {
  const a = h.source ? s.units[h.source] : undefined;
  const danger = a?.pos ?? m.pos;
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  let best: Pt | null = null;
  let bestScore = -Infinity;
  for (const i of reachable(s, m, STEP_WALK).cost.keys()) {
    const c = { c: i % g.cols, r: Math.floor(i / g.cols) };
    const p = cellCenter(c);
    const d = dist(p, m.pos);
    if (d < STEP_MIN || d > STEP_MAX || !canStop(s, m, c, occ) || waterAtPt(s, p) === 2 || trapAt(s, m, p)) continue;
    const score = dist(p, danger) + (a && coverBetween(s, a.pos, p, [a.id, m.id]) >= 2 ? 1 : 0);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Premonitory Evasion can answer this hit: one attack on the Mirai alone (not an area), that it saw
 * coming and that can be blocked, in the fighting, with its reaction and 2 chakra left and room to
 * step aside.
 */
export function canEvade(s: BattleState, t: Unit, h: Hit): boolean {
  if (s.phase !== 'combat' || !h.aimed || h.amount <= 0 || h.unseen || h.unblockable) return false;
  if (t.kind !== 'ninja' || t.down || !t.jutsus.includes(EVASION) || !t.turn.reaction || t.cond.surprised) return false;
  if (effectMods(t.effects).noJutsu || t.chakra < JUTSU[EVASION].cost) return false;
  return sawComing(s, t, h.source ? s.units[h.source] : undefined) && evasionSpot(s, t, h) !== null;
}

/**
 * Premonitory Evasion: the Mirai pays 2 chakra and its reaction and steps aside, and the blow
 * misses (the hit is dropped). The step provokes no opportunity attack and sets off no trap.
 */
export function evade(s: BattleState, t: Unit, h: Hit, ev: BattleEvent[]): void {
  const to = evasionSpot(s, t, h);
  if (!to) return;
  const cost = JUTSU[EVASION].cost;
  t.chakra -= cost;
  t.turn.reaction = false;
  ev.push({ t: 'chakra', unit: t.id, delta: -cost, chakra: t.chakra, reason: EVASION });
  const from = { ...t.pos };
  t.pos = to;
  ev.push({ t: 'evade', unit: t.id, from, to, source: h.source });
}

// --- Ryusei: Weapon Nodes, Warp Strike, Spatial Swap ---------------------------------------

export const WARP = 'ryusei_warp';
export const SWAP = 'ryusei_swap';

/** A Ryusei keeps three Nodes at most: a fourth makes the oldest go. */
export const MAX_NODES = 3;
/** A unit stands on a Node within 0.75 m of it (half a square). */
export const ON_NODE = 0.75;
/** Someone on the Node: the warp lands on the nearest free cell within a square (1.5 m). */
const LANDING = 1.5;

/** Weapon Nodes are the Ryusei's: their kunai and their missed blows leave one. */
export const leavesNodes = (u: Unit): boolean => u.character?.clan === 'Ryusei';

/** The Nodes a Ryusei has, oldest first. */
export const ownNodes = (s: BattleState, u: Unit): WeaponNode[] => s.nodes.filter((n) => n.owner === u.id);

/** A Weapon Node where the weapon landed. Nodes stay put and both sides see them; a fourth makes the oldest go. */
export function addNode(s: BattleState, u: Unit, at: Pt, ev: BattleEvent[]): void {
  const base = `node_${s.tick}_${u.id}`;
  let id = base;
  for (let n = 1; s.nodes.some((x) => x.id === id); n++) id = `${base}_${n}`;
  const node: WeaponNode = { id, owner: u.id, pos: { ...at } };
  s.nodes.push(node);
  ev.push({ t: 'node', node: { ...node }, on: true });
  const own = ownNodes(s, u);
  for (const old of own.slice(0, Math.max(0, own.length - MAX_NODES))) {
    s.nodes = s.nodes.filter((x) => x.id !== old.id);
    ev.push({ t: 'node', node: { ...old }, on: false });
  }
}

/** The Ryusei's own Node nearest to a point, within `r` meters (where an aim or a click picks it). */
export function ownNodeAt(s: BattleState, u: Unit, at: Pt, r = 0.8): WeaponNode | undefined {
  let best: WeaponNode | undefined;
  for (const n of ownNodes(s, u)) if (dist(n.pos, at) <= r && (!best || dist(n.pos, at) < dist(best.pos, at))) best = n;
  return best;
}

/** The Ryusei's own Node a unit stands on (within 0.75 m). */
export const nodeUnder = (s: BattleState, u: Unit, t: Unit): WeaponNode | undefined => ownNodeAt(s, u, t.pos, ON_NODE);

/** A Ryusei sees its Node even with walls in between (Kōton metal, earth): only trees, tents and stacked crates hide it. */
export const nodeInSight = (s: BattleState, u: Unit, n: WeaponNode): boolean => lineOfSight(s, u.pos, n.pos, { structures: false });

/**
 * Where a Warp Strike to a Node lands: on it if it is free, otherwise the nearest free cell within
 * 1.5 m (on the far side of whoever stands on it, when two are as near). Never where the Ryusei
 * already stands. Null if there is nowhere to land.
 */
export function warpLanding(s: BattleState, u: Unit, n: WeaponNode): Pt | null {
  const here = cellOf(u.pos);
  const p = freeSpot(s, u, n.pos, 0, LANDING, (q) => (sameCell(cellOf(q), here) ? -Infinity : -dist(q, n.pos) + dist(q, u.pos) * 0.01));
  const c = cellOf(p);
  if (sameCell(c, here) || cellBlocked(s, c) || waterAtPt(s, p) === 2 || !canStop(s, u, c)) return null;
  return cellCenter(c);
}

/** Why a Warp Strike to this Node can't be made (none picked, too far, out of sight, nowhere to land), or null. */
export function warpBlocker(s: BattleState, u: Unit, n: WeaponNode | undefined): string | null {
  if (!n) return 'noNode';
  if (dist(u.pos, n.pos) > JUTSU[WARP].range + 0.1) return 'outOfRange';
  if (!nodeInSight(s, u, n)) return 'noSight';
  return warpLanding(s, u, n) ? null : 'blocked';
}

/** A foe the Ryusei could strike from `at` at once: in its weapon's reach, seen and with no metal wall between. */
export function edgeFoe(s: BattleState, u: Unit, at: Pt = u.pos): Unit | undefined {
  const reach = wielded(u).reach + 0.1;
  return Object.values(s.units).find(
    (f) =>
      f.team !== u.team &&
      !f.down &&
      !f.head?.severed &&
      (f.cond.hidden === undefined || passivePerception(u) >= f.cond.hidden) &&
      dist(at, f.pos) <= reach + (f.kind === 'hydra_head' ? 2.5 : 0) + (f.bulk ?? 0) &&
      !fullCoverBetween(s, at, f.pos),
  );
}

/**
 * Warp Strike: the Ryusei vanishes and appears at its Node (no opportunity attacks, no traps).
 * Landing next to a foe, its next attack this turn comes from behind: advantage, and no clone,
 * Kawarimi or Evasion blocks it.
 */
export function warpStrike(s: BattleState, u: Unit, to: Pt, ev: BattleEvent[]): void {
  ev.push({ t: 'teleport', unit: u.id, from: { ...u.pos }, to: { ...to } });
  u.pos = { ...to };
  if (!edgeFoe(s, u)) return;
  u.cond.warpEdge = true;
  ev.push({ t: 'note', key: 'warpEdge', params: { name: u.name } });
}

/**
 * Why a Spatial Swap with this unit can't be made, or null: it needs the fighting started, another
 * ninja (the hydra is too big) standing on one of the Ryusei's Nodes, and that Node within 18 m and
 * in sight (walls don't count, as for the warp).
 */
export function swapBlocker(s: BattleState, u: Unit, t: Unit | undefined): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (!t || t.id === u.id || t.down === 'dead' || t.down === 'fled' || t.down === 'ko') return 'needTarget';
  if (t.kind !== 'ninja') return 'tooBig';
  const n = nodeUnder(s, u, t);
  if (!n) return 'notOnNode';
  if (dist(u.pos, n.pos) > JUTSU[SWAP].range + 0.1) return 'outOfRange';
  return nodeInSight(s, u, n) ? null : 'noSight';
}

/**
 * Spatial Swap: the Ryusei and whoever stands on its Node trade places, with no opportunity
 * attacks. An enemy resists with a STR save; then nothing moves, but the chakra and the action are
 * spent all the same.
 */
export function spatialSwap(s: BattleState, u: Unit, t: Unit, ev: BattleEvent[]): void {
  if (t.team !== u.team) {
    const roll = savingThrow(s, t, 'str', u.saveDC);
    ev.push({ t: 'save', unit: t.id, what: SWAP, roll });
    if (roll.success) {
      ev.push({ t: 'note', key: 'swapResisted', params: { name: t.name } });
      return;
    }
  }
  const a = { ...u.pos };
  const b = { ...t.pos };
  ev.push({ t: 'teleport', unit: u.id, from: a, to: b });
  ev.push({ t: 'teleport', unit: t.id, from: b, to: a });
  u.pos = { ...b };
  t.pos = { ...a };
}
