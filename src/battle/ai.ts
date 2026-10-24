// The AI: enemies, hydra heads and allies switched to the AI with an order (Aggressive, Defensive,
// Support). It only ever sends ordinary actions through the engine, one at a time, so an AI turn
// replays and travels over the network like a player's.

import { effectMods, hasEffect } from '../rules/effects';
import type { Action, BattleEvent, BattleState, Cell, Intent, Pt, Unit } from './types';
import { cellCenter, cellOf, coverBetween, dampAt, dist, fullCoverBetween, gridFor, idx, lineOfSight, sameCell, segmentsCross, steamAt } from './map';
import { canStop, reachable } from './nav';
import { JUTSU, MIN_AIM } from './jutsu';
import { KUNAI_LONG } from './units';
import { applyAction, chargeLanding, handsBlocker, jutsuCost } from './engine';
import { current } from './turns';
import { areaValue, bestCell, goalOf, headOptions, ninjaOptions, offensive, planIntent, reachTo, standingUnit, stepToward, swapValue, visibleFoes, WALL, wallCover } from './intent';
import type { Goal } from './intent';
import { breakable, MAX_STRUCTURES, ownStructures, structureAt, structureAttack, structureBlocker, structureDist } from './structures';
import { coatLeft, poisonLeft, potionsLeft, senbonLeft } from './senbon';
import { IMBUE_COST, imbueBlocker, type ImbueElement, unitImbueElements, WATER_REACH, WEAPON_ELEMENT } from './imbue';
import { COMMAND, commandRefused, edgeFoe, ownNodes, submissionRefused, SWAP, WARP, warpBlocker, warpLanding } from './clans';

/** Whether the battle is waiting on the AI (an AI unit's turn in the fighting). */
export function aiToAct(s: BattleState): boolean {
  if (s.phase !== 'combat' || s.pending) return false;
  const u = current(s);
  return !!u && u.controller === 'ai';
}

/**
 * Is a plan still doable: its target still up and still on the side it was (a Command can turn a
 * foe into a friend and back), its jutsu still affordable, a mind still there to take.
 */
function stillValid(s: BattleState, u: Unit, i: Intent | undefined): i is Intent {
  if (!i) return false;
  const t = i.target ? s.units[i.target] : undefined;
  // A metal wall for cover and a Spatial Swap hold while they can still be made and still help.
  if (i.kind === 'jutsu' && i.what === WALL) return !!t && !!wallCover(s, u, t);
  if (i.kind === 'jutsu' && i.what === SWAP) return swapValue(s, u, t) > 0;
  if (i.target && (!t || !standingUnit(t))) {
    // Healing and reviving go to fallen friends; everything else needs a foe still standing.
    if (!(i.kind === 'heal' && t && t.down !== 'dead' && t.down !== 'fled' && t.down !== 'ko')) return false;
  }
  if (t && (i.kind === 'heal') !== (t.team === u.team)) return false;
  if ((i.kind === 'jutsu' || i.kind === 'spit' || i.kind === 'roar' || i.kind === 'command') && u.chakra < (JUTSU[i.what]?.cost ?? 0)) return false;
  // A bonus-action jutsu already cast (or the bonus action gone): the plan is done, and the action
  // left is planned again (the proposal's piece P7).
  if (i.kind === 'jutsu' && JUTSU[i.what]?.cast === 'bonus' && !u.turn.bonus) return false;
  // Friends who walked into where the blast would go: not worth it any more.
  if (i.kind === 'jutsu' && t && JUTSU[i.what] && areaValue(s, u, JUTSU[i.what], t) <= 0) return false;
  if (i.kind === 'command' && (i.what === COMMAND ? commandRefused : submissionRefused)(s, u, t)) return false;
  if (i.kind === 'heal' && i.what === 'bandage' && s.supplies.bandages < 1) return false;
  if (i.kind === 'heal' && i.what === 'healSenbon' && (potionsLeft(s, u) < 1 || senbonLeft(u) < 1 || t?.id === u.id)) return false;
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
    if (u.turn.dashed && t && standingUnit(t)) return moveToward(s, u, goalOf(s, u, { kind: 'melee', what: u.weapon.name, target: t.id })!) ?? leaveSteam(s, u, plan) ?? end;
    // Its action spent (a charge that landed in steam, a blow struck from inside it): it walks out
    // with the movement it has left, so it doesn't start its next turn burning there.
    return leaveSteam(s, u, plan) ?? bonusAfter(s, u) ?? afterAction(s, u) ?? end;
  }
  // Enemies follow the plan they committed to (what a Mirai saw); allies plan each turn.
  let intent = u.team === 'enemy' && stillValid(s, u, u.intent) ? u.intent : planIntent(s, u);
  if (!stillValid(s, u, intent)) intent = planIntent(s, u);
  // In the steam, it gets out first (it burns and blinds), unless its plan can be done from right
  // here: then it acts first and walks out after.
  const out = leaveSteam(s, u, intent);
  if (out) return out;
  if (!intent) return end;
  return bonusBefore(s, u, intent) ?? edgeStrike(s, u, intent) ?? carryOut(s, u, intent) ?? fallback(s, u) ?? end;
}

function headAction(s: BattleState, u: Unit): Action | null {
  if (!u.turn.action) return null;
  let i = stillValid(s, u, u.intent) ? u.intent : undefined;
  // The planned bite is out of reach now (they moved away, or a metal wall rose between): pick again.
  if (i?.kind === 'bite' && (dist(u.pos, s.units[i.target!].pos) > u.weapon.reach + 0.1 || fullCoverBetween(s, u.pos, s.units[i.target!].pos))) i = undefined;
  if (i && (i.kind === 'spit' || i.kind === 'roar')) {
    const t = s.units[i.target!];
    if (dist(u.pos, t.pos) > JUTSU[i.what].range + 0.1 || !lineOfSight(s, u.pos, t.pos)) i = undefined;
    // A foe that walked right under the head leaves the roar no direction: pick again.
    else if (i.kind === 'roar' && dist(u.pos, t.pos) < MIN_AIM) i = undefined;
  }
  i ??= headOptions(s, u)[0]?.intent;
  if (!i) return null;
  const t = s.units[i.target!];
  if (i.kind === 'bite') return { type: 'attack', unit: u.id, target: t.id };
  // Spit and roar are aimed at a point (a splash, a cone).
  return { type: 'jutsu', unit: u.id, jutsu: i.what, at: { ...t.pos } };
}

/**
 * A unit standing in steam walks out of it, to the nearest clear cell: one it can carry its plan out
 * from first, then the one toward its target. With its action still to come and the plan doable
 * from where it stands, it stays to act (it walks out afterwards, aiAction).
 */
function leaveSteam(s: BattleState, u: Unit, i: Intent | undefined): Action | null {
  if (!steamAt(s, u.pos) || walkBudget(u) < 0.5 || u.speed <= 0) return null;
  const g = i ? goalOf(s, u, i) : null;
  if (u.turn.action && g?.ready) return null;
  const t = i?.target ? s.units[i.target] : undefined;
  const cell = bestCell(s, u, (p) => !steamAt(s, p), (p) => (u.turn.action && g?.good(p) ? -4 : 0) + (t ? dist(p, t.pos) * 0.5 : 0), walkBudget(u));
  return cell ? { type: 'move', unit: u.id, to: cell } : null;
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
      return moveToward(s, u, g, i.to) ?? kunaiOr(s, u, t) ?? breakThrough(s, u, t);
    case 'ranged':
      if (g.ready) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
      return moveToward(s, u, g, i.to) ?? kunaiOr(s, u, t);
    case 'jutsu': {
      const j = JUTSU[i.what];
      // Where the wall goes is worked out again from where everyone stands now.
      if (i.what === WALL) {
        const c = wallCover(s, u, t);
        return c ? { type: 'jutsu', unit: u.id, jutsu: WALL, at: c.at } : null;
      }
      if (i.what === SWAP) return g.ready ? { type: 'jutsu', unit: u.id, jutsu: SWAP, at: { ...t.pos }, target: t.id } : null;
      if (handsBlocker(u, j)) return null;
      // A hand to charge (the activated Chidori): charged where it stands, then it walks in (the
      // plan is spent with the bonus action, and the walk is planned again with the hand charged).
      if (j.handCharge) return u.charged || !u.turn.bonus ? null : { type: 'jutsu', unit: u.id, jutsu: j.id, at: { ...u.pos } };
      // A charge with no clear run to its target from here: strike or close in another way.
      if (g.ready && j.charge && !chargeLanding(s, u, t)) return null;
      if (g.ready) return { type: 'jutsu', unit: u.id, jutsu: j.id, at: { ...t.pos }, target: j.shape === 'single' ? t.id : undefined };
      return moveToward(s, u, g, i.to) ?? (j.melee ? breakThrough(s, u, t) : null);
    }
    case 'command':
      if (g.ready) return { type: 'jutsu', unit: u.id, jutsu: i.what, at: { ...t.pos }, target: t.id };
      return moveToward(s, u, g, i.to);
    case 'heal':
      if (g.ready) {
        if (i.what === 'mystical_palm') return { type: 'jutsu', unit: u.id, jutsu: 'mystical_palm', at: { ...t.pos }, target: t.id };
        if (i.what === 'bandage') return { type: 'item', unit: u.id, item: 'bandage', target: t.id };
        if (i.what === 'healSenbon') return { type: 'item', unit: u.id, item: 'healSenbon', target: t.id };
        return { type: 'stabilize', unit: u.id, target: t.id };
      }
      return moveToward(s, u, g, i.to);
    case 'move': {
      const step = moveToward(s, u, g, i.to);
      if (step || !u.turn.action) return step;
      // Walked as far as it goes with nothing to strike: a Kōton raises its wall against the foes
      // shooting at it rather than dash on in the open (it advances under cover); others dash.
      const c = wallCover(s, u, u, true);
      return c ? { type: 'jutsu', unit: u.id, jutsu: WALL, at: c.at } : { type: 'dash', unit: u.id };
    }
    default:
      return null;
  }
}

/** Out of reach after moving: throw a kunai if it can, otherwise dash to close in. */
function kunaiOr(s: BattleState, u: Unit, t: Unit): Action | null {
  // A charged hand closes in rather than throw: out of movement, it dashes.
  if (u.charged) return u.turn.move < 0.5 && u.turn.action ? { type: 'dash', unit: u.id } : null;
  if (dist(u.pos, t.pos) <= KUNAI_LONG && lineOfSight(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
  if (u.turn.move < 0.5) return { type: 'dash', unit: u.id };
  return null;
}

/**
 * Walled off from its target (it can't get closer, nor throw at it): it strikes a foe's structure
 * in reach, the one in the way first.
 */
function breakThrough(s: BattleState, u: Unit, t: Unit): Action | null {
  let best: { id: string; v: number } | undefined;
  for (const w of s.walls) {
    const owner = w.owner ? s.units[w.owner] : undefined;
    if (!breakable(w) || !owner || owner.team === u.team) continue;
    const pv = structureAttack(s, u, w, false);
    // In reach, and no other metal wall across the swing (the engine refuses it).
    if (!pv.inRange || !pv.sight) continue;
    const v = structureDist(w, t.pos) - (w.kind === 'metal' && segmentsCross(u.pos, t.pos, w.a, w.b) ? 100 : 0);
    if (!best || v < best.v) best = { id: w.id, v };
  }
  return best ? { type: 'attack', unit: u.id, target: `wall:${best.id}` } : null;
}

/** Nothing worked: the best other option it can do from here, or a dash forward. */
function fallback(s: BattleState, u: Unit): Action | null {
  for (const o of ninjaOptions(s, u)) {
    const t = o.intent.target ? s.units[o.intent.target] : undefined;
    if (o.intent.kind === 'melee' && t && dist(u.pos, t.pos) <= reachTo(u, t) + 0.1 && !fullCoverBetween(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id };
    if (o.intent.kind === 'ranged' && t && dist(u.pos, t.pos) <= KUNAI_LONG && lineOfSight(s, u.pos, t.pos)) return { type: 'attack', unit: u.id, target: t.id, ranged: true };
  }
  return null;
}

/**
 * The bonus action, before the plan: a Ryusei warps to a Node beside a foe its feet can't reach this
 * turn; a Bukijutsu Master about to strike puts its element on its weapon; a ninja about to strike
 * with a blade or throw from where it stands coats its weapons with poison first.
 */
function bonusBefore(s: BattleState, u: Unit, i: Intent): Action | null {
  if (!u.turn.bonus) return null;
  return ryuseiWarp(s, u, i) ?? imbueFirst(s, u, i) ?? coatFirst(s, u, i);
}

/**
 * Weapon Element Enhancement before a blow (battle/imbue.ts): a Bukijutsu Master whose plan is a
 * blow of its weapon at a foe it can reach this turn (water's longer reach counted) puts its element
 * on the weapon first, if it has the chakra and the element isn't on it already. With two elements (its
 * second unlocked) it picks one (imbueChoice).
 */
function imbueFirst(s: BattleState, u: Unit, i: Intent): Action | null {
  if (i.kind !== 'melee' || !u.jutsus.includes(WEAPON_ELEMENT) || imbueBlocker(u) || effectMods(u.effects).noJutsu) return null;
  const spec = JUTSU[WEAPON_ELEMENT];
  if (u.chakra < Math.max(IMBUE_COST, jutsuCost(u, spec, false)) || handsBlocker(u, spec)) return null;
  const t = i.target ? s.units[i.target] : undefined;
  if (!t || t.team === u.team || !standingUnit(t)) return null;
  const element = imbueChoice(s, u, t);
  const reach = reachTo(u, t) + (element === 'Water' ? WATER_REACH : 0);
  if (dist(u.pos, t.pos) > reach + walkBudget(u) + 0.1) return null;
  return { type: 'jutsu', unit: u.id, jutsu: WEAPON_ELEMENT, at: { ...u.pos }, element };
}

/**
 * Which of its elements a Bukijutsu Master puts on its weapon for a blow at `t`: water when only its
 * longer reach brings the foe within a blow this turn; not fire at a foe already burning or standing in
 * the wet (its burn would not take), nor water at a burning foe (it would put the flames out); otherwise
 * its chakra type's.
 */
export function imbueChoice(s: BattleState, u: Unit, t: Unit): ImbueElement {
  const els = unitImbueElements(u);
  const far = dist(u.pos, t.pos) > reachTo(u, t) + walkBudget(u) + 0.1;
  if (far && els.includes('Water')) return 'Water';
  const burning = hasEffect(t.effects, 'burning');
  const fine = els.filter((e) => !((e === 'Fire' && (burning || dampAt(s, t.pos))) || (e === 'Water' && burning)));
  return fine[0] ?? els[0];
}

/** Weapon poison is worth a vial: its weapons not coated yet, a vial at hand (battle/senbon.ts). */
const canCoat = (s: BattleState, u: Unit): boolean => u.kind === 'ninja' && coatLeft(u) < 1 && poisonLeft(s, u) > 0;

/** A foe the poison works on: a ninja (the hydra's own venom runs in it). */
const poisonable = (f: Unit): boolean => f.kind === 'ninja';

/**
 * Weapon poison before the blow: the plan a blow with a blade in hand, or a throw, that it can make
 * from where it stands, at a foe the poison works on.
 */
function coatFirst(s: BattleState, u: Unit, i: Intent): Action | null {
  if (!canCoat(s, u) || !(i.kind === 'ranged' || (i.kind === 'melee' && u.weapon.held))) return null;
  const t = i.target ? s.units[i.target] : undefined;
  if (!t || t.team === u.team || !poisonable(t) || !goalOf(s, u, i)?.ready) return null;
  return { type: 'item', unit: u.id, item: 'poison' };
}

/**
 * Weapon poison with the bonus action left after the action, for the blows to come: what it means
 * to do on its next turn is a blow with a blade in hand, or a throw, at a foe the poison works on.
 */
function coatAfter(s: BattleState, u: Unit): Action | null {
  if (!canCoat(s, u)) return null;
  const next = planIntent(s, u, true);
  const t = next?.target ? s.units[next.target] : undefined;
  if (!next || !t || !poisonable(t) || !(next.kind === 'ranged' || (next.kind === 'melee' && u.weapon.held))) return null;
  return { type: 'item', unit: u.id, item: 'poison' };
}

/** A blow from `p` reaches the target (and no metal wall stands between). */
const strikesFrom = (s: BattleState, u: Unit, p: Pt, t: Unit): boolean => dist(p, t.pos) <= reachTo(u, t) + 0.1 && !fullCoverBetween(s, p, t.pos);

/**
 * A Ryusei out of reach of its target warps to one of its own Nodes: best, one that lands it right
 * beside the target, to strike from behind at once; otherwise, for a blow it means to walk in for
 * that its feet can't carry it to this turn, the one that lands it nearest, to walk the rest. A
 * jutsu it casts from where it stands, and the warp leaves it the chakra for it.
 */
function ryuseiWarp(s: BattleState, u: Unit, i: Intent): Action | null {
  const spec = JUTSU[WARP];
  if (!u.jutsus.includes(WARP) || effectMods(u.effects).noJutsu || u.chakra < jutsuCost(u, spec, false)) return null;
  const t = i.target ? s.units[i.target] : undefined;
  const j = i.kind === 'jutsu' ? JUTSU[i.what] : undefined;
  const walkIn = i.kind === 'melee' || !!j?.melee;
  if (!t || t.team === u.team || !(walkIn || i.kind === 'ranged' || i.kind === 'move')) return null;
  if (j && u.chakra < jutsuCost(u, spec, false) + jutsuCost(u, j, false)) return null;
  const reach = j?.melee ? j.range + (t.bulk ?? 0) : reachTo(u, t);
  if (dist(u.pos, t.pos) <= reach + 0.1) return null;
  const walkable = dist(u.pos, t.pos) <= reach + walkBudget(u);
  let best: { at: Pt; edge: boolean; d: number } | undefined;
  for (const n of ownNodes(s, u)) {
    if (warpBlocker(s, u, n)) continue;
    const land = warpLanding(s, u, n)!;
    const d = dist(land, t.pos);
    const edge = strikesFrom(s, u, land, t);
    if (!edge && (!walkIn || walkable || d > reach + walkBudget(u))) continue;
    if (!best || (edge && !best.edge) || (edge === best.edge && d < best.d)) best = { at: n.pos, edge, d };
  }
  return best ? { type: 'jutsu', unit: u.id, jutsu: WARP, at: { ...best.at } } : null;
}

/** Warped in beside a foe it meant to throw at or close in on: it strikes from behind now. */
function edgeStrike(s: BattleState, u: Unit, i: Intent): Action | null {
  if (!u.cond.warpEdge || (i.kind !== 'ranged' && i.kind !== 'move')) return null;
  const t = i.target ? s.units[i.target] : undefined;
  const foe = t && t.team !== u.team && standingUnit(t) && strikesFrom(s, u, u.pos, t) ? t : edgeFoe(s, u);
  return foe ? { type: 'attack', unit: u.id, target: foe.id, knockout: u.team === 'party' } : null;
}

/**
 * The bonus action, once the action is spent: a Kōton raises a metal block for cover; a ninja with a
 * damage jutsu cast as a bonus action (Pebble Shot) casts it at a foe; a ninja with weapon poison
 * coats its weapons for the next blows.
 */
function bonusAfter(s: BattleState, u: Unit): Action | null {
  if (!u.turn.bonus) return null;
  return kotonCover(s, u) ?? bonusStrike(s, u) ?? coatAfter(s, u);
}

/**
 * A damage jutsu cast as a bonus action, from where the ninja stands: at the foe in reach and in
 * sight with the least HP left, if it can be cast now (chakra, hands) and catches no friend.
 */
function bonusStrike(s: BattleState, u: Unit): Action | null {
  if (effectMods(u.effects).noJutsu) return null;
  let best: { a: Action; v: number } | undefined;
  for (const id of u.jutsus) {
    const j = JUTSU[id];
    if (!j || j.cast !== 'bonus' || j.melee || !offensive(j) || u.chakra < jutsuCost(u, j, false)) continue;
    if (handsBlocker(u, j)) continue;
    for (const f of visibleFoes(s, u)) {
      const reach = j.range + (f.bulk ?? 0) + (j.shape === 'single' && f.kind === 'hydra_head' ? 2.5 : 0);
      if (dist(u.pos, f.pos) > reach + 0.1 || !lineOfSight(s, u.pos, f.pos) || areaValue(s, u, j, f) <= 0) continue;
      const v = 1 - f.hp / Math.max(1, f.maxHp);
      if (!best || v > best.v) best = { a: { type: 'jutsu', unit: u.id, jutsu: id, at: { ...f.pos }, target: j.shape === 'single' ? f.id : undefined }, v };
    }
  }
  return best?.a ?? null;
}

const BLOCK = 'koton_block';

/** Where a block can stand right in front of a unit: its centre 1 m out (its 3 × 3 cells stop short of the unit's own) and under 1.2 m away. */
const BLOCK_SPOTS: [number, number][] = [
  [1, 0], [1, 0.5], [0.5, 1], [0, 1], [-0.5, 1], [-1, 0.5], [-1, 0], [-1, -0.5], [-0.5, -1], [0, -1], [0.5, -1], [1, -0.5],
];

/**
 * A Kōton out in the open raises a metal block against the nearest foe that sees it from 3 m or
 * more, if no structure of its own stands within 2 m and the chakra for its cheapest jutsu is
 * left over. Never the full wall: where to wall off the field takes judgment the AI doesn't have.
 */
function kotonCover(s: BattleState, u: Unit): Action | null {
  const spec = JUTSU[BLOCK];
  if (!u.jutsus.includes(BLOCK) || effectMods(u.effects).noJutsu) return null;
  const costs = u.jutsus.filter((id) => JUTSU[id] && offensive(JUTSU[id])).map((id) => jutsuCost(u, JUTSU[id], false));
  if (u.chakra < jutsuCost(u, spec, false) + (costs.length ? Math.min(...costs) : 0)) return null;
  const own = ownStructures(s, u.id);
  if (own.some((w) => structureDist(w, u.pos) <= 2)) return null;
  // A block never makes its own standing wall crumble (the oldest goes when a third rises).
  if (own.length >= MAX_STRUCTURES && own[0].kind === 'metal') return null;
  const foe = visibleFoes(s, u)
    .filter((f) => dist(f.pos, u.pos) >= 3 && lineOfSight(s, f.pos, u.pos) && coverBetween(s, f.pos, u.pos, [f.id, u.id]) < 2)
    .sort((a, b) => dist(a.pos, u.pos) - dist(b.pos, u.pos))[0];
  if (!foe) return null;
  // Right in front of it, toward the foe: the block shelters it from the foe, but not the foe from
  // its own kunai and jutsu (cover the attacker stands right behind doesn't count).
  const d = dist(u.pos, foe.pos);
  let best: { at: Pt; v: number } | undefined;
  for (const [dx, dz] of BLOCK_SPOTS) {
    const at = { x: u.pos.x + dx, z: u.pos.z + dz };
    const w = structureAt(spec, u.pos, at, u.id, '');
    if (structureBlocker(s, w) || !lineOfSight(s, u.pos, at)) continue;
    if (coverBetween({ ...s, walls: [...s.walls, w] }, foe.pos, u.pos, [foe.id, u.id]) < 2) continue;
    const v = (dx * (foe.pos.x - u.pos.x) + dz * (foe.pos.z - u.pos.z)) / (Math.hypot(dx, dz) * d);
    if (!best || v > best.v) best = { at, v };
  }
  return best ? { type: 'jutsu', unit: u.id, jutsu: BLOCK, at: best.at } : null;
}

/** After the action: defensive and support ninjas step into cover if they still can move. */
function afterAction(s: BattleState, u: Unit): Action | null {
  if (u.aiOrder === 'aggressive' || walkBudget(u) < 1 || u.turn.moved > 0) return null;
  const foes = Object.values(s.units).filter((o) => o.team !== u.team && standingUnit(o) && o.kind !== 'hydra_body');
  if (!foes.length) return null;
  // Steam hides it from every foe, but burns: never a place to take cover in.
  const safe = (p: Pt) => !steamAt(s, p) && foes.every((f) => coverBetween(s, f.pos, p, [f.id, u.id]) >= 2 || !lineOfSight(s, f.pos, p));
  if (safe(u.pos)) return null;
  const cell = bestCell(s, u, (p) => safe(p), (p) => dist(p, u.pos), walkBudget(u));
  return cell ? { type: 'move', unit: u.id, to: cell } : null;
}

/** The movement left to walk with: standing up first takes half the speed (as the engine charges it). */
const walkBudget = (u: Unit): number => u.turn.move - (u.cond.prone ? u.speed / 2 : 0);

/**
 * A move toward a plan's goal (stepToward), never onto steam. An enemy keeps to the destination it planned, the one a
 * Mirai saw on the ground, while it can still get there and it serves the plan as well as a fresh
 * pick would. Null if it can't get closer.
 */
function moveToward(s: BattleState, u: Unit, g: Goal, planned?: Pt): Action | null {
  const budget = walkBudget(u);
  if (budget < 0.5 || u.speed <= 0) return null;
  // It never stops in steam (it may walk through): stepping in beside its target only to walk out
  // again on the next step would spend its movement going in and out.
  const clear = (p: Pt) => !steamAt(s, p);
  const fresh = stepToward(s, u, g, budget, clear);
  const kept = planned && clear(planned) ? keptCell(s, u, g, planned, budget) : null;
  const cell = kept && (g.good(cellCenter(kept)) || !fresh || !g.good(cellCenter(fresh))) ? kept : fresh;
  return cell ? { type: 'move', unit: u.id, to: cell } : null;
}

/** The planned cell, if it is still free and reachable this turn and still gets the plan done or closer. */
function keptCell(s: BattleState, u: Unit, g: Goal, to: Pt, budget: number): Cell | null {
  const c = cellOf(to);
  if (sameCell(c, cellOf(u.pos)) || !canStop(s, u, c)) return null;
  if (!reachable(s, u, budget).cost.has(idx(gridFor(s.mapId), c))) return null;
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
