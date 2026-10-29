// The clans' own rules (docs/CLANS_DESIGN.md, phase 1), one section per clan. The engine, the AI
// and the screen call these; nothing here calls the engine, the AI or the turns back.

import { effectMods } from '../rules/effects';
import type { BattleEvent, BattleState, Hit, Pt, Unit, WeaponNode } from './types';
import { cellBlocked, cellCenter, cellOf, coverBetween, dist, fullCoverBetween, gridFor, lineOfSight, sameCell, waterAtPt } from './map';
import { canStop, freeSpot, isOnMap, occupancy, reachable } from './nav';
import { AURA_RADIUS, passivePerception, revealOutOfHiding, savingThrow, sovereign } from './combat';
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
/** What opening the Eye of Tomorrow costs (a bonus action too). */
export const EYE_COST = 1;

/** The Eye of Tomorrow is open: the Mirai reads the enemies' plans and sees their blows coming (N14 "c", 2026-10-28). */
export const eyeOpen = (m: Unit): boolean => !!m.eyeOpen && !m.down;

/**
 * A Mirai opens the Eye (bonus action, EYE_COST chakra) until its next turn begins: in the fighting,
 * with its bonus action and chakra, not sealed, not already open.
 */
export function openEye(s: BattleState, m: Unit, ev: BattleEvent[]): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (m.character?.clan !== 'Mirai') return 'notMirai';
  if (m.eyeOpen) return 'eyeOpen';
  if (!m.turn.bonus) return 'noBonus';
  if (effectMods(m.effects).noJutsu) return 'sealed';
  if (m.chakra < EYE_COST) return 'noChakra';
  m.turn.bonus = false;
  m.chakra -= EYE_COST;
  m.eyeOpen = true;
  ev.push({ t: 'chakra', unit: m.id, delta: -EYE_COST, chakra: m.chakra, reason: 'eye' });
  ev.push({ t: 'eye', unit: m.id, on: true });
  return null;
}

/** The Mirai's next turn begins: the Eye closes (turns.ts beginTurn). */
export function closeEye(m: Unit, ev: BattleEvent[]): void {
  if (!m.eyeOpen) return;
  m.eyeOpen = false;
  ev.push({ t: 'eye', unit: m.id, on: false });
}

export function sawComing(s: BattleState, m: Unit, attacker: Unit | undefined): boolean {
  if (!attacker || attacker.team === m.team || !eyeOpen(m)) return false;
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
 * misses (the hit is dropped). The step provokes no opportunity attack and sets off no trap. A
 * Ryusei's blade that misses this way leaves its Node where the Mirai stood.
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
  ev.push({ t: 'evade', unit: t.id, from, to, source: h.source, what: h.what });
  revealOutOfHiding(s, t, ev);
  const a = h.source ? s.units[h.source] : undefined;
  if (a && h.melee && leavesNodes(a)) addNode(s, a, from, ev);
}

// --- Ryusei: Weapon Nodes, Shooting-Star Thrust, Spatial Swap ---------------------------------------

export const WARP = 'ryusei_warp';
export const SWAP = 'ryusei_swap';
/** Weapon Throw: the weapon thrown at a foe and the Ryusei after it (engine.ts weaponThrow). */
export const WEAPON_THROW = 'ryusei_weapon_throw';

/** A Ryusei keeps three Nodes at most: a fourth makes the oldest go. */
export const MAX_NODES = 3;
/** A unit stands on a Node within 0.75 m of it (half a square). */
export const ON_NODE = 0.75;
/** Someone on the Node: the warp lands on the nearest free cell within a square (1.5 m)... */
const LANDING = 1.5;
/** ...and at least 1 m from whoever stands on it, so the two sprites never overlap (D15, 2026-10-20). */
export const LANDING_GAP = 1;

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
 * Where a Shooting-Star Thrust to a Node lands: on it if nobody stands on it, otherwise the nearest free cell
 * within 1.5 m of it and at least 1 m from whoever stands on it (on their far side, when two are as
 * near). Never where the Ryusei already stands. Null if there is nowhere to land.
 */
export function warpLanding(s: BattleState, u: Unit, n: WeaponNode): Pt | null {
  const here = cellOf(u.pos);
  // Whoever stands on the Node (fallen ninjas lying there too): the landing keeps 1 m from them.
  const onIt = Object.values(s.units).filter((o) => o.id !== u.id && isOnMap(o) && dist(o.pos, n.pos) <= ON_NODE);
  const tooClose = (q: Pt): boolean => onIt.some((o) => dist(q, o.pos) < LANDING_GAP - 1e-6);
  const p = freeSpot(s, u, n.pos, 0, LANDING, (q) => (sameCell(cellOf(q), here) || tooClose(q) ? -Infinity : -dist(q, n.pos) + dist(q, u.pos) * 0.01));
  const c = cellOf(p);
  if (sameCell(c, here) || cellBlocked(s, c) || waterAtPt(s, p) === 2 || !canStop(s, u, c) || tooClose(cellCenter(c))) return null;
  return cellCenter(c);
}

/**
 * Where a Shooting-Star Thrust aimed at `at` goes: the Ryusei's own Node there, if one is; otherwise
 * the spot itself, as a Node of the moment (the owner, 2026-10-28: no Node needed; a foe clicked is
 * its spot, and the landing keeps beside it). Never added to the board.
 */
export function warpAim(s: BattleState, u: Unit, at: Pt): WeaponNode {
  return ownNodeAt(s, u, at) ?? { id: 'aim', owner: u.id, pos: { ...at } };
}

/** Why a Shooting-Star Thrust to this Node can't be made (none picked, too far, out of sight, nowhere to land), or null. */
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
 * Shooting-Star Thrust: the Ryusei vanishes and appears at its Node (no opportunity attacks, no traps); the
 * screen plays it as a phase, a body of blue light crossing to the Node.
 * Landing next to a foe, its next attack this turn comes from behind: advantage, and no clone,
 * Kawarimi or Evasion blocks it.
 */
export function warpStrike(s: BattleState, u: Unit, to: Pt, ev: BattleEvent[]): void {
  ev.push({ t: 'teleport', unit: u.id, from: { ...u.pos }, to: { ...to }, how: 'phase' });
  u.pos = { ...to };
  revealOutOfHiding(s, u, ev);
  const foe = edgeFoe(s, u);
  if (!foe) return;
  // It lands facing the foe, thrusting at it (the screen plays the landing as a thrust).
  if (foe.pos.x !== u.pos.x) u.facing = foe.pos.x > u.pos.x ? 1 : -1;
  u.cond.warpEdge = true;
  ev.push({ t: 'note', key: 'warpEdge', params: { name: u.name, foe: foe.name } });
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
    ev.push({ t: 'save', unit: t.id, what: SWAP, roll, ab: 'str' });
    if (roll.success) {
      ev.push({ t: 'note', key: 'swapResisted', params: { name: t.name } });
      return;
    }
  }
  const a = { ...u.pos };
  const b = { ...t.pos };
  ev.push({ t: 'teleport', unit: u.id, from: a, to: b, how: 'phase' });
  ev.push({ t: 'teleport', unit: t.id, from: b, to: a, how: 'phase' });
  u.pos = { ...b };
  t.pos = { ...a };
  // The log says who traded places with whom.
  ev.push({ t: 'note', key: 'swapped', params: { name: u.name, other: t.name } });
  revealOutOfHiding(s, u, ev);
  revealOutOfHiding(s, t, ev);
}

// --- Northstar: Aura of Sovereignty, Command, Natural Submission ---------------------------

export const COMMAND = 'northstar_command';
export const SUBMISSION = 'northstar_submission';

const inAura = (n: Unit, p: Pt): boolean => dist(n.pos, p) <= AURA_RADIUS + 0.05;

/**
 * The Northstar of another side whose aura a unit has just come into from outside it. Its own side's
 * auras spare it (D17, owner 2026-10-20): a commanded unit goes by the side it fights for now.
 */
export function auraEntered(s: BattleState, u: Unit, from: Pt): Unit | undefined {
  return Object.values(s.units).find((n) => n.id !== u.id && n.team !== u.team && sovereign(n) && !inAura(n, from) && inAura(n, u.pos));
}

/**
 * Aura of Sovereignty: a foe of the Northstar who warps or dashes into its aura on its own turn loses
 * half of the movement it has left at once; the Northstar's allies are spared. (A Kawarimi, an
 * Evasion, a push or being swapped happen on someone else's turn: there is no movement to lose.)
 */
export function enteredAura(s: BattleState, u: Unit, from: Pt, ev: BattleEvent[]): void {
  if (s.phase !== 'combat' || s.order[s.turn] !== u.id || u.turn.move <= 0) return;
  const n = auraEntered(s, u, from);
  if (!n) return;
  u.turn.move /= 2;
  ev.push({ t: 'slowed', unit: u.id, by: n.id, move: u.turn.move });
}

const gone = (t: Unit): boolean => t.down === 'dead' || t.down === 'fled' || t.down === 'ko';

/**
 * Why Command can't take this unit, wherever it stands, or null. Only a foe's ninja with a rank
 * takes orders: a Minion, a Captain too from level 5, never a Sub-boss or a Boss. A Mirai's mind
 * can't be taken, nor one already under command; and only once the fighting has started.
 */
export function commandRefused(s: BattleState, u: Unit, t: Unit | undefined): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (!t || t.id === u.id || gone(t)) return 'needTarget';
  if (t.commanded) return 'alreadyCommanded';
  if (t.rank === 'boss' || t.rank === 'subboss') return 'cantControl';
  if (!t.rank || t.team === u.team) return 'cantCommand';
  if (t.kind !== 'ninja' || t.creature) return 'notNinja';
  if (t.character?.clan === 'Mirai') return 'mindImmune';
  return t.rank === 'captain' && u.level < 5 ? 'notMinion' : null;
}

/** Why Natural Submission can't take this unit, wherever it stands, or null: a foe's beast or summon, never a boss. */
export function submissionRefused(s: BattleState, u: Unit, t: Unit | undefined): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (!t || t.id === u.id || gone(t)) return 'needTarget';
  if (t.rank === 'boss' || t.rank === 'subboss') return 'cantControl';
  return t.creature && t.team !== u.team ? null : 'notBeast';
}

/** Command and Natural Submission reach 9 m, in sight. */
function mindReach(s: BattleState, u: Unit, t: Unit, id: string): string | null {
  if (dist(u.pos, t.pos) > JUTSU[id].range + 0.1) return 'outOfRange';
  return lineOfSight(s, u.pos, t.pos) ? null : 'noSight';
}

/** Why Command can't be cast at this unit now, or null (the engine, the aim preview and the AI share it). */
export const commandBlocker = (s: BattleState, u: Unit, t: Unit | undefined): string | null => commandRefused(s, u, t) ?? mindReach(s, u, t!, COMMAND);

/** Why Natural Submission can't be cast at this unit now, or null. */
export const submissionBlocker = (s: BattleState, u: Unit, t: Unit | undefined): string | null => submissionRefused(s, u, t) ?? mindReach(s, u, t!, SUBMISSION);

/** How many of its own turns a commanded unit fights for the Northstar: one, two from level 9. */
const commandTurns = (u: Unit): number => (u.level >= 9 ? 2 : 1);

/**
 * Command: the target makes a WIS save. Failing it, it fights on the Northstar's side until the end
 * of its next turn (two of them from level 9), and the plan it had is dropped.
 */
export function command(s: BattleState, u: Unit, t: Unit, ev: BattleEvent[]): void {
  const roll = savingThrow(s, t, 'wis', u.saveDC);
  ev.push({ t: 'save', unit: t.id, what: COMMAND, roll, ab: 'wis' });
  if (roll.success) return;
  const rounds = commandTurns(u);
  t.commanded = { by: u.id, team: t.team, rounds };
  t.team = u.team;
  t.intent = undefined;
  ev.push({ t: 'command', unit: t.id, by: u.id, on: true, rounds });
}

/** Natural Submission: a beast or summon that fails a WIS save joins the Northstar's side for the rest of the battle. */
export function submit(s: BattleState, u: Unit, t: Unit, ev: BattleEvent[]): void {
  const roll = savingThrow(s, t, 'wis', u.saveDC);
  ev.push({ t: 'save', unit: t.id, what: SUBMISSION, roll, ab: 'wis' });
  if (roll.success) return;
  t.joined = { by: u.id, team: t.team };
  t.team = u.team;
  t.intent = undefined;
  ev.push({ t: 'joined', unit: t.id, by: u.id });
}
