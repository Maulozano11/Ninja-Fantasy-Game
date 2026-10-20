// The battle engine: builds a battle from its setup and applies actions to it. An action returns the
// new state and the events that happened, in order, for the screen to animate and the log to tell.
// The state is plain data and every roll comes from its seed and a counter, so a battle can be
// saved, replayed and played online (actions in, events out). Reactions pause the battle: the
// engine waits for a 'react' action from whoever controls the reacting ninja.

import './maps';
import type { ShinobiCharacter, WeatherType } from '../types/shinobi';
import type { Difficulty } from '../types/mission';
import { abilityMod, combineAdvantage } from '../rules/checks';
import { addEffect, effectMods, hasEffect, removeEffect } from '../rules/effects';
import type {
  Action,
  AfterHits,
  AiOrder,
  BattleEvent,
  BattleState,
  BattleSupplies,
  Cell,
  Hit,
  Outcome,
  Pt,
  Rank,
  TimeOfDay,
  Trap,
  Unit,
  Wall,
} from './types';
import { homeTeam } from './types';
import { cellBlocked, cellCenter, cellOf, coverBetween, dist, fullCoverBetween, getMap, gridFor, hideSpotAt, idx, inGrid, levelAtPt, lineOfSight, propRules, sameCell, segmentsCross, waterAtPt } from './map';
import { canStop, freeSpot, pathTo, pathTouchesDeep, reachable, stepCost } from './nav';
import type { AttackPreview } from './combat';
import { attackPreview, check, damage, heal, hostileAura, passivePerception, reveal, revealOutOfHiding, rollDiceExpr, skillMod } from './combat';
import { JUTSU, areaOf, enhanced } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { KUNAI, enemyUnit, handsFree, unitFrom, wielded } from './units';
import type { EnemyKind } from './units';
import { hydraUnits } from './hydra';
import { checkEnd, current, endTurn, startCombat } from './turns';
import { afterStealthAttack, alarm, canTakedown, dragBody, guardsTurn, openFight, scareAnimalsNear, stealthMove, STONE_RANGE, throwStone } from './stealth';
import { electrify, groundEffects, saveHit, springTrap, TAG, throwTag, trapAt, unitsInArea } from './hazards';
import { breakable, damageStructure, faceToward, hitStructuresIn, raiseStructure, STRUCTURE_AC, structureAt, structureAttack, structureBlocker, wallAcross } from './structures';
import {
  addNode,
  auraEntered,
  canEvade,
  command,
  commandBlocker,
  enteredAura,
  evade,
  leavesNodes,
  ownNodeAt,
  spatialSwap,
  submissionBlocker,
  submit,
  swapBlocker,
  warpBlocker,
  warpLanding,
  warpStrike,
} from './clans';
import { reachTo, replanAgainst } from './intent';

// --- setup ---------------------------------------------------------------------------------

export interface PartySetup {
  character: ShinobiCharacter;
  pos: Pt;
  controller?: 'player' | 'ai';
  aiOrder?: AiOrder;
}

export interface EnemySetup {
  kind: EnemyKind | 'hydra';
  pos: Pt;
  /** Patrol route for the stealth phase (it stands still without one). */
  route?: Pt[];
  /** Where it looks at first, in degrees. */
  look?: number;
  /** Its rank, when the encounter wants another than its template's (a Sub-boss). */
  rank?: Rank;
}

export interface BattleSetup {
  seed: number;
  mapId: string;
  time: TimeOfDay;
  weather: WeatherType;
  difficulty: Difficulty;
  party: PartySetup[];
  enemies: EnemySetup[];
  /** Opens with the stealth phase (the guards haven't noticed the party yet). */
  stealth: boolean;
  /** The party is caught unaware (a night ambush): it loses its first turn. */
  partySurprised?: boolean;
  supplies: BattleSupplies;
  traps?: Trap[];
}

const snap = (p: Pt): Pt => cellCenter(cellOf(p));

export function createBattle(setup: BattleSetup): { state: BattleState; events: BattleEvent[] } {
  const map = getMap(setup.mapId);
  const units: Record<string, Unit> = {};
  for (const p of setup.party) {
    const u = unitFrom(p.character, { team: 'party', pos: snap(p.pos), controller: p.controller, aiOrder: p.aiOrder });
    units[u.id] = u;
  }
  const count: Record<string, number> = {};
  for (const e of setup.enemies) {
    if (e.kind === 'hydra') {
      for (const u of hydraUnits(e.pos, setup.difficulty)) units[u.id] = e.rank ? { ...u, rank: e.rank } : u;
      continue;
    }
    const n = (count[e.kind] = (count[e.kind] ?? -1) + 1);
    const u = enemyUnit(e.kind, n, snap(e.pos), setup.difficulty, e.rank);
    if (setup.stealth) {
      u.guard = { route: (e.route ?? [u.pos]).map(snap), next: 0, suspicion: {}, alerted: false };
      if (e.look !== undefined) u.guard.look = e.look;
    }
    units[u.id] = u;
  }
  const s: BattleState = {
    version: 1,
    seed: setup.seed,
    rolls: 0,
    mapId: setup.mapId,
    time: setup.time,
    weather: setup.weather,
    difficulty: setup.difficulty,
    phase: setup.stealth ? 'stealth' : 'combat',
    round: 0,
    stealthTurn: 0,
    order: [],
    turn: 0,
    initiative: {},
    units,
    props: map.props.map((def) => {
      const hp = propRules(def).hp;
      return hp === undefined ? { def } : { def, hp };
    }),
    walls: [],
    traps: [...(setup.traps ?? [])],
    nodes: [],
    bodies: [],
    stealthDone: [],
    supplies: { ...setup.supplies },
    tick: 0,
  };
  placeUnits(s);
  const ev: BattleEvent[] = [];
  if (setup.stealth) {
    for (const u of Object.values(units)) if (u.team === 'party') freshBudget(u);
  } else {
    const party = Object.values(units).filter((u) => u.team === 'party');
    startCombat(s, ev, undefined, setup.partySurprised ? party.map((u) => u.id) : []);
  }
  return { state: s, events: ev };
}

/** Every ninja starts on a free, dry, open cell: the nearest one to where the setup put it. */
function placeUnits(s: BattleState): void {
  const g = gridFor(s.mapId);
  const taken = new Set<number>();
  for (const u of Object.values(s.units)) {
    if (u.kind !== 'ninja') continue;
    const c0 = cellOf(u.pos);
    let best: Cell | undefined;
    for (let r = 0; r <= 12 && !best; r++) {
      for (let dr = -r; dr <= r && !best; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== r) continue;
          const c = { c: c0.c + dc, r: c0.r + dr };
          if (!inGrid(g, c) || cellBlocked(s, c) || g.water[idx(g, c)] === 2 || taken.has(idx(g, c))) continue;
          best = c;
          break;
        }
      }
    }
    if (!best) continue;
    taken.add(idx(g, best));
    u.pos = cellCenter(best);
    if (u.guard && u.guard.route.length) u.guard.route[0] = { ...u.pos };
  }
}

const freshBudget = (u: Unit): void => {
  u.turn = { move: u.speed, action: true, bonus: true, reaction: true, moved: 0 };
};

// --- applying actions ----------------------------------------------------------------------

/** Applies one action. On failure the state is unchanged and `reason` says why (a key). */
export function applyAction(state: BattleState, action: Action): Outcome {
  const s = structuredClone(state);
  // A state from before the clans (an older save or peer) has no Weapon Nodes yet.
  s.nodes ??= [];
  const ev: BattleEvent[] = [];
  const err = dispatch(s, action, ev);
  if (err) return { ok: false, reason: err, state, events: [] };
  settle(s, ev);
  return { ok: true, state: s, events: ev };
}

/** After an action: the battle may be over, or the acting unit may have fallen or fled. */
function settle(s: BattleState, ev: BattleEvent[]): void {
  if (s.pending || s.phase === 'ended') return;
  if (checkEnd(s, ev)) return;
  if (s.phase === 'combat') {
    const u = current(s);
    if (u && u.down) endTurn(s, ev);
  }
}

function dispatch(s: BattleState, a: Action, ev: BattleEvent[]): string | null {
  if (s.phase === 'ended') return 'battleOver';
  if (a.type === 'setController') {
    const u = s.units[a.unit];
    // A commanded enemy or a beast that joined fights for the party, but nobody takes its reins.
    if (!u || homeTeam(u) !== 'party' || u.joined) return 'noUnit';
    u.controller = a.controller;
    if (a.order) u.aiOrder = a.order;
    return null;
  }
  if (s.pending) return a.type === 'react' ? react(s, a.unit, a.take, ev) : 'waitingReaction';
  if (a.type === 'react') return 'nothingToReact';
  if (a.type === 'endStealthTurn') {
    if (s.phase !== 'stealth') return 'notStealth';
    s.tick++;
    guardsTurn(s, ev);
    return null;
  }
  const u = s.units[a.unit];
  if (!u) return 'noUnit';
  if (s.phase === 'combat') {
    if (current(s)?.id !== u.id) return 'notYourTurn';
  } else {
    if (u.team !== 'party' || u.down) return 'cantAct';
    if (s.stealthDone.includes(u.id)) return 'alreadyDone';
  }
  if (u.down && a.type !== 'endTurn') return 'cantAct';
  s.tick++;
  switch (a.type) {
    case 'move':
      return doMove(s, u, a.to, ev);
    case 'attack':
      return doAttack(s, u, a.target, !!a.ranged, !!a.knockout, ev);
    case 'jutsu':
      return doJutsu(s, u, a.jutsu, a.at, a.target, !!a.enhanced, ev, a.target2);
    case 'dash':
    case 'disengage':
    case 'dodge':
    case 'focus':
      return doBasic(s, u, a.type, ev);
    case 'hide':
      return doHide(s, u, ev);
    case 'crouch':
      return doCrouch(s, u, ev);
    case 'jump':
      return doJump(u, ev);
    case 'draw':
      return doDraw(u, ev);
    case 'shove':
      return doShove(s, u, a.target, a.mode, ev);
    case 'item':
      return doItem(s, u, a.item, a.target, a.at, ev);
    case 'stabilize':
      return doStabilize(s, u, a.target, ev);
    case 'flee':
      return doFlee(s, u, ev);
    case 'stone':
      if (s.phase !== 'stealth') return 'notStealth';
      if (!u.turn.action) return 'noAction';
      if (dist(u.pos, a.at) > STONE_RANGE) return 'outOfRange';
      ev.push({ t: 'act', unit: u.id, act: 'stone' });
      throwStone(s, u, a.at, ev);
      return null;
    case 'drag':
      return dragBody(s, u, a.body, a.to, ev);
    case 'endTurn':
      if (s.phase === 'combat') endTurn(s, ev);
      else stealthDone(s, u, ev);
      return null;
  }
}

/** A ninja is done for this stealth turn; when everyone is, the guards move. */
function stealthDone(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  s.stealthDone.push(u.id);
  const waiting = Object.values(s.units).filter((o) => o.team === 'party' && !o.down && o.controller === 'player' && !s.stealthDone.includes(o.id));
  if (!waiting.length) guardsTurn(s, ev);
}

const targetable = (t: Unit): boolean => t.down !== 'dead' && t.down !== 'fled' && t.down !== 'ko';

// --- movement ------------------------------------------------------------------------------

function doMove(s: BattleState, u: Unit, to: Cell, ev: BattleEvent[]): string | null {
  if (u.kind !== 'ninja' || u.speed <= 0) return 'cantMove';
  if (u.cond.prone) {
    // Standing up costs half the movement.
    if (u.turn.move < u.speed / 2) return 'noMovement';
    u.turn.move -= u.speed / 2;
    u.cond.prone = false;
    ev.push({ t: 'condition', unit: u.id, cond: 'stood', on: true });
  }
  if (!canStop(s, u, to)) return 'occupied';
  const path = pathTo(s, reachable(s, u, u.turn.move), to);
  if (!path || !path.length) return 'unreachable';
  // Walking on deep water costs 2 chakra a turn (without it, the ninja swims at half speed).
  if (pathTouchesDeep(s, path) && !u.cond.waterWalk && u.chakra >= 2) {
    u.chakra -= 2;
    u.cond.waterWalk = true;
    ev.push({ t: 'chakra', unit: u.id, delta: -2, chakra: u.chakra, reason: 'waterWalk' });
  }
  if (s.phase === 'stealth') {
    stealthMove(s, u, path, ev, (p) => stepHazards(s, u, p, ev));
    afterMove(s, u, ev);
    return null;
  }
  walk(s, u, path, 0, ev, []);
  return null;
}

/** A trap where a ninja steps: it goes off and the move stops there. */
function stepHazards(s: BattleState, u: Unit, p: Pt, ev: BattleEvent[]): boolean {
  const trap = trapAt(s, u, p);
  if (!trap) return false;
  const hits = springTrap(s, trap, ev);
  if (trap.kind === 'wire' && !u.cond.prone) {
    // A wire across the path: whoever walks into it goes down.
    u.cond.prone = true;
    ev.push({ t: 'condition', unit: u.id, cond: 'prone', on: true });
  }
  applyHits(s, hits, s.phase === 'stealth' ? { alarmAt: trap.pos } : {}, ev);
  return true;
}

/** An enemy whose reach the mover leaves with this step (and who can still react). */
function provoker(s: BattleState, u: Unit, next: Pt, skip: string[]): Unit | undefined {
  for (const r of Object.values(s.units)) {
    if (r.team === u.team || r.kind !== 'ninja' || r.down || skip.includes(r.id)) continue;
    if (!r.turn.reaction || r.cond.surprised) continue;
    // Nothing reaches across a metal wall.
    if (fullCoverBetween(s, r.pos, u.pos)) continue;
    // A hidden mover it can't see slips past.
    if (u.cond.hidden !== undefined && passivePerception(r) < u.cond.hidden) continue;
    const reach = wielded(r).reach + 0.1;
    if (dist(r.pos, u.pos) <= reach && dist(r.pos, next) > reach) return r;
  }
  return undefined;
}

/**
 * Walks a path in battle, step by step: leaving an enemy's reach asks for an opportunity attack
 * (the move pauses while a player decides), and traps go off underfoot. Dashing into a Northstar's
 * aura halves the movement left, and the walk ends where it runs out.
 */
function walk(s: BattleState, u: Unit, path: Cell[], from: number, ev: BattleEvent[], skip: string[]): void {
  let at = cellOf(u.pos);
  const pts: Pt[] = [];
  const flush = () => {
    if (pts.length) ev.push({ t: 'move', unit: u.id, path: pts.splice(0), run: !!u.turn.dashed || u.turn.moved > u.speed * 0.75 });
  };
  const rules = { waterWalk: !!u.cond.waterWalk, ninjaJump: !!u.cond.ninjaJump };
  for (let i = from; i < path.length; i++) {
    const c = path[i];
    const next = cellCenter(c);
    const cost = stepCost(s, at, c, at.c !== c.c && at.r !== c.r, rules);
    // Only a dash slowed by an aura can run short of the path it was given.
    if (u.turn.dashed && cost > u.turn.move + 1e-6) break;
    for (;;) {
      if (u.cond.disengaged) break;
      const r = provoker(s, u, next, skip);
      if (!r) break;
      flush();
      skip = [...skip, r.id];
      if (r.controller === 'player') {
        s.pending = { kind: 'opportunity', reactor: r.id, mover: u.id, path, stepIndex: i, skip };
        ev.push({ t: 'reactionAsk', pending: s.pending });
        return;
      }
      const paused = opportunityAttack(s, r, u, ev, { unit: u.id, path, stepIndex: i, skip, at });
      if (paused || u.down || !sameCell(cellOf(u.pos), at)) return;
    }
    u.turn.move = Math.max(0, u.turn.move - cost);
    u.turn.moved += cost;
    if (next.x !== u.pos.x) u.facing = next.x > u.pos.x ? 1 : -1;
    const was = u.pos;
    u.pos = next;
    pts.push(next);
    at = c;
    if (u.turn.dashed && auraEntered(s, u, was)) {
      flush();
      enteredAura(s, u, was, ev);
    }
    if (trapAt(s, u, next)) {
      flush();
      stepHazards(s, u, next, ev);
      break;
    }
  }
  flush();
  afterMove(s, u, ev);
}

function afterMove(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  if (u.down) return;
  revealOutOfHiding(s, u, ev);
  if (s.phase === 'combat' && u.turn.moved > u.speed * 0.75) scareAnimalsNear(s, u.pos, 3, ev);
}

// --- attacks -------------------------------------------------------------------------------

function doAttack(s: BattleState, u: Unit, targetId: string, ranged: boolean, knockout: boolean, ev: BattleEvent[]): string | null {
  if (!u.turn.action) return 'noAction';
  if (targetId.startsWith('prop:')) return attackProp(s, u, Number(targetId.slice(5)), ranged, ev);
  if (targetId.startsWith('wall:')) return attackStructure(s, u, targetId.slice(5), ranged, ev);
  const t = s.units[targetId];
  if (!t || !targetable(t)) return 'badTarget';
  if (t.team === u.team) return 'ally';
  // A blade in its sheath is drawn for free (once a turn); a kunai needs a free hand.
  if (!ranged && u.weapon.held && !u.armed && !u.turn.interacted) setArmed(u, true, 'free', ev);
  if (ranged && u.armed && u.weapon.twoHanded) {
    if (u.turn.interacted) return 'handsBusy';
    setArmed(u, false, 'free', ev);
  }
  const pv = attackPreview(s, u, t, ranged ? 'ranged' : 'melee');
  if (!pv.inRange) return 'outOfRange';
  if (ranged && !lineOfSight(s, u.pos, t.pos)) return 'noSight';
  if (!ranged && fullCoverBetween(s, u.pos, t.pos)) return 'blocked';
  u.turn.action = false;
  const stealth = s.phase === 'stealth';
  const takedown = stealth && canTakedown(s, u, t);
  const after: AfterHits = stealth ? { stealthAttack: { attacker: u.id, target: t.id } } : {};
  weaponAttack(s, u, t, ranged, pv, { knockout, takedown }, after, ev);
  if (!stealth) scareAnimalsNear(s, t.pos, 4, ev);
  return null;
}

/**
 * Rolls a weapon attack and queues its damage. Attacking from hiding, or a guard that hasn't
 * noticed the attacker, gives advantage and 1d6 surprise damage (and no Mirai sees it coming).
 * A Ryusei's warp edge is spent on it (nothing blocks the blow), and its kunai and missed blows
 * leave a Weapon Node where they land. Returns true if a reaction prompt (Evasion, Kawarimi)
 * paused the battle.
 */
function weaponAttack(
  s: BattleState,
  a: Unit,
  t: Unit,
  ranged: boolean,
  pv: AttackPreview,
  o: { knockout?: boolean; takedown?: boolean },
  after: AfterHits,
  ev: BattleEvent[],
): boolean {
  const w = ranged ? KUNAI : wielded(a);
  const adv = o.takedown ? combineAdvantage(pv.adv, 'advantage') : pv.adv;
  const roll = check(s, 'attack', pv.mod, pv.ac, adv, true);
  if (t.pos.x !== a.pos.x) a.facing = t.pos.x > a.pos.x ? 1 : -1;
  ev.push({ t: 'attack', unit: a.id, target: t.id, what: w.name, roll, ranged });
  if (leavesNodes(a) && (ranged || !roll.success)) addNode(s, a, t.pos, ev);
  const edge = !!a.cond.warpEdge;
  if (edge) a.cond.warpEdge = false;
  const surprise = a.cond.hidden !== undefined || !!o.takedown;
  reveal(a, ev);
  const hits: Hit[] = [];
  if (roll.success) {
    const str = abilityMod(a.stats.str);
    const dex = abilityMod(a.stats.dex);
    const mod = ranged ? dex : w.finesse ? Math.max(str, dex) : str;
    let amount = rollDiceExpr(s, w.dice, roll.crit) + mod + (ranged ? 0 : effectMods(a.effects).meleeDamage);
    if (surprise) amount += rollDiceExpr(s, '1d6', roll.crit);
    if (!ranged && hasEffect(a.effects, 'gates_open')) amount += rollDiceExpr(s, '1d8', roll.crit);
    hits.push({ unit: t.id, amount: Math.max(1, amount), type: w.type, source: a.id, what: w.name, crit: roll.crit, knockout: o.knockout && !ranged, melee: !ranged, aimed: true, unseen: surprise, unblockable: edge });
  }
  applyHits(s, hits, after, ev);
  return !!s.pending;
}

function opportunityAttack(s: BattleState, r: Unit, m: Unit, ev: BattleEvent[], resume: NonNullable<AfterHits['resumeWalk']>): boolean {
  r.turn.reaction = false;
  return weaponAttack(s, r, m, false, attackPreview(s, r, m, 'melee'), {}, { resumeWalk: resume }, ev);
}

/** Attacking a prop: an explosive barrel blows up, crates and fences break. */
function attackProp(s: BattleState, u: Unit, i: number, ranged: boolean, ev: BattleEvent[]): string | null {
  const map = getMap(s.mapId);
  const p = map.props[i];
  const st = s.props[i];
  if (!p || !st || st.destroyed || st.hp === undefined) return 'badTarget';
  const d = dist(u.pos, p);
  const rules = propRules(p);
  if (ranged ? d > KUNAI.reach * 2 : d > wielded(u).reach + rules.radius + 0.1) return 'outOfRange';
  if (ranged && !lineOfSight(s, u.pos, p)) return 'noSight';
  u.turn.action = false;
  const w = ranged ? KUNAI : wielded(u);
  const edge = !!u.cond.warpEdge;
  if (edge) u.cond.warpEdge = false;
  // From inside a foe's Aura of Sovereignty, with disadvantage, as against a unit.
  const adv = combineAdvantage(d > KUNAI.reach ? 'disadvantage' : 'none', edge ? 'advantage' : 'none', hostileAura(s, u) ? 'disadvantage' : 'none');
  const roll = check(s, 'attack', u.prof + abilityMod(ranged ? u.stats.dex : u.stats.str), 10, adv, true);
  ev.push({ t: 'attack', unit: u.id, target: `prop:${i}`, what: w.name, roll, ranged });
  reveal(u, ev);
  if (leavesNodes(u) && (ranged || !roll.success)) {
    // The Node lands on the prop's side facing the Ryusei.
    const k = d > 0 ? Math.min(1, rules.radius / d) : 0;
    addNode(s, u, { x: p.x + (u.pos.x - p.x) * k, z: p.z + (u.pos.z - p.z) * k }, ev);
  }
  if (!roll.success) return null;
  st.hp -= Math.max(1, rollDiceExpr(s, w.dice, roll.crit));
  if (st.hp > 0) return null;
  st.destroyed = true;
  if (rules.explosive) {
    // A barrel's blast is the same as a tag's (and sets off what is around it).
    ev.push({ t: 'prop', prop: i, state: 'exploded' });
    applyHits(s, throwTag(s, u, { x: p.x, z: p.z }, ev), loud(s, u), ev);
  } else ev.push({ t: 'prop', prop: i, state: 'broken' });
  return null;
}

/** Attacking a Kōton structure: AC 10 and the weapon's dice, like a prop (structures.ts). */
function attackStructure(s: BattleState, u: Unit, id: string, ranged: boolean, ev: BattleEvent[]): string | null {
  const w = s.walls.find((x) => x.id === id);
  if (!w || !breakable(w)) return 'badTarget';
  const pv = structureAttack(s, u, w, ranged);
  if (!pv.inRange) return 'outOfRange';
  // A blade isn't swung across another metal wall.
  if (!pv.sight) return ranged ? 'noSight' : 'blocked';
  u.turn.action = false;
  const wpn = ranged ? KUNAI : wielded(u);
  const roll = check(s, 'attack', pv.mod, STRUCTURE_AC, pv.adv, true);
  if (u.cond.warpEdge) u.cond.warpEdge = false;
  if (pv.at.x !== u.pos.x) u.facing = pv.at.x > u.pos.x ? 1 : -1;
  ev.push({ t: 'attack', unit: u.id, target: `wall:${w.id}`, what: wpn.name, roll, ranged });
  reveal(u, ev);
  if (leavesNodes(u) && (ranged || !roll.success)) addNode(s, u, faceToward(w, u.pos), ev);
  if (roll.success) damageStructure(s, w, Math.max(1, rollDiceExpr(s, wpn.dice, roll.crit)), ev, pv.at);
  return null;
}

/** A loud action in the stealth phase starts the fight (unaware guards are surprised). */
const loud = (s: BattleState, u: Unit): AfterHits => (s.phase === 'stealth' ? { openFightBy: u.id } : {});

// --- hits, clones, Premonitory Evasion and Kawarimi ----------------------------------------

const KAWARIMI = 'substitution_kawarimi';

function canKawarimi(s: BattleState, t: Unit): boolean {
  if (t.kind !== 'ninja' || t.down || !t.turn.reaction || t.cond.surprised) return false;
  if (s.phase === 'stealth' && t.team === 'enemy') return false;
  if (!t.jutsus.includes(KAWARIMI) || effectMods(t.effects).noJutsu || !handsFree(t)) return false;
  return t.chakra >= JUTSU[KAWARIMI].cost;
}

/** An AI ninja dodges a blow (Evasion or Kawarimi) when it would drop it or take a third of its HP. */
const aiAvoids = (t: Unit, h: Hit): boolean => h.amount >= t.hp + t.tempHp || h.amount >= t.maxHp * 0.3;

/**
 * Lands queued hits in order. A clone takes an aimed blow instead of its ninja; a Mirai who saw it
 * coming may step aside (Premonitory Evasion), and a ninja who knows Kawarimi may swap with a log.
 * A player is asked, which pauses the queue; Evasion is offered first, and letting it go offers
 * Kawarimi for the same blow. Then whatever had to follow.
 */
function applyHits(s: BattleState, hits: Hit[], after: AfterHits, ev: BattleEvent[], resumed = false): void {
  const queue = [...hits];
  while (queue.length) {
    const h = queue.shift()!;
    const t = s.units[h.unit];
    if (!t || t.down === 'dead' || t.down === 'fled') continue;
    const blockable = h.aimed && h.amount > 0 && !h.unblockable;
    if (blockable && t.cond.clone) {
      t.cond.clone = false;
      ev.push({ t: 'clone', unit: t.id, on: false });
      continue;
    }
    if (blockable && !h.evadeDeclined && canEvade(s, t, h)) {
      if (t.controller === 'player') {
        s.pending = { kind: 'evasion', reactor: t.id, hit: h, rest: queue, after };
        ev.push({ t: 'reactionAsk', pending: s.pending });
        return;
      }
      if (aiAvoids(t, h)) {
        evade(s, t, h, ev);
        continue;
      }
    }
    if (blockable && canKawarimi(s, t)) {
      if (t.controller === 'player') {
        s.pending = { kind: 'kawarimi', reactor: t.id, hit: h, rest: queue, after };
        ev.push({ t: 'reactionAsk', pending: s.pending });
        return;
      }
      if (aiAvoids(t, h)) {
        kawarimi(s, t, h, ev);
        continue;
      }
    }
    landHit(s, t, h, ev);
  }
  finishAfter(s, after, ev, resumed);
}

function landHit(s: BattleState, t: Unit, h: Hit, ev: BattleEvent[]): void {
  if (h.amount > 0 || t.head?.severed) {
    damage(s, t, h.amount, h.type, { crit: h.crit, source: h.source, knockout: h.knockout, melee: h.melee, explosion: h.explosion }, ev);
  }
  if (t.down || t.head?.severed || t.kind === 'hydra_body') return;
  if (h.effect && !(h.effect === 'burning' && waterAtPt(s, t.pos) > 0)) {
    t.effects = addEffect(t.effects, h.effect, { source: JUTSU[h.what]?.name ?? h.what }).effects;
    ev.push({ t: 'effect', unit: t.id, effect: h.effect, on: true });
  }
  if (h.tension && t.team === 'party') {
    t.stats2.tension += 1;
    ev.push({ t: 'note', key: 'tensionUp', params: { name: t.name } });
  }
}

/** Kawarimi: the blow strikes a log and the ninja reappears a few meters away, away from danger. */
function kawarimi(s: BattleState, t: Unit, h: Hit, ev: BattleEvent[]): void {
  const spec = JUTSU[KAWARIMI];
  t.chakra -= spec.cost;
  t.turn.reaction = false;
  ev.push({ t: 'chakra', unit: t.id, delta: -spec.cost, chakra: t.chakra, reason: KAWARIMI });
  const from = { ...t.pos };
  const danger = h.source && s.units[h.source] ? s.units[h.source].pos : from;
  const to = freeSpot(s, t, from, 3, spec.range, (p) => dist(p, danger) + (hideSpotAt(s, p) >= 0 ? 2 : 0) + (coverBetween(s, danger, p) >= 2 ? 1 : 0));
  t.pos = to;
  ev.push({ t: 'kawarimi', unit: t.id, from, to });
}

function finishAfter(s: BattleState, after: AfterHits, ev: BattleEvent[], resumed: boolean): void {
  if (s.phase === 'stealth') {
    if (after.stealthAttack) {
      const a = s.units[after.stealthAttack.attacker];
      const t = s.units[after.stealthAttack.target];
      if (a && t) afterStealthAttack(s, a, t, ev);
    }
    if (after.alarmAt && s.phase === 'stealth') {
      const g = Object.values(s.units).find((u) => u.guard && !u.down);
      if (g) alarm(s, g, ev, after.alarmAt);
    }
    if (after.openFightBy && s.phase === 'stealth') openFight(s, after.openFightBy, ev);
  }
  if (resumed && after.resumeWalk) {
    const r = after.resumeWalk;
    const m = s.units[r.unit];
    if (m && !m.down && sameCell(cellOf(m.pos), r.at)) walk(s, m, r.path, r.stepIndex, ev, r.skip);
  }
}

/** The answer to a reaction prompt. */
function react(s: BattleState, unitId: string, take: boolean, ev: BattleEvent[]): string | null {
  const p = s.pending!;
  if (unitId !== p.reactor) return 'notYourReaction';
  s.pending = undefined;
  if (p.kind === 'opportunity') {
    const r = s.units[p.reactor];
    const m = s.units[p.mover];
    const at = cellOf(m.pos);
    if (take && r.turn.reaction && !r.down) {
      const paused = opportunityAttack(s, r, m, ev, { unit: m.id, path: p.path, stepIndex: p.stepIndex, skip: p.skip, at });
      if (paused) return null;
    }
    if (!m.down && sameCell(cellOf(m.pos), at)) walk(s, m, p.path, p.stepIndex, ev, p.skip);
    return null;
  }
  const t = s.units[p.reactor];
  if (p.kind === 'evasion') {
    // Letting Evasion go puts the blow back in the queue: Kawarimi may be offered for it next.
    if (take && canEvade(s, t, p.hit)) {
      evade(s, t, p.hit, ev);
      applyHits(s, p.rest, p.after, ev, true);
    } else applyHits(s, [{ ...p.hit, evadeDeclined: true }, ...p.rest], p.after, ev, true);
    return null;
  }
  if (take && canKawarimi(s, t)) kawarimi(s, t, p.hit, ev);
  else landHit(s, t, p.hit, ev);
  applyHits(s, p.rest, p.after, ev, true);
  return null;
}

// --- jutsu ---------------------------------------------------------------------------------

/** Chakra a jutsu costs this unit (enhanced, and Centered chakra's discount on the first jutsu). */
export function jutsuCost(u: Unit, spec: JutsuSpec, enh: boolean): number {
  const discount = !spec.ability && u.stats2.jutsuCast === 0 ? effectMods(u.effects).firstJutsuDiscount : 0;
  return Math.max(0, spec.cost + (enh ? spec.enhCost : 0) - discount);
}

function doJutsu(s: BattleState, u: Unit, id: string, atIn: Pt, targetId: string | undefined, enh: boolean, ev: BattleEvent[], target2Id?: string): string | null {
  const base = JUTSU[id];
  if (!base || !u.jutsus.includes(id)) return 'unknownJutsu';
  if (base.cast === 'reaction') return 'reactionOnly';
  if (effectMods(u.effects).noJutsu) return 'chakraSealed';
  if (enh && !base.enhCost) return 'noEnhanced';
  const spec = enh ? enhanced(base) : base;
  const cost = jutsuCost(u, base, enh);
  if (u.chakra < cost) return 'noChakra';
  if (base.cast === 'bonus' ? !u.turn.bonus : !u.turn.action) return 'noAction';
  // Hand seals need both hands: the weapon is stowed for free (once a turn), or the jutsu waits.
  const seals = needsSeals(u, base);
  if (seals && !handsFree(u) && u.turn.interacted) return 'handsBusy';
  const target = targetId ? s.units[targetId] : undefined;
  let at: Pt = target ? { ...target.pos } : { ...atIn };
  if (spec.shape === 'self' || spec.shape === 'selfCircle') at = { ...u.pos };
  const d = dist(u.pos, at);
  // Command and Natural Submission take only some minds, refused in their own order (range and
  // sight last); from level 9, Command takes a second one.
  const minds: Unit[] = [];
  if (spec.special === 'command' || spec.special === 'submission') {
    const blocker = spec.special === 'command' ? commandBlocker : submissionBlocker;
    const ids = target2Id && target2Id !== targetId ? [targetId, target2Id] : [targetId];
    if (ids.length > 1 && (spec.special !== 'command' || u.level < 9)) return 'oneTarget';
    for (const tid of ids) {
      const t = tid ? s.units[tid] : undefined;
      const why = blocker(s, u, t);
      if (why) return why;
      minds.push(t!);
    }
  }
  switch (spec.shape) {
    case 'single':
      if (!target || !targetable(target)) return 'needTarget';
      if (d > spec.range + 0.1 + (target.bulk ?? 0) + (target.kind === 'hydra_head' ? 2.5 : 0)) return 'outOfRange';
      if (!spec.melee && !lineOfSight(s, u.pos, target.pos)) return 'noSight';
      if (spec.melee && fullCoverBetween(s, u.pos, target.pos)) return 'blocked';
      break;
    case 'ally':
      if (!target || target.team !== u.team || !targetable(target)) return 'needAlly';
      if (d > spec.range + 0.1) return 'outOfRange';
      break;
    case 'circle':
    case 'point':
    case 'wall':
      if (d > spec.range + 0.1) return 'outOfRange';
      if (!lineOfSight(s, u.pos, at)) return 'noSight';
      break;
    case 'cone':
    case 'line':
      if (d < 0.3) return 'needDirection';
      break;
    case 'node': {
      // Warp Strike: one of the Ryusei's own Nodes, landing beside it if someone stands on it.
      const n = ownNodeAt(s, u, at);
      const why = warpBlocker(s, u, n);
      if (why) return why;
      at = warpLanding(s, u, n!)!;
      break;
    }
    case 'onNode': {
      const why = swapBlocker(s, u, target);
      if (why) return why;
      break;
    }
  }
  if (spec.special === 'flicker') {
    const c = cellOf(at);
    if (cellBlocked(s, c) || waterAtPt(s, at) === 2 || !canStop(s, u, c)) return 'blocked';
    at = cellCenter(c);
  }
  // A Kōton structure never rises over anyone.
  if (spec.special === 'metalBlock' || spec.special === 'metalWall') {
    const why = structureBlocker(s, structureAt(spec, u.pos, at, u.id, ''));
    if (why) return why;
  }
  if (seals && !handsFree(u)) setArmed(u, false, 'free', ev);
  // Pay, and spend the action.
  u.chakra -= cost;
  if (cost) ev.push({ t: 'chakra', unit: u.id, delta: -cost, chakra: u.chakra, reason: id });
  if (!base.ability) u.stats2.jutsuCast += 1;
  if (base.cast === 'bonus') u.turn.bonus = false;
  else u.turn.action = false;
  if (spec.loud) reveal(u, ev);
  if (spec.melee && spec.shape === 'single' && target) dashTo(s, u, target, ev);
  if (at.x !== u.pos.x) u.facing = at.x > u.pos.x ? 1 : -1;
  const area = areaOf(spec, u.pos, at);
  ev.push({ t: 'jutsu', unit: u.id, jutsu: id, at, shape: area, enhanced: enh });
  const hits: Hit[] = [];
  switch (spec.special) {
    case 'heal':
      heal(target!, rollDiceExpr(s, spec.dice ?? '2d8+3'), id, ev);
      break;
    case 'flicker': {
      const from = { ...u.pos };
      ev.push({ t: 'teleport', unit: u.id, from, to: at });
      u.pos = at;
      revealOutOfHiding(s, u, ev);
      enteredAura(s, u, from, ev);
      break;
    }
    case 'clone':
      u.cond.clone = true;
      ev.push({ t: 'clone', unit: u.id, on: true });
      break;
    case 'trap': {
      const trap: Trap = { id: `trap_${s.tick}_${u.id}`, kind: 'tag', pos: at, owner: u.team, dc: u.saveDC, dice: spec.dice ?? '3d6', radius: spec.radius ?? 1.5 };
      s.traps.push(trap);
      ev.push({ t: 'trap', trap, on: true });
      break;
    }
    case 'earthWall':
    case 'waterWall':
      raiseWall(s, u, spec, at, ev);
      break;
    case 'metalBlock':
    case 'metalWall':
      raiseStructure(s, u, spec, at, ev);
      break;
    case 'warp':
    case 'swap': {
      // A warp into a Northstar's aura costs half the movement left (being swapped in doesn't).
      const from = { ...u.pos };
      if (spec.special === 'warp') warpStrike(s, u, at, ev);
      else spatialSwap(s, u, target!, ev);
      enteredAura(s, u, from, ev);
      break;
    }
    case 'command':
    case 'submission':
      // A mind taken changes sides: the enemies who meant to strike it, or help it, plan again.
      for (const t of minds) {
        if (spec.special === 'command') command(s, u, t, ev);
        else submit(s, u, t, ev);
        if (t.team === u.team) replanAgainst(s, t.id, ev);
      }
      break;
    default:
      hits.push(...jutsuHits(s, u, spec, target, at, ev));
  }
  if (spec.loud && s.phase === 'combat') scareAnimalsNear(s, at, 6, ev);
  applyHits(s, hits, spec.loud ? loud(s, u) : {}, ev);
  return null;
}

/** Saves (or attack rolls) for everyone the jutsu reaches, plus what it does to the ground. */
function jutsuHits(s: BattleState, u: Unit, spec: JutsuSpec, target: Unit | undefined, at: Pt, ev: BattleEvent[]): Hit[] {
  const area = areaOf(spec, u.pos, at);
  const fromCaster = spec.shape === 'selfCircle' || spec.shape === 'cone' || spec.shape === 'line';
  const victims = area ? unitsInArea(s, area, fromCaster ? [u.id] : [], fromCaster ? u.pos : at) : target ? [target] : [];
  const type = spec.dmgType ?? 'Force';
  const amount = spec.dice ? rollDiceExpr(s, spec.dice) : 0;
  // Areas dent the Kōton structures they reach (an illusion doesn't).
  if (area && spec.dmgType && type !== 'Psychic') hitStructuresIn(s, area, amount, ev);
  // A Ryusei's warp edge goes with its next attack roll: a jutsu that rolls to hit can't be blocked.
  const edge = !spec.save && victims.length > 0 && !!u.cond.warpEdge;
  const hits: Hit[] = [];
  for (const v of victims) {
    const extra: Partial<Hit> = { aimed: !area, effect: spec.effect, tension: spec.tension, ...(edge ? { unblockable: true } : {}) };
    if (spec.save) {
      hits.push(saveHit(s, v, spec.save, u.saveDC, amount, type, spec.saveHalf, u.id, spec.id, extra, ev, spec.saveAdv));
      continue;
    }
    const pv = attackPreview(s, u, v, 'jutsu', { jutsuRange: spec.range });
    const roll = check(s, 'attack', pv.mod, pv.ac, pv.adv, true);
    ev.push({ t: 'attack', unit: u.id, target: v.id, what: spec.id, roll, ranged: !spec.melee });
    if (roll.success) hits.push({ unit: v.id, amount: roll.crit && spec.dice ? amount + rollDiceExpr(s, spec.dice) : amount, type, source: u.id, what: spec.id, crit: roll.crit, ...extra });
  }
  if (edge) u.cond.warpEdge = false;
  // The ground: fire burns, wind cuts the foliage, blasts set off barrels and tags.
  const ground = area ?? { kind: 'circle' as const, center: at, radius: 1 };
  if (spec.dmgType) hits.push(...groundEffects(s, ground, spec.env === 'clearFoliage' ? 'Wind' : type, ev, new Set(), spec.env === 'clearFoliage'));
  // Lightning in the water runs through it.
  if (type === 'Lightning') {
    const points = victims.map((v) => v.pos);
    if (area?.kind === 'circle') points.push(area.center);
    hits.push(...electrify(s, points, amount, u.saveDC, u.id, victims.map((v) => v.id), ev));
  }
  return hits;
}

/** Taijutsu and kenjutsu strikes: the caster flashes in next to the target. */
function dashTo(s: BattleState, u: Unit, t: Unit, ev: BattleEvent[]): void {
  const reach = reachTo(u, t);
  if (dist(u.pos, t.pos) <= reach + 0.1) return;
  const from = { ...u.pos };
  const to = freeSpot(s, u, t.pos, 0.4, reach, (p) => -dist(p, from));
  if (to === t.pos) return;
  u.pos = to;
  ev.push({ t: 'move', unit: u.id, path: [to], run: true });
  // A flash-in is a dash: into a Northstar's aura, it costs half the movement left.
  enteredAura(s, u, from, ev);
}

/** Earth and water walls stand across the caster's line, centered on the point. */
function raiseWall(s: BattleState, u: Unit, spec: JutsuSpec, at: Pt, ev: BattleEvent[]): void {
  const earth = spec.special === 'earthWall';
  const wall: Wall = {
    id: `wall_${s.tick}_${u.id}`,
    kind: earth ? 'earth' : 'water',
    ...wallAcross(u.pos, at, spec.length ?? 4.5),
    hp: earth ? 30 : 15,
    rounds: earth ? undefined : 3,
  };
  s.walls.push(wall);
  ev.push({ t: 'wall', wall, on: true });
}

/** Ninjutsu and genjutsu are woven with hand seals; taijutsu, sword arts and bloodline abilities are not. */
export const needsSeals = (u: Unit, spec: JutsuSpec): boolean => u.kind === 'ninja' && !spec.melee && !spec.ability;

function setArmed(u: Unit, armed: boolean, cost: 'free' | 'bonus', ev: BattleEvent[]): void {
  u.armed = armed;
  if (cost === 'free') u.turn.interacted = true;
  else u.turn.bonus = false;
  ev.push({ t: 'weapon', unit: u.id, armed, cost });
}

/**
 * Draw or stow the weapon: free once a turn (an object interaction), then it takes the bonus action.
 * Stowed, hands are free for seals and Kawarimi, but blows are struck with the fists.
 */
function doDraw(u: Unit, ev: BattleEvent[]): string | null {
  if (!u.weapon.held) return 'noWeapon';
  if (!u.turn.interacted) setArmed(u, !u.armed, 'free', ev);
  else if (u.turn.bonus) setArmed(u, !u.armed, 'bonus', ev);
  else return 'noBonus';
  return null;
}

// --- the other actions ---------------------------------------------------------------------

function doBasic(s: BattleState, u: Unit, act: 'dash' | 'disengage' | 'dodge' | 'focus', ev: BattleEvent[]): string | null {
  if (!u.turn.action) return 'noAction';
  u.turn.action = false;
  ev.push({ t: 'act', unit: u.id, act });
  switch (act) {
    case 'dash':
      u.turn.move += u.speed;
      u.turn.dashed = true;
      break;
    case 'disengage':
      u.cond.disengaged = true;
      ev.push({ t: 'condition', unit: u.id, cond: 'disengaged', on: true });
      break;
    case 'dodge':
      u.cond.dodging = true;
      ev.push({ t: 'condition', unit: u.id, cond: 'dodging', on: true });
      break;
    case 'focus': {
      // Focus chakra: 1d6 + casting modifier back; attacks against the ninja have advantage.
      const gain = Math.max(1, rollDiceExpr(s, '1d6') + u.castMod);
      const was = u.chakra;
      u.chakra = Math.min(u.maxChakra, u.chakra + gain);
      u.cond.focusing = true;
      ev.push({ t: 'chakra', unit: u.id, delta: u.chakra - was, chakra: u.chakra, reason: 'focus' });
      ev.push({ t: 'condition', unit: u.id, cond: 'focusing', on: true });
      break;
    }
  }
  return null;
}

/** Hide: in a bush, tall grass, behind cover or in the dark, a Stealth roll against the foes' eyes. */
function doHide(s: BattleState, u: Unit, ev: BattleEvent[]): string | null {
  if (!u.turn.action) return 'noAction';
  const foes = Object.values(s.units).filter((o) => o.team !== u.team && !o.down && o.kind !== 'hydra_body');
  const watchers = foes.filter((o) => lineOfSight(s, o.pos, u.pos));
  const inSpot = hideSpotAt(s, u.pos) >= 0;
  const covered = watchers.every((o) => coverBetween(s, o.pos, u.pos, [o.id, u.id]) >= 2);
  if (!inSpot && !covered && s.time !== 'night') return 'nowhereToHide';
  u.turn.action = false;
  const adv = s.time === 'night' || effectMods(u.effects).advStealth ? 'advantage' : 'none';
  const dc = Math.max(10, ...watchers.map((o) => passivePerception(o)));
  const roll = check(s, 'check', skillMod(u, 'stealth'), dc, adv);
  ev.push({ t: 'check', unit: u.id, what: 'stealth', roll });
  if (roll.success) {
    u.cond.hidden = roll.total;
    ev.push({ t: 'condition', unit: u.id, cond: 'hidden', on: true });
  } else ev.push({ t: 'note', key: 'hideFailed', params: { name: u.name } });
  return null;
}

/** Crouching (a bonus action) keeps a hidden ninja hidden and halves how much guards notice it. */
function doCrouch(s: BattleState, u: Unit, ev: BattleEvent[]): string | null {
  if (u.cond.crouched) {
    u.cond.crouched = false;
    if (hideSpotAt(s, u.pos) < 0) u.cond.hidden = undefined;
    ev.push({ t: 'act', unit: u.id, act: 'stand' });
    ev.push({ t: 'condition', unit: u.id, cond: 'crouched', on: false });
    return null;
  }
  if (!u.turn.bonus) return 'noBonus';
  u.turn.bonus = false;
  u.cond.crouched = true;
  ev.push({ t: 'act', unit: u.id, act: 'crouch' });
  ev.push({ t: 'condition', unit: u.id, cond: 'crouched', on: true });
  return null;
}

/** Ninja jump (bonus action): climbing and dropping a level cost little for the rest of the turn. */
function doJump(u: Unit, ev: BattleEvent[]): string | null {
  if (!u.turn.bonus) return 'noBonus';
  u.turn.bonus = false;
  u.cond.ninjaJump = true;
  ev.push({ t: 'act', unit: u.id, act: 'jump' });
  ev.push({ t: 'condition', unit: u.id, cond: 'ninjaJump', on: true });
  return null;
}

/** Shove: Athletics against the target's Athletics or Acrobatics; knock it prone or push it 1.5 m. */
function doShove(s: BattleState, u: Unit, targetId: string, mode: 'prone' | 'push', ev: BattleEvent[]): string | null {
  if (!u.turn.action) return 'noAction';
  const t = s.units[targetId];
  if (!t || t.down || t.team === u.team) return 'badTarget';
  if (t.kind !== 'ninja') return 'tooBig';
  if (dist(u.pos, t.pos) > 1.6) return 'outOfRange';
  if (fullCoverBetween(s, u.pos, t.pos)) return 'blocked';
  u.turn.action = false;
  const def = check(s, 'check', Math.max(skillMod(t, 'athletics'), skillMod(t, 'acrobatics')), 0);
  ev.push({ t: 'check', unit: t.id, what: 'resistShove', roll: def });
  const atk = check(s, 'check', skillMod(u, 'athletics'), def.total + 1);
  ev.push({ t: 'check', unit: u.id, what: 'shove', roll: atk });
  const after = loud(s, u);
  if (!atk.success) {
    applyHits(s, [], after, ev);
    return null;
  }
  const hits: Hit[] = [];
  if (mode === 'prone') {
    t.cond.prone = true;
    ev.push({ t: 'condition', unit: t.id, cond: 'prone', on: true });
  } else {
    const d = Math.max(0.01, dist(u.pos, t.pos));
    const dest = { x: t.pos.x + ((t.pos.x - u.pos.x) / d) * 1.5, z: t.pos.z + ((t.pos.z - u.pos.z) / d) * 1.5 };
    const c = cellOf(dest);
    if (!pushClear(s, t.pos, cellCenter(c)) || !canStop(s, t, c)) ev.push({ t: 'note', key: 'shoveBlocked', params: { name: t.name } });
    else {
      const from = { ...t.pos };
      const to = cellCenter(c);
      const drop = levelAtPt(s, from) - levelAtPt(s, to);
      t.pos = to;
      ev.push({ t: 'pushed', unit: t.id, from, to, fall: Math.max(0, Math.round(drop)) });
      // Off a ledge: 1d6 per level fallen, and down on the ground.
      if (drop >= 0.9) {
        t.cond.prone = true;
        hits.push({ unit: t.id, amount: rollDiceExpr(s, `${Math.round(drop)}d6`), type: 'Bludgeoning', source: u.id, what: 'fall' });
      }
      if (waterAtPt(s, to) > 0 && hasEffect(t.effects, 'burning')) {
        t.effects = removeEffect(t.effects, 'burning');
        ev.push({ t: 'effect', unit: t.id, effect: 'burning', on: false });
      }
    }
  }
  applyHits(s, hits, after, ev);
  return null;
}

/** Nothing stops a push on its way: no wall across it (nothing passes a metal wall), no blocked cell along it. */
function pushClear(s: BattleState, from: Pt, to: Pt): boolean {
  if (s.walls.some((w) => w.kind !== 'metalBlock' && segmentsCross(from, to, w.a, w.b))) return false;
  for (let k = 1; k <= 6; k++) {
    if (cellBlocked(s, cellOf({ x: from.x + ((to.x - from.x) * k) / 6, z: from.z + ((to.z - from.z) * k) / 6 }))) return false;
  }
  return true;
}

const near = (u: Unit, t: Unit): boolean => u.id === t.id || dist(u.pos, t.pos) <= 1.6;

function doItem(s: BattleState, u: Unit, item: 'pill' | 'bandage' | 'antidote' | 'tag', targetId: string | undefined, at: Pt | undefined, ev: BattleEvent[]): string | null {
  // The backpack is the party's: a commanded enemy or a beast that joined doesn't get into it.
  if (homeTeam(u) !== 'party' || u.joined) return 'noItems';
  if (item === 'pill') {
    // Soldier pill (bonus action): +2d6 chakra; after the battle it leaves Crash.
    if (!u.turn.bonus) return 'noBonus';
    if (s.supplies.soldierPills < 1) return 'noneLeft';
    if (u.chakra >= u.maxChakra) return 'fullChakra';
    u.turn.bonus = false;
    s.supplies.soldierPills -= 1;
    u.stats2.pills += 1;
    const was = u.chakra;
    u.chakra = Math.min(u.maxChakra, u.chakra + rollDiceExpr(s, '2d6'));
    ev.push({ t: 'act', unit: u.id, act: 'item' });
    ev.push({ t: 'chakra', unit: u.id, delta: u.chakra - was, chakra: u.chakra, reason: 'pill' });
    return null;
  }
  if (!u.turn.action) return 'noAction';
  if (item === 'tag') {
    // An explosive tag thrown at a point: it seals a hydra's stump like fire.
    if (s.supplies.explosiveTags < 1) return 'noneLeft';
    if (!at || dist(u.pos, at) > TAG.range + 0.1) return 'outOfRange';
    if (!lineOfSight(s, u.pos, at)) return 'noSight';
    u.turn.action = false;
    s.supplies.explosiveTags -= 1;
    ev.push({ t: 'act', unit: u.id, act: 'item' });
    applyHits(s, throwTag(s, u, at, ev), loud(s, u), ev);
    return null;
  }
  const t = targetId ? s.units[targetId] : u;
  if (!t || t.team !== u.team || !targetable(t)) return 'badTarget';
  if (!near(u, t)) return 'outOfRange';
  if (item === 'bandage') {
    // Bandage: 1d8 + WIS and stops Bleeding; a fallen ally gets back up.
    if (s.supplies.bandages < 1) return 'noneLeft';
    u.turn.action = false;
    s.supplies.bandages -= 1;
    ev.push({ t: 'act', unit: u.id, act: 'item' });
    if (hasEffect(t.effects, 'bleeding')) {
      t.effects = removeEffect(t.effects, 'bleeding');
      ev.push({ t: 'effect', unit: t.id, effect: 'bleeding', on: false });
    }
    heal(t, Math.max(1, rollDiceExpr(s, '1d8') + abilityMod(u.stats.wis)), 'bandage', ev);
    return null;
  }
  if (s.supplies.antidotes < 1) return 'noneLeft';
  if (!hasEffect(t.effects, 'poisoned')) return 'notPoisoned';
  u.turn.action = false;
  s.supplies.antidotes -= 1;
  t.effects = removeEffect(t.effects, 'poisoned');
  ev.push({ t: 'act', unit: u.id, act: 'item' });
  ev.push({ t: 'effect', unit: t.id, effect: 'poisoned', on: false });
  return null;
}

/** Stabilize a fallen ally: Medicine check, DC 10. */
function doStabilize(s: BattleState, u: Unit, targetId: string, ev: BattleEvent[]): string | null {
  if (!u.turn.action) return 'noAction';
  const t = s.units[targetId];
  if (!t || t.team !== u.team || t.down !== 'downed') return 'badTarget';
  if (!near(u, t)) return 'outOfRange';
  u.turn.action = false;
  const roll = check(s, 'check', skillMod(u, 'medicine'), 10);
  ev.push({ t: 'check', unit: u.id, what: 'medicine', roll });
  if (roll.success) {
    t.down = 'stable';
    ev.push({ t: 'down', unit: t.id, state: 'stable' });
  }
  return null;
}

/** Leaving by a map edge (the battle ends in a retreat when everyone standing has left). */
function doFlee(s: BattleState, u: Unit, ev: BattleEvent[]): string | null {
  const map = getMap(s.mapId);
  const atEdge = (map.exits.left && u.pos.x <= 1.5) || (map.exits.right && u.pos.x >= map.widthM - 1.5);
  if (!atEdge) return 'notAtEdge';
  if (s.phase === 'combat' && !u.turn.action) return 'noAction';
  u.turn.action = false;
  u.down = 'fled';
  u.cond = {};
  ev.push({ t: 'fled', unit: u.id });
  return null;
}
