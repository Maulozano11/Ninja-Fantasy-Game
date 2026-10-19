// What a unit means to do on its turn. Enemies commit to a plan at the end of each of their turns
// (and when the fighting starts), with where they will walk first, and a Mirai's Eye of Tomorrow
// shows it to the party. The AI carries the plan out on its next turn if it still makes sense, or
// plans again.

import { averageDice, parseDice } from '../rules/dice';
import { abilityMod } from '../rules/checks';
import { hasEffect } from '../rules/effects';
import type { BattleState, Cell, Intent, Pt, Unit } from './types';
import { cellCenter, cellOf, coverBetween, dist, fullCoverBetween, gridFor, levelAtPt, lineOfSight, sameCell } from './map';
import { canStop, occupancy, reachable } from './nav';
import { JUTSU, areaOf, inArea } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { passivePerception } from './combat';
import { KUNAI, KUNAI_LONG, wielded } from './units';
import { FORESIGHT_RANGE } from './clans';

const avg = (dice?: string): number => {
  const d = dice ? parseDice(dice) : null;
  return d ? averageDice(d) : 0;
};

export const standingUnit = (u: Unit): boolean => !u.down && !u.head?.severed;

/** Foes a unit knows about: standing, and not hidden from it. */
export function visibleFoes(s: BattleState, u: Unit): Unit[] {
  return Object.values(s.units).filter(
    (f) => f.team !== u.team && standingUnit(f) && f.kind !== 'hydra_body' && (f.cond.hidden === undefined || passivePerception(u) >= f.cond.hidden),
  );
}

/** Melee reach to a target (hydra heads rise high, the body is big). */
export const reachTo = (u: Unit, t: Unit): number => u.weapon.reach + (t.kind === 'hydra_head' ? 2.5 : 0) + (t.bulk ?? 0);

/** The jutsu that deal damage and can be aimed at a foe. */
export const offensive = (j: JutsuSpec): boolean => !!j.dice && !!j.dmgType && !j.special && j.cast !== 'reaction';
export const offensiveOrFear = (j: JutsuSpec): boolean => offensive(j) || (!!j.tension && !j.special);

export interface Option {
  intent: Intent;
  value: number;
}

/** How much a unit wants to hit a foe, by its order: the weakest, or the closest threat. */
function focus(u: Unit, f: Unit): number {
  const hurt = 1 - f.hp / Math.max(1, f.maxHp);
  const near = 1 / (1 + dist(u.pos, f.pos) / 6);
  if (u.aiOrder === 'aggressive') return 1 + hurt;
  return 1 + near * 0.8 + hurt * 0.3;
}

/** Foes and friends an area would hit. */
function areaValue(s: BattleState, u: Unit, j: JutsuSpec, at: Unit): number {
  const area = areaOf(j, u.pos, at.pos);
  if (!area) return 1;
  let v = 0;
  for (const o of Object.values(s.units)) {
    if (!standingUnit(o) || o.kind === 'hydra_body') continue;
    if (o.id === u.id && (j.shape === 'selfCircle' || j.shape === 'cone' || j.shape === 'line')) continue;
    if (!inArea(area, o.pos)) continue;
    // Friends caught in the blast weigh more than foes: the AI only risks it for a crowd.
    v += o.team === u.team ? -2.5 : 1;
  }
  return v;
}

/** Every reasonable thing a ninja (enemy, or an ally on AI) could do this turn, best first. */
export function ninjaOptions(s: BattleState, u: Unit): Option[] {
  const out: Option[] = [];
  const foes = visibleFoes(s, u);
  const friends = Object.values(s.units).filter((o) => o.team === u.team && o.kind === 'ninja' && o.down !== 'dead' && o.down !== 'fled' && o.down !== 'ko');
  const strMod = abilityMod(u.stats.str);
  const dexMod = abilityMod(u.stats.dex);
  const wMod = u.weapon.finesse ? Math.max(strMod, dexMod) : strMod;
  const sealed = hasEffect(u.effects, 'chakra_sealed');
  for (const f of foes) {
    const d = dist(u.pos, f.pos);
    const fx = focus(u, f);
    if (d <= u.speed + reachTo(u, f) + 0.1) out.push({ intent: { kind: 'melee', what: u.weapon.name, target: f.id }, value: (avg(u.weapon.dice) + wMod) * 0.65 * fx });
    if (d <= KUNAI_LONG + u.speed) out.push({ intent: { kind: 'ranged', what: KUNAI.name, target: f.id }, value: (avg(KUNAI.dice) + dexMod) * 0.55 * fx * (d > KUNAI.reach + u.speed ? 0.5 : 1) });
    if (sealed) continue;
    for (const id of u.jutsus) {
      const j = JUTSU[id];
      if (!j || !offensive(j) || u.chakra < j.cost) continue;
      if (d > j.range + u.speed + (f.bulk ?? 0)) continue;
      const hits = areaValue(s, u, j, f);
      if (hits <= 0) continue;
      const thrift = u.chakra >= j.cost * 2 ? 1 : 0.85;
      // A save made with disadvantage (Pursuing Flame) fails more often.
      const lands = j.save ? (j.saveAdv === 'disadvantage' ? 0.85 : 0.75) : 0.65;
      out.push({ intent: { kind: 'jutsu', what: id, target: f.id, at: { ...f.pos } }, value: avg(j.dice) * lands * hits * fx * thrift });
    }
  }
  // Helping: healing a hurt friend, getting a fallen one back up.
  const support = u.aiOrder === 'support' ? 1.6 : u.aiOrder === 'defensive' ? 1.1 : 0.8;
  for (const f of friends) {
    const hurt = f.down === 'downed' || f.down === 'stable' || f.hp < f.maxHp * 0.5;
    if (!hurt) continue;
    if (!sealed && u.jutsus.includes('mystical_palm') && u.chakra >= JUTSU.mystical_palm.cost && dist(u.pos, f.pos) <= u.speed + 1.6) {
      out.push({ intent: { kind: 'heal', what: 'mystical_palm', target: f.id }, value: avg(JUTSU.mystical_palm.dice) * support * (f.down ? 2 : 1) });
    }
    if (u.team === 'party' && f.down === 'downed' && dist(u.pos, f.pos) <= u.speed + 1.6) {
      const bandage = s.supplies.bandages > 0;
      out.push({ intent: { kind: 'heal', what: bandage ? 'bandage' : 'stabilize', target: f.id }, value: (bandage ? 9 : 6) * support });
    }
  }
  // Hurt and in reach of a foe: dodge.
  const threatened = foes.some((f) => dist(u.pos, f.pos) <= wielded(f).reach + 0.5);
  if (threatened && u.hp < u.maxHp * 0.3) out.push({ intent: { kind: 'defend', what: 'dodge' }, value: u.aiOrder === 'defensive' ? 9 : 4 });
  return out.sort((a, b) => b.value - a.value);
}

/** A hydra head's choices: bite who is close, spit venom further away, roar at a crowd. */
export function headOptions(s: BattleState, u: Unit): Option[] {
  const out: Option[] = [];
  const foes = visibleFoes(s, u);
  const otherRoar = Object.values(s.units).some((h) => h.id !== u.id && h.head && h.intent?.kind === 'roar');
  for (const f of foes) {
    const d = dist(u.pos, f.pos);
    const fx = focus(u, f);
    if (d <= u.weapon.reach + 0.1 && !fullCoverBetween(s, u.pos, f.pos)) out.push({ intent: { kind: 'bite', what: 'Bite', target: f.id }, value: (avg(u.weapon.dice) + abilityMod(u.stats.str)) * 0.65 * fx });
    const spit = JUTSU.hydra_spit;
    if (u.chakra >= spit.cost && d <= spit.range + 0.1 && lineOfSight(s, u.pos, f.pos)) {
      const poison = hasEffect(f.effects, 'poisoned') ? 0 : 3;
      out.push({ intent: { kind: 'spit', what: 'hydra_spit', target: f.id, at: { ...f.pos } }, value: (avg(spit.dice) * 0.75 * areaValue(s, u, spit, f) + poison) * fx });
    }
  }
  const roar = JUTSU.hydra_roar;
  if (!otherRoar && u.chakra >= roar.cost && foes.length) {
    let best: Option | undefined;
    for (const f of foes) {
      if (dist(u.pos, f.pos) > roar.range) continue;
      const n = areaValue(s, u, roar, f);
      if (n >= 2 && (!best || n * 4 > best.value)) best = { intent: { kind: 'roar', what: 'hydra_roar', target: f.id, at: { ...f.pos } }, value: n * 4 };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.value - a.value);
}

/** The plan a unit commits to for its next turn. */
export function planIntent(s: BattleState, u: Unit): Intent | undefined {
  if (u.kind === 'hydra_body') return { kind: 'defend', what: 'thrash' };
  const opts = u.kind === 'hydra_head' ? headOptions(s, u) : ninjaOptions(s, u);
  if (opts.length) return opts[0].intent;
  // Nothing in reach: close in on the nearest foe.
  const foes = visibleFoes(s, u).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
  return foes.length && u.speed > 0 ? { kind: 'move', what: 'advance', target: foes[0].id } : undefined;
}

/** Where a plan takes a unit: the point it heads for and the spots it can carry the plan out from. */
export interface Goal {
  at: Pt;
  good: (p: Pt) => boolean;
  /** The foe it goes for (cover and high ground against it are worth a detour). */
  foe?: Unit;
  /** It can carry the plan out from where it stands (a blade reaches a hair further). */
  ready: boolean;
}

/** The goal of a plan that needs a target (null for a dodge, or a plan the AI can't follow). */
export function goalOf(s: BattleState, u: Unit, i: Intent): Goal | null {
  const t = i.target ? s.units[i.target] : undefined;
  if (!t) return null;
  const goal = (good: (p: Pt) => boolean, foe: Unit | undefined): Goal => ({ at: t.pos, good, foe, ready: good(u.pos) });
  switch (i.kind) {
    case 'melee': {
      // No blow lands across a metal wall: it has to go around (or break through).
      const good = (p: Pt) => dist(p, t.pos) <= reachTo(u, t) && !fullCoverBetween(s, p, t.pos);
      return { ...goal(good, t), ready: dist(u.pos, t.pos) <= reachTo(u, t) + 0.1 && !fullCoverBetween(s, u.pos, t.pos) };
    }
    case 'ranged':
      return goal((p) => dist(p, t.pos) <= KUNAI.reach && lineOfSight(s, p, t.pos), t);
    case 'jutsu': {
      const j = JUTSU[i.what];
      if (!j) return null;
      const reach = j.range + (t.bulk ?? 0) + (j.shape === 'single' && t.kind === 'hydra_head' ? 2.5 : 0);
      return goal((p) => dist(p, t.pos) <= reach && (j.melee || lineOfSight(s, p, t.pos)), t);
    }
    case 'heal':
      return goal((p) => dist(p, t.pos) <= 1.6, undefined);
    case 'move':
      return goal(() => false, t);
    default:
      return null;
  }
}

/** The reachable cell (within `budget` meters) where `good` holds with the lowest movement cost + score. */
export function bestCell(s: BattleState, u: Unit, good: (p: Pt) => boolean, score: (p: Pt) => number, budget = u.turn.move): Cell | null {
  const reach = reachable(s, u, budget);
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
 * A step toward a goal with `budget` meters: a reachable cell where the plan can be carried out
 * (cheapest, with cover and high ground preferred), or else the reachable cell closest to the goal.
 * Only cells where `open` holds. Null if it can't get closer.
 */
export function stepToward(s: BattleState, u: Unit, g: Goal, budget: number, open: (p: Pt) => boolean = () => true): Cell | null {
  const foe = g.foe;
  const score = (p: Pt) => {
    let v = 0;
    if (foe && coverBetween(s, foe.pos, p, [foe.id, u.id]) >= 2) v -= 1.5;
    if (foe && levelAtPt(s, p) - levelAtPt(s, foe.pos) >= 0.9) v -= 1;
    return v;
  };
  const here = dist(u.pos, g.at);
  const cell = bestCell(s, u, (p) => g.good(p) && open(p), score, budget) ?? bestCell(s, u, (p) => dist(p, g.at) < here - 0.75 && open(p), (p) => dist(p, g.at) * 2 + score(p), budget);
  return cell && !sameCell(cell, cellOf(u.pos)) ? cell : null;
}

/**
 * Plans every enemy's next move (start of the fighting, or after its own turn), with where it will
 * walk first: from here, with a whole turn's movement (half of it if it must stand up first), and
 * not onto a spot another enemy already means to stop on.
 */
export function planEnemy(s: BattleState, u: Unit): void {
  if (u.team !== 'enemy' || u.down) {
    u.intent = undefined;
    return;
  }
  const i = planIntent(s, u);
  const g = i && u.speed > 0 ? goalOf(s, u, i) : null;
  if (i && g && !g.ready) {
    const taken = Object.values(s.units).flatMap((o) => (o.id !== u.id && o.team === u.team && !o.down && o.intent?.to ? [cellOf(o.intent.to)] : []));
    const c = stepToward(s, u, g, u.cond.prone ? u.speed / 2 : u.speed, (p) => !taken.some((t) => sameCell(t, cellOf(p))));
    if (c) i.to = cellCenter(c);
  }
  u.intent = i;
}

/** The Eye of Tomorrow in the party: the Mirai who can read the enemies' next moves. */
export const miraiSeers = (s: BattleState): Unit[] => Object.values(s.units).filter((u) => u.team === 'party' && !u.down && u.character?.clan === 'Mirai');

/** The enemies' plans a Mirai in the party sees with the Eye of Tomorrow (in range and in sight). */
export function foreseen(s: BattleState): Record<string, Intent> {
  const out: Record<string, Intent> = {};
  const seers = miraiSeers(s);
  if (!seers.length) return out;
  for (const e of Object.values(s.units)) {
    if (e.team !== 'enemy' || !e.intent || e.down) continue;
    if (seers.some((m) => dist(m.pos, e.pos) <= FORESIGHT_RANGE && lineOfSight(s, m.pos, e.pos))) out[e.id] = e.intent;
  }
  return out;
}
