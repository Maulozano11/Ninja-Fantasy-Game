// The AI: enemies, hydra heads and allies switched to the AI with an order (Aggressive, Defensive,
// Support). It only ever sends ordinary actions through the engine, one at a time, so an AI turn
// replays and travels over the network like a player's.

import type { Action, BattleEvent, BattleState, Cell, Intent, Pt, Unit } from './types';
import { cellCenter, cellOf, coverBetween, dist, gridFor, levelAtPt, lineOfSight } from './map';
import { canStop, occupancy, reachable } from './nav';
import { JUTSU } from './jutsu';
import { KUNAI, KUNAI_LONG, handsFree, wielded } from './units';
import { applyAction } from './engine';
import { current } from './turns';
import { headOptions, ninjaOptions, planIntent, reachTo, standingUnit } from './intent';

/** Whether the battle is waiting on the AI (an AI unit's turn in the fighting). */
export function aiToAct(s: BattleState): boolean {
  if (s.phase !== 'combat' || s.pending) return false;
  const u = current(s);
  return !!u && u.controller === 'ai';
}

/** Is a plan still doable: its target still up, its jutsu still affordable. */
function stillValid(s: BattleState, u: Unit, i: Intent | undefined): i is Intent {
  if (!i) return false;
  const t = i.target ? s.units[i.target] : undefined;
  if (i.target && (!t || !standingUnit(t))) {
    // Healing and reviving go to fallen friends; everything else needs a foe still standing.
    if (!(i.kind === 'heal' && t && t.down !== 'dead' && t.down !== 'fled' && t.down !== 'ko')) return false;
  }
  if ((i.kind === 'jutsu' || i.kind === 'spit' || i.kind === 'roar') && u.chakra < (JUTSU[i.what]?.cost ?? 0)) return false;
  if (i.kind === 'heal' && i.what === 'bandage' && s.supplies.bandages < 1) return false;
  return true;
}

/** The next action for the AI unit whose turn it is (null when it isn't the AI's turn). */
export function aiAction(s: BattleState): Action | null {
  if (!aiToAct(s)) return null;
  const u = current(s)!;
  const end: Action = { type: 'endTurn', unit: u.id };
  if (u.kind === 'hydra_body') return end;
  if (u.kind === 'hydra_head') return headAction(s, u) ?? end;
  if (!u.turn.action) {
    // After a dash, keep closing in with the extra movement.
    const plan = u.team === 'enemy' ? u.intent : planIntent(s, u);
    const t = plan?.target ? s.units[plan.target] : undefined;
    if (u.turn.dashed && t && standingUnit(t)) return moveToward(s, u, t.pos, (p) => dist(p, t.pos) <= reachTo(u, t), t) ?? end;
    return afterAction(s, u) ?? end;
  }
  // Enemies follow the plan they committed to (what a Mirai saw); allies plan each turn.
  let intent = u.team === 'enemy' && stillValid(s, u, u.intent) ? u.intent : planIntent(s, u);
  if (!stillValid(s, u, intent)) intent = planIntent(s, u);
  if (!intent) return end;
  return carryOut(s, u, intent) ?? fallback(s, u) ?? end;
}

function headAction(s: BattleState, u: Unit): Action | null {
  if (!u.turn.action) return null;
  let i = stillValid(s, u, u.intent) ? u.intent : undefined;
  // The planned bite is out of reach now (they moved away): pick again.
  if (i?.kind === 'bite' && dist(u.pos, s.units[i.target!].pos) > u.weapon.reach + 0.1) i = undefined;
  if (i && (i.kind === 'spit' || i.kind === 'roar')) {
    const t = s.units[i.target!];
    if (dist(u.pos, t.pos) > JUTSU[i.what].range + 0.1 || !lineOfSight(s, u.pos, t.pos)) i = undefined;
  }
  i ??= headOptions(s, u)[0]?.intent;
  if (!i) return null;
  const t = s.units[i.target!];
  if (i.kind === 'bite') return { type: 'attack', unit: u.id, target: t.id };
  // Spit and roar are aimed at a point (a splash, a cone).
  return { type: 'jutsu', unit: u.id, jutsu: i.what, at: { ...t.pos } };
}

/** One step toward the plan: act if in reach, otherwise move into reach. */
function carryOut(s: BattleState, u: Unit, i: Intent): Action | null {
  const t = i.target ? s.units[i.target] : undefined;
  switch (i.kind) {
    case 'defend':
      return { type: 'dodge', unit: u.id };
    case 'melee': {
      if (!t) return null;
      if (dist(u.pos, t.pos) <= reachTo(u, t) + 0.1) return { type: 'attack', unit: u.id, target: t.id, knockout: u.team === 'party' };
      return moveToward(s, u, t.pos, (p) => dist(p, t.pos) <= reachTo(u, t), t) ?? kunaiOr(s, u, t);
    }
    case 'ranged': {
      if (!t) return null;
      const d = dist(u.pos, t.pos);
      if (d <= KUNAI.reach && lineOfSight(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
      return moveToward(s, u, t.pos, (p) => dist(p, t.pos) <= KUNAI.reach && lineOfSight(s, p, t.pos), t) ?? kunaiOr(s, u, t);
    }
    case 'jutsu': {
      const j = JUTSU[i.what];
      if (!t || !j) return null;
      if (!j.melee && !handsFree(u) && u.turn.interacted) return null;
      const reach = j.range + (t.bulk ?? 0) + (j.shape === 'single' && t.kind === 'hydra_head' ? 2.5 : 0);
      const ok = (p: Pt) => dist(p, t.pos) <= reach && (j.melee || lineOfSight(s, p, t.pos));
      if (ok(u.pos)) return { type: 'jutsu', unit: u.id, jutsu: j.id, at: { ...t.pos }, target: j.shape === 'single' ? t.id : undefined };
      return moveToward(s, u, t.pos, ok, t);
    }
    case 'heal': {
      if (!t) return null;
      if (dist(u.pos, t.pos) <= 1.6) {
        if (i.what === 'mystical_palm') return { type: 'jutsu', unit: u.id, jutsu: 'mystical_palm', at: { ...t.pos }, target: t.id };
        if (i.what === 'bandage') return { type: 'item', unit: u.id, item: 'bandage', target: t.id };
        return { type: 'stabilize', unit: u.id, target: t.id };
      }
      return moveToward(s, u, t.pos, (p) => dist(p, t.pos) <= 1.6, undefined);
    }
    case 'move': {
      if (!t) return null;
      return moveToward(s, u, t.pos, () => false, t) ?? (u.turn.action ? { type: 'dash', unit: u.id } : null);
    }
    default:
      return null;
  }
}

/** Out of reach after moving: throw a kunai if it can, otherwise dash to close in. */
function kunaiOr(s: BattleState, u: Unit, t: Unit): Action | null {
  if (dist(u.pos, t.pos) <= KUNAI_LONG && lineOfSight(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
  if (u.turn.move < 0.5) return { type: 'dash', unit: u.id };
  return null;
}

/** Nothing worked: the best other option it can do from here, or a dash forward. */
function fallback(s: BattleState, u: Unit): Action | null {
  for (const o of ninjaOptions(s, u)) {
    const t = o.intent.target ? s.units[o.intent.target] : undefined;
    if (o.intent.kind === 'melee' && t && dist(u.pos, t.pos) <= reachTo(u, t) + 0.1) return { type: 'attack', unit: u.id, target: t.id };
    if (o.intent.kind === 'ranged' && t && dist(u.pos, t.pos) <= KUNAI_LONG && lineOfSight(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
  }
  return null;
}

/** After the action: defensive and support ninjas step into cover if they still can move. */
function afterAction(s: BattleState, u: Unit): Action | null {
  if (u.aiOrder === 'aggressive' || u.turn.move < 1 || u.turn.moved > 0) return null;
  const foes = Object.values(s.units).filter((o) => o.team !== u.team && standingUnit(o) && o.kind !== 'hydra_body');
  if (!foes.length) return null;
  const safe = (p: Pt) => foes.every((f) => coverBetween(s, f.pos, p, [f.id, u.id]) >= 2 || !lineOfSight(s, f.pos, p));
  if (safe(u.pos)) return null;
  const cell = bestCell(s, u, (p) => safe(p), (p) => dist(p, u.pos));
  return cell ? { type: 'move', unit: u.id, to: cell } : null;
}

/**
 * A move toward a goal: a reachable cell where `good` holds (cheapest, with cover and high ground
 * preferred), or else the reachable cell closest to the target point. Null if it can't get closer.
 */
function moveToward(s: BattleState, u: Unit, goal: Pt, good: (p: Pt) => boolean, foe: Unit | undefined): Action | null {
  if (u.turn.move < 0.5 || u.speed <= 0) return null;
  const score = (p: Pt) => {
    let v = 0;
    if (foe && coverBetween(s, foe.pos, p, [foe.id, u.id]) >= 2) v -= 1.5;
    if (foe && levelAtPt(s, p) - levelAtPt(s, foe.pos) >= 0.9) v -= 1;
    return v;
  };
  let cell = bestCell(s, u, good, score);
  if (!cell) {
    const here = dist(u.pos, goal);
    const c = bestCell(s, u, (p) => dist(p, goal) < here - 0.75, (p) => dist(p, goal) * 2 + score(p));
    cell = c;
  }
  if (!cell || (cell.c === cellOf(u.pos).c && cell.r === cellOf(u.pos).r)) return null;
  return { type: 'move', unit: u.id, to: cell };
}

/** The reachable cell (this turn) that satisfies `good` with the lowest movement cost + score. */
function bestCell(s: BattleState, u: Unit, good: (p: Pt) => boolean, score: (p: Pt) => number): Cell | null {
  const reach = reachable(s, u, u.turn.move);
  const g = gridFor(s.mapId);
  const occ = occupancy(s);
  let best: Cell | null = null;
  let bestV = Infinity;
  for (const [i, cost] of reach.cost) {
    const c = { c: i % g.cols, r: Math.floor(i / g.cols) };
    const p = cellCenter(c);
    if (!good(p) || !canStop(s, u, c, occ)) continue;
    const v = cost * 0.3 + score(p);
    if (v < bestV) {
      best = c;
      bestV = v;
    }
  }
  return best;
}

/**
 * Runs the AI until a person has to act (a player's turn, a reaction prompt for a player, the
 * stealth phase) or the battle ends. Returns the new state and every event, in order.
 */
export function runAi(state: BattleState, maxSteps = 400): { state: BattleState; events: BattleEvent[] } {
  let s = state;
  const events: BattleEvent[] = [];
  let lastUnit = '';
  let stepsThisTurn = 0;
  for (let n = 0; n < maxSteps; n++) {
    const a = aiAction(s);
    if (!a) break;
    const u = current(s)!;
    stepsThisTurn = u.id === lastUnit ? stepsThisTurn + 1 : 0;
    lastUnit = u.id;
    // A unit that keeps trying without finishing gives up its turn.
    const act: Action = stepsThisTurn > 6 ? { type: 'endTurn', unit: u.id } : a;
    let out = applyAction(s, act);
    if (!out.ok) out = applyAction(s, { type: 'endTurn', unit: u.id });
    if (!out.ok) break;
    s = out.state;
    events.push(...out.events);
  }
  return { state: s, events };
}
