// The stealth phase, played by turns (docs/GAMEPLAY_DESIGN.md, Stealth): the party moves, then every
// guard walks its patrol. A ninja in a guard's vision cone raises its suspicion; at 100 the guard
// raises the alarm and the battle begins. Running is noisy and startles animals; a thrown stone
// draws a guard to look; silent takedowns leave bodies that raise the alarm if seen.

import type { BattleEvent, BattleState, Cell, Pt, Unit } from './types';
import { cellCenter, cellOf, dist, gridFor, hideSpotAt, lineOfSight, getMap, propRules, levelAtPt } from './map';
import { pathCost, reachable, canStop, pathTo, stepCost } from './nav';
import { passivePerception } from './combat';
import { startCombat } from './turns';
import { foundOut, puddleCover, puddleKnownBy, puddlesUnder } from './puddle';

export const VISION = { day: 12, night: 7, near: 1.5, halfAngle: 50 };
const PATROL_STEP = 4.5;
const RUN_NOISE = 5;
const ANIMAL_SCARE = 4;
const ANIMAL_NOISE = 10;
const STONE_NOISE = 8;
export const STONE_RANGE = 12;

const deg = (r: number) => (r * 180) / Math.PI;
const guards = (s: BattleState): Unit[] => Object.values(s.units).filter((u) => u.guard && !u.down);

/** The direction a guard looks, in degrees (0 = toward +x). */
export const lookOf = (u: Unit): number => u.guard?.look ?? (u.facing > 0 ? 0 : 180);

/** A guard can see a point: in its cone (or right next to it), in range and with line of sight. */
export function seesPoint(s: BattleState, g: Unit, p: Pt): boolean {
  const d = dist(g.pos, p);
  if (d <= VISION.near) return true;
  const range = (s.time === 'night' ? VISION.night : VISION.day) + (levelAtPt(s, g.pos) - levelAtPt(s, p) >= 0.9 ? 3 : 0);
  if (d > range) return false;
  let diff = Math.abs(deg(Math.atan2(p.z - g.pos.z, p.x - g.pos.x)) - lookOf(g)) % 360;
  if (diff > 180) diff = 360 - diff;
  if (diff > VISION.halfAngle) return false;
  return lineOfSight(s, g.pos, p);
}

/**
 * How much a guard notices a ninja over a whole turn (0 = not at all, 100 = alarm at once). `moving`:
 * a step of its walk. A Liquid Body puddle (battle/puddle.ts) the guard didn't see melt is terrain
 * while it lies still, or moves on wet ground or water, if its Stealth beats the guard's eyes (even
 * close by); moving on dry ground it is noticed like a crouched ninja.
 */
export function exposure(s: BattleState, g: Unit, u: Unit, at: Pt = u.pos, moving = false): number {
  if (!seesPoint(s, g, at)) return 0;
  const d = dist(g.pos, at);
  if (u.cond.puddle && !puddleKnownBy(u, g)) {
    const hidden = u.cond.hidden !== undefined && passivePerception(g) < u.cond.hidden;
    if (hidden && (!moving || puddleCover(s, at))) return 0;
    const range = s.time === 'night' ? VISION.night : VISION.day;
    let rate = 100 * Math.max(0.25, 1 - Math.max(0, d - VISION.near) / (range - VISION.near)) * 0.5;
    if (s.time === 'night') rate *= 0.75;
    return rate;
  }
  const hidden = u.cond.hidden !== undefined && hideSpotAt(s, at) >= 0;
  if (hidden && d > VISION.near && passivePerception(g) < (u.cond.hidden ?? 0)) return 0;
  const range = s.time === 'night' ? VISION.night : VISION.day;
  let rate = 100 * Math.max(0.25, 1 - Math.max(0, d - VISION.near) / (range - VISION.near));
  if (u.cond.crouched) rate *= 0.5;
  if (hideSpotAt(s, at) >= 0) rate *= 0.5;
  if (s.time === 'night') rate *= 0.75;
  if (d <= VISION.near) rate = 100;
  return rate;
}

function addSuspicion(s: BattleState, g: Unit, u: Unit, amount: number, ev: BattleEvent[]): boolean {
  if (!g.guard || amount <= 0) return false;
  const v = Math.min(100, (g.guard.suspicion[u.id] ?? 0) + amount);
  g.guard.suspicion[u.id] = v;
  ev.push({ t: 'suspicion', guard: g.id, target: u.id, value: Math.round(v) });
  if (v >= 40 && v < 100) {
    g.guard.investigate = { ...u.pos };
    g.guard.look = deg(Math.atan2(u.pos.z - g.pos.z, u.pos.x - g.pos.x));
  }
  return v >= 100;
}

/** A guard raises the alarm: the battle begins and nobody is surprised. */
export function alarm(s: BattleState, g: Unit, ev: BattleEvent[], at?: Pt): void {
  if (s.phase !== 'stealth') return;
  ev.push({ t: 'alert', guard: g.id, at });
  startCombat(s, ev, g.id, []);
}

/** Guards who haven't noticed anyone (they are surprised if the party opens the fight). */
export function unawareGuards(s: BattleState): string[] {
  return guards(s)
    .filter((g) => !g.guard!.alerted && Object.values(g.guard!.suspicion).every((v) => v < 40))
    .map((g) => g.id);
}

/** The party opens the fight with a loud action: unaware guards are surprised. */
export function openFight(s: BattleState, by: string, ev: BattleEvent[]): void {
  if (s.phase !== 'stealth') return;
  startCombat(s, ev, by, unawareGuards(s));
}

function noise(s: BattleState, at: Pt, radius: number, source: string, ev: BattleEvent[], suspectId?: string, amount = 0): boolean {
  ev.push({ t: 'noise', at, radius, source });
  let alarmed = false;
  for (const g of guards(s)) {
    if (dist(g.pos, at) > radius) continue;
    g.guard!.investigate = { ...at };
    g.guard!.look = deg(Math.atan2(at.z - g.pos.z, at.x - g.pos.x));
    ev.push({ t: 'investigate', guard: g.id, at });
    if (suspectId && amount) {
      const u = s.units[suspectId];
      if (u && addSuspicion(s, g, u, amount, ev)) {
        alarm(s, g, ev, u.pos);
        alarmed = true;
        break;
      }
    }
  }
  return alarmed;
}

/** Animals near a running ninja flee, and their noise reaches the guards nearby. */
function scareAnimals(s: BattleState, path: Pt[], runner: Unit, ev: BattleEvent[]): void {
  const map = getMap(s.mapId);
  map.props.forEach((p, i) => {
    if (!propRules(p).animal || s.props[i]?.fled) return;
    if (!path.some((q) => dist(q, p) <= ANIMAL_SCARE)) return;
    s.props[i] = { ...s.props[i], fled: true, fledAt: s.tick };
    ev.push({ t: 'animalFlees', prop: i });
    if (s.phase === 'stealth') noise(s, { x: p.x, z: p.z }, ANIMAL_NOISE, 'animal', ev, runner.id, 20);
  });
}

/** Animals flee from fighting near them (in battle they only add atmosphere). */
export function scareAnimalsNear(s: BattleState, at: Pt, radius: number, ev: BattleEvent[]): void {
  const map = getMap(s.mapId);
  map.props.forEach((p, i) => {
    if (!propRules(p).animal || s.props[i]?.fled || dist(p, at) > radius) return;
    s.props[i] = { ...s.props[i], fled: true, fledAt: s.tick };
    ev.push({ t: 'animalFlees', prop: i });
  });
}

/**
 * A ninja moves in the stealth phase: guards that see it along the way grow suspicious, running
 * (more than half its speed in a turn) is noisy and startles animals. `onStep` runs after each step
 * (traps); returning true stops the move there.
 */
export function stealthMove(s: BattleState, u: Unit, path: Cell[], ev: BattleEvent[], onStep?: (p: Pt) => boolean): void {
  const rules = { waterWalk: !!u.cond.waterWalk, ninjaJump: !!u.cond.ninjaJump };
  const pts: Pt[] = [];
  const stepShare = 1 / Math.max(1, u.speed / 0.5);
  let at = cellOf(u.pos);
  let cost = 0;
  let stopped = false;
  for (const c of path) {
    cost += stepCost(s, at, c, at.c !== c.c && at.r !== c.r, rules);
    at = c;
    const p = cellCenter(c);
    if (p.x !== u.pos.x) u.facing = p.x > u.pos.x ? 1 : -1;
    u.pos = p;
    pts.push(p);
    for (const g of guards(s)) {
      const e = exposure(s, g, u, p, true) * stepShare;
      if (e > 0 && addSuspicion(s, g, u, e, ev)) {
        spend(u, cost);
        ev.push({ t: 'move', unit: u.id, path: pts, run: false });
        alarm(s, g, ev, p);
        return;
      }
    }
    if (onStep) {
      const before = ev.length;
      if (onStep(p)) {
        // The move event goes before what the step set off.
        ev.splice(before, 0, { t: 'move', unit: u.id, path: [...pts], run: false });
        pts.length = 0;
        stopped = true;
        break;
      }
    }
  }
  // Moving out of a hiding place gives the hiding away (a puddle is its own).
  if (hideSpotAt(s, u.pos) < 0 && !u.cond.puddle) u.cond.hidden = undefined;
  spend(u, cost);
  const running = u.turn.moved > u.speed / 2 + 1e-6;
  if (!stopped) ev.push({ t: 'move', unit: u.id, path: pts, run: running });
  if (!running || s.phase !== 'stealth') return;
  u.cond.crouched = false;
  u.cond.hidden = undefined;
  scareAnimals(s, path.map(cellCenter), u, ev);
  if (s.phase !== 'stealth') return;
  for (const g of guards(s)) {
    if (dist(g.pos, u.pos) <= RUN_NOISE && addSuspicion(s, g, u, 35, ev)) {
      alarm(s, g, ev, u.pos);
      return;
    }
  }
}

function spend(u: Unit, cost: number): void {
  u.turn.move = Math.max(0, u.turn.move - cost);
  u.turn.moved += cost;
}

/** A thrown stone: the guards that hear it turn and go to look. */
export function throwStone(s: BattleState, u: Unit, at: Pt, ev: BattleEvent[]): void {
  noise(s, at, STONE_NOISE, 'stone', ev);
  u.turn.action = false;
}

/** Whether an attack on a guard could be a silent takedown: it hasn't noticed the attacker. */
export function canTakedown(s: BattleState, attacker: Unit, target: Unit): boolean {
  if (!target.guard || target.guard.alerted) return false;
  return (target.guard.suspicion[attacker.id] ?? 0) < 100;
}

/**
 * After an attack in the stealth phase: if the guard dropped and nobody else saw the attacker or
 * the guard, it is silent (a body stays); otherwise the alarm goes off.
 */
export function afterStealthAttack(s: BattleState, attacker: Unit, target: Unit, ev: BattleEvent[]): void {
  if (s.phase !== 'stealth') return;
  if (!target.down) {
    // It survived and shouts: the fight begins, and the guards who hadn't noticed are surprised.
    if (target.guard) target.guard.alerted = true;
    ev.push({ t: 'alert', guard: target.id, at: attacker.pos });
    openFight(s, attacker.id, ev);
    return;
  }
  for (const g of guards(s)) {
    if (g.id === target.id) continue;
    if (seesPoint(s, g, target.pos) || exposure(s, g, attacker) > 0) {
      alarm(s, g, ev, target.pos);
      return;
    }
  }
  s.bodies.push({ unit: target.id, pos: { ...target.pos }, hidden: hideSpotAt(s, target.pos) >= 0 });
  ev.push({ t: 'body', unit: target.id, hidden: hideSpotAt(s, target.pos) >= 0 });
}

/** Drags a body to a cell (double movement), hiding it if the cell is a bush or tall grass. */
export function dragBody(s: BattleState, u: Unit, bodyId: string, to: Cell, ev: BattleEvent[]): string | null {
  const body = s.bodies.find((b) => b.unit === bodyId);
  if (!body) return 'noBody';
  if (dist(body.pos, u.pos) > 1.6) return 'tooFar';
  const reach = reachable(s, u, u.turn.move, { dragging: true });
  if (!canStop(s, u, to)) return 'blocked';
  const path = pathTo(s, reach, to);
  if (!path || !path.length) return 'tooFar';
  const cost = pathCost(s, u, path, { dragging: true });
  if (cost > u.turn.move + 1e-6) return 'tooFar';
  const pts = path.map(cellCenter);
  u.pos = pts[pts.length - 1];
  u.turn.move -= cost;
  u.turn.moved += cost / 2;
  body.pos = { ...u.pos };
  const unit = s.units[bodyId];
  if (unit) unit.pos = { ...u.pos };
  body.hidden = hideSpotAt(s, body.pos) >= 0;
  ev.push({ t: 'move', unit: u.id, path: pts, run: false });
  ev.push({ t: 'body', unit: bodyId, hidden: body.hidden });
  return null;
}

/** The guards' turn: they walk their patrol or go to look, then check what they see. */
export function guardsTurn(s: BattleState, ev: BattleEvent[]): void {
  const party = Object.values(s.units).filter((u) => u.team === 'party' && !u.down);
  for (const g of guards(s)) {
    if (s.phase !== 'stealth') return;
    const gd = g.guard!;
    const target = gd.investigate ?? gd.route[gd.next];
    if (target) {
      const d = dist(g.pos, target);
      const step = Math.min(PATROL_STEP, d);
      if (d > 0.05) {
        const nx = g.pos.x + ((target.x - g.pos.x) / d) * step;
        const nz = g.pos.z + ((target.z - g.pos.z) / d) * step;
        const dest = walkableNear(s, g, { x: nx, z: nz });
        const from = { ...g.pos };
        gd.look = deg(Math.atan2(target.z - g.pos.z, target.x - g.pos.x));
        if (dest.x !== g.pos.x) g.facing = dest.x > g.pos.x ? 1 : -1;
        g.pos = dest;
        ev.push({ t: 'move', unit: g.id, path: [from, dest], run: false });
        // A guard that treads on a Liquid Body puddle finds the ninja in it: the alarm.
        const trodden = new Set<Unit>();
        const n = Math.ceil(dist(from, dest) / 0.25);
        for (let k = 1; k <= n; k++) for (const p of puddlesUnder(s, g, { x: from.x + ((dest.x - from.x) * k) / n, z: from.z + ((dest.z - from.z) * k) / n })) trodden.add(p);
        if (trodden.size) {
          for (const p of trodden) foundOut(p, g, ev);
          alarm(s, g, ev, [...trodden][0].pos);
          return;
        }
      }
      if (dist(g.pos, target) < 0.6) {
        if (gd.investigate) {
          gd.investigate = undefined;
          gd.look = (gd.look ?? 0) + 120;
        } else if (gd.route.length) gd.next = (gd.next + 1) % gd.route.length;
      }
    }
    // Bodies in sight raise the alarm.
    for (const b of s.bodies) {
      if (!b.hidden && seesPoint(s, g, b.pos)) {
        alarm(s, g, ev, b.pos);
        return;
      }
    }
    for (const u of party) {
      const e = exposure(s, g, u);
      if (e > 0) {
        if (addSuspicion(s, g, u, e, ev)) {
          alarm(s, g, ev, u.pos);
          return;
        }
      } else if ((gd.suspicion[u.id] ?? 0) > 0) {
        gd.suspicion[u.id] = Math.max(0, gd.suspicion[u.id] - 20);
        ev.push({ t: 'suspicion', guard: g.id, target: u.id, value: Math.round(gd.suspicion[u.id]) });
      }
    }
  }
  s.stealthTurn += 1;
  for (const u of party) {
    // A Liquid Body puddle moves at half speed.
    u.turn = { move: u.cond.puddle ? u.speed / 2 : u.speed, action: true, bonus: true, reaction: true, moved: 0 };
    // A warp edge lasts the turn it was won in.
    if (u.cond.warpEdge) u.cond.warpEdge = false;
  }
  s.stealthDone = [];
}

/** The closest free cell to where a guard wants to step. */
function walkableNear(s: BattleState, g: Unit, p: Pt): Pt {
  const reach = reachable(s, g, PATROL_STEP + 1);
  let best = g.pos;
  let bestD = dist(g.pos, p);
  const cols = gridFor(s.mapId).cols;
  for (const i of reach.cost.keys()) {
    const cell = { c: i % cols, r: Math.floor(i / cols) };
    const q = cellCenter(cell);
    const d = dist(q, p);
    if (d < bestD && canStop(s, g, cell)) {
      best = q;
      bestD = d;
    }
  }
  return best;
}

export { cellOf };
