// The AI: enemies, hydra heads and allies switched to the AI with an order (Aggressive, Defensive,
// Support). It only ever sends ordinary actions through the engine, one at a time, so an AI turn
// replays and travels over the network like a player's.

import type { Action, BattleEvent, BattleState, Cell, Intent, Pt, Unit } from './types';
import { cellCenter, cellOf, coverBetween, dist, gridFor, idx, lineOfSight, sameCell } from './map';
import { canStop, reachable } from './nav';
import { JUTSU } from './jutsu';
import { KUNAI_LONG, handsFree } from './units';
import { applyAction } from './engine';
import { current } from './turns';
import { bestCell, goalOf, headOptions, ninjaOptions, planIntent, reachTo, standingUnit, stepToward } from './intent';
import type { Goal } from './intent';

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
    if (u.turn.dashed && t && standingUnit(t)) return moveToward(s, u, goalOf(s, u, { kind: 'melee', what: u.weapon.name, target: t.id })!) ?? end;
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

/** One step toward the plan: act if in reach, otherwise move into reach (where it planned to go). */
function carryOut(s: BattleState, u: Unit, i: Intent): Action | null {
  if (i.kind === 'defend') return { type: 'dodge', unit: u.id };
  const t = i.target ? s.units[i.target] : undefined;
  const g = goalOf(s, u, i);
  if (!t || !g) return null;
  switch (i.kind) {
    case 'melee':
      if (g.ready) return { type: 'attack', unit: u.id, target: t.id, knockout: u.team === 'party' };
      return moveToward(s, u, g, i.to) ?? kunaiOr(s, u, t);
    case 'ranged':
      if (g.ready) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
      return moveToward(s, u, g, i.to) ?? kunaiOr(s, u, t);
    case 'jutsu': {
      const j = JUTSU[i.what];
      if (!j.melee && !handsFree(u) && u.turn.interacted) return null;
      if (g.ready) return { type: 'jutsu', unit: u.id, jutsu: j.id, at: { ...t.pos }, target: j.shape === 'single' ? t.id : undefined };
      return moveToward(s, u, g, i.to);
    }
    case 'heal':
      if (g.ready) {
        if (i.what === 'mystical_palm') return { type: 'jutsu', unit: u.id, jutsu: 'mystical_palm', at: { ...t.pos }, target: t.id };
        if (i.what === 'bandage') return { type: 'item', unit: u.id, item: 'bandage', target: t.id };
        return { type: 'stabilize', unit: u.id, target: t.id };
      }
      return moveToward(s, u, g, i.to);
    case 'move':
      return moveToward(s, u, g, i.to) ?? (u.turn.action ? { type: 'dash', unit: u.id } : null);
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
 * A move toward a plan's goal (stepToward). An enemy keeps to the destination it planned, the one a
 * Mirai saw on the ground, while it can still get there and it serves the plan as well as a fresh
 * pick would. Null if it can't get closer.
 */
function moveToward(s: BattleState, u: Unit, g: Goal, planned?: Pt): Action | null {
  if (u.turn.move < 0.5 || u.speed <= 0) return null;
  const fresh = stepToward(s, u, g, u.turn.move);
  const kept = planned ? keptCell(s, u, g, planned) : null;
  const cell = kept && (g.good(cellCenter(kept)) || !fresh || !g.good(cellCenter(fresh))) ? kept : fresh;
  return cell ? { type: 'move', unit: u.id, to: cell } : null;
}

/** The planned cell, if it is still free and reachable this turn and still gets the plan done or closer. */
function keptCell(s: BattleState, u: Unit, g: Goal, to: Pt): Cell | null {
  const c = cellOf(to);
  if (sameCell(c, cellOf(u.pos)) || !canStop(s, u, c)) return null;
  if (!reachable(s, u, u.turn.move).cost.has(idx(gridFor(s.mapId), c))) return null;
  const p = cellCenter(c);
  return g.good(p) || dist(p, g.at) < dist(u.pos, g.at) - 0.75 ? c : null;
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
