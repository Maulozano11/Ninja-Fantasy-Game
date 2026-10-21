// What a unit means to do on its turn. Enemies commit to a plan at the end of each of their turns
// (and when the fighting starts), with where they will walk first, and a Mirai's Eye of Tomorrow
// shows it to the party. The AI carries the plan out on its next turn if it still makes sense, or
// plans again.

import { averageDice, parseDice } from '../rules/dice';
import { abilityMod, successChance } from '../rules/checks';
import { effectMods, hasEffect } from '../rules/effects';
import type { BattleEvent, BattleState, Cell, Intent, Pt, Unit } from './types';
import { homeTeam } from './types';
import { cellCenter, cellOf, clearRun, coverBetween, dist, fullCoverBetween, gridFor, levelAtPt, lineOfSight, sameCell } from './map';
import { canStop, occupancy, reachable } from './nav';
import { JUTSU, MIN_AIM, areaOf, inArea } from './jutsu';
import type { JutsuSpec } from './jutsu';
import { passivePerception, saveMod } from './combat';
import { KUNAI, KUNAI_LONG, wielded } from './units';
import { COMMAND, FORESIGHT_RANGE, SUBMISSION, SWAP, WARP, commandRefused, ownNodes, submissionRefused, swapBlocker, warpBlocker, warpLanding } from './clans';
import { ownStructures, structureAt, structureBlocker } from './structures';

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
  /** A jutsu that reaches just one foe (the clan's own move can take its place). */
  single?: boolean;
  /** A Ryusei's own move: a Shooting-Star Thrust in beside the foe, or a kunai that leaves a Node near it. */
  way?: 'warp' | 'plant';
}

/** How much a unit wants to hit a foe, by its order: the weakest, or the closest threat. */
function focus(u: Unit, f: Unit): number {
  const hurt = 1 - f.hp / Math.max(1, f.maxHp);
  const near = 1 / (1 + dist(u.pos, f.pos) / 6);
  if (u.aiOrder === 'aggressive') return 1 + hurt;
  return 1 + near * 0.8 + hurt * 0.3;
}

/** Foes and friends an area would hit (1 for a jutsu with no area). */
export function areaValue(s: BattleState, u: Unit, j: JutsuSpec, at: Unit): number {
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

// --- the clans' own moves (docs/CLANS_DESIGN.md, D21) ---------------------------------------

/** Pursuing Flame, the Mirai's own Katon. */
export const FLAME = 'katon_pursuing_flame';
/** Modular Architecture's wall (Kōton). */
export const WALL = 'koton_wall';
/**
 * Pursuing Flame takes the place of a jutsu worth up to two and a half times as much on that foe:
 * the rogues' Fireball (3d8) and Kagero's Lightning Hound (4d6+3), but not Kagero's Chidori (5d8),
 * which he opens with (the owner, 2026-10-20).
 */
const FLAME_FOR = 2.5;
/** A blow from behind (Shooting-Star Thrust): advantage, and nothing blocks it. Worth half again a plain blow. */
const EDGE = 1.5;

/** Chakra sealed: no jutsu, no clan ability. */
const noJutsu = (u: Unit): boolean => effectMods(u.effects).noJutsu;

/** About what a unit deals on its turn: its best blow, kunai or affordable jutsu on one foe, on average. */
export function threat(u: Unit): number {
  const strMod = abilityMod(u.stats.str);
  const dexMod = abilityMod(u.stats.dex);
  const w = wielded(u);
  let best = Math.max((avg(w.dice) + (w.finesse ? Math.max(strMod, dexMod) : strMod)) * 0.65, (avg(KUNAI.dice) + dexMod) * 0.55);
  if (!noJutsu(u)) {
    for (const id of u.jutsus) {
      const j = JUTSU[id];
      if (j && offensive(j) && u.chakra >= j.cost) best = Math.max(best, avg(j.dice) * (j.save ? 0.75 : 0.65));
    }
  }
  return best;
}

/**
 * A Ryusei can make a Shooting-Star Thrust on its turn: it has the ability, its chakra isn't sealed, 2 chakra and,
 * planning the turn it is in, its bonus action left (`next`: planning its next turn, fresh).
 */
export const canWarp = (u: Unit, next = false): boolean =>
  u.jutsus.includes(WARP) && !noJutsu(u) && u.chakra >= JUTSU[WARP].cost && (next || u.turn.bonus);

/**
 * Where a Ryusei's Shooting-Star Thrust lands to strike `t` from behind at once: the landing nearest `t` of
 * its own Nodes (within 18 m and in sight) that has `t` in reach with no metal wall between. Null
 * if none does (or it is in reach already: it just strikes).
 */
export function warpStrikeAt(s: BattleState, u: Unit, t: Unit): Pt | null {
  const reach = reachTo(u, t) + 0.1;
  if (dist(u.pos, t.pos) <= reach && !fullCoverBetween(s, u.pos, t.pos)) return null;
  let best: { at: Pt; d: number } | undefined;
  for (const n of ownNodes(s, u)) {
    if (warpBlocker(s, u, n)) continue;
    const land = warpLanding(s, u, n)!;
    const d = dist(land, t.pos);
    if (d > reach || fullCoverBetween(s, land, t.pos)) continue;
    if (!best || d < best.d) best = { at: land, d };
  }
  return best?.at ?? null;
}

/** Foes of a side still standing (not the hydra's body, which nobody fights directly). */
const foesOf = (s: BattleState, u: Unit): Unit[] => Object.values(s.units).filter((o) => o.team !== u.team && standingUnit(o) && o.kind !== 'hydra_body');

/**
 * What a Spatial Swap with `t` (on one of the Ryusei's Nodes, within reach of the swap) is worth;
 * 0 when it doesn't clearly help. It helps a hurt friend that a foe can strike, when the Ryusei is
 * healthy and out of every foe's reach: the friend goes to safety and the Ryusei takes its place. It
 * helps against a foe that likely fails its STR save, pulled in among two or more of the Ryusei's
 * friends with none of its own near.
 */
export function swapValue(s: BattleState, u: Unit, t: Unit | undefined): number {
  if (!t || !standingUnit(t) || !u.jutsus.includes(SWAP) || noJutsu(u) || u.chakra < JUTSU[SWAP].cost || swapBlocker(s, u, t)) return 0;
  const foes = foesOf(s, u);
  const struck = (p: Pt) => foes.some((f) => f.id !== t.id && dist(f.pos, p) <= wielded(f).reach + 0.6);
  if (t.team === u.team) {
    if (t.hp > t.maxHp * 0.5 || u.hp < u.maxHp * 0.5 || !struck(t.pos) || struck(u.pos)) return 0;
    return 6 + 10 * (1 - t.hp / t.maxHp);
  }
  const mine = Object.values(s.units).filter((o) => o.id !== u.id && o.team === u.team && o.kind === 'ninja' && standingUnit(o) && dist(o.pos, u.pos) <= 2.5);
  const theirs = Object.values(s.units).filter((o) => o.id !== t.id && o.team === t.team && standingUnit(o) && dist(o.pos, u.pos) <= 3);
  const fails = 1 - successChance(saveMod(t, 'str'), u.saveDC, 'none', true);
  if (mine.length < 2 || theirs.length || fails < 0.5) return 0;
  return fails * mine.reduce((v, o) => v + threat(o), 0);
}

/** A friend is hurt enough to shelter: half its HP or less. */
const hurtFriend = (o: Unit): boolean => o.kind === 'ninja' && standingUnit(o) && o.hp <= o.maxHp * 0.5;

export interface WallCover {
  /** Where the wall is raised (its centre). */
  at: Pt;
  /** The foes it hides the friend from. */
  hidden: string[];
  /** What it is worth: the harm those foes would have dealt the friend (a share of each one's, split among the friends it sees). */
  worth: number;
}

/**
 * Where a Kōton's metal wall shelters `p` (itself, or a hurt friend) from the foes that can shoot
 * at it: `p` hurt (half its HP or less; `advancing`: the Kōton itself, whole, with nothing to strike
 * this turn) and no foe able to strike it where it stands (within 3 m, or its weapon's reach); the
 * wall within 6 m of the Kōton, in its sight and over nobody, across the line to those foes; it
 * must hide `p` from two or more of them, or (not advancing) from every one. The spot worth the
 * most wins. Null if none does, or the Kōton already has a wall standing (one at a time, so a new
 * one never topples it).
 */
export function wallCover(s: BattleState, u: Unit, p: Unit, advancing = false): WallCover | null {
  const spec = JUTSU[WALL];
  if (!u.jutsus.includes(WALL) || noJutsu(u) || u.chakra < spec.cost || p.team !== u.team) return null;
  if (advancing ? p.id !== u.id : !hurtFriend(p)) return null;
  if (ownStructures(s, u.id).some((w) => w.kind === 'metal')) return null;
  const foes = foesOf(s, u);
  // A foe that can strike it where it stands (or step around a wall to do it) is no shooter to hide from.
  if (foes.some((f) => dist(f.pos, p.pos) <= Math.max(3, wielded(f).reach + 0.5))) return null;
  const shooters = foes.filter((f) => dist(f.pos, p.pos) <= KUNAI_LONG && lineOfSight(s, f.pos, p.pos));
  if (!shooters.length) return null;
  // Each of them shoots at one of the friends it sees: the share that would have gone at this one.
  const side = Object.values(s.units).filter((o) => o.team === u.team && standingUnit(o) && o.kind !== 'hydra_body');
  const seen = (f: Unit): number => Math.max(1, side.filter((o) => dist(f.pos, o.pos) <= KUNAI_LONG && lineOfSight(s, f.pos, o.pos)).length);
  // Toward each of them, and toward all of them at once, a little way out from the friend.
  const dirs = shooters.map((f) => ({ x: f.pos.x - p.pos.x, z: f.pos.z - p.pos.z }));
  dirs.push(dirs.reduce((a, b) => ({ x: a.x + b.x / Math.hypot(b.x, b.z), z: a.z + b.z / Math.hypot(b.x, b.z) }), { x: 0, z: 0 }));
  let best: { at: Pt; hidden: Unit[]; v: number } | undefined;
  for (const dv of dirs) {
    const l = Math.hypot(dv.x, dv.z);
    if (l < 1e-6) continue;
    for (const r of [1.25, 2, 2.75]) {
      const at = { x: p.pos.x + (dv.x / l) * r, z: p.pos.z + (dv.z / l) * r };
      if (dist(u.pos, at) > spec.range || dist(u.pos, at) < 0.5 || !lineOfSight(s, u.pos, at)) continue;
      const w = structureAt(spec, u.pos, at, u.id, '');
      if (structureBlocker(s, w)) continue;
      const after = { ...s, walls: [...s.walls, w] };
      const hidden = shooters.filter((f) => !lineOfSight(after, f.pos, p.pos));
      if (hidden.length < 2 && (advancing || hidden.length < shooters.length)) continue;
      const v = hidden.reduce((x, f) => x + threat(f) / seen(f), 0);
      if (!best || v > best.v + 1e-9) best = { at, hidden, v };
    }
  }
  return best ? { at: best.at, hidden: best.hidden.map((f) => f.id), worth: best.v } : null;
}

/** Every reasonable thing a ninja (enemy, or an ally on AI) could do this turn (`next`: on its next turn), best first. */
export function ninjaOptions(s: BattleState, u: Unit, next = false): Option[] {
  const out: Option[] = [];
  const foes = visibleFoes(s, u);
  const friends = Object.values(s.units).filter((o) => o.team === u.team && o.kind === 'ninja' && o.down !== 'dead' && o.down !== 'fled' && o.down !== 'ko');
  const strMod = abilityMod(u.stats.str);
  const dexMod = abilityMod(u.stats.dex);
  const wMod = u.weapon.finesse ? Math.max(strMod, dexMod) : strMod;
  const sealed = hasEffect(u.effects, 'chakra_sealed');
  const warps = canWarp(u, next);
  // A kunai leaves a Node to warp to on the next turn (2 chakra left for it).
  const plants = u.jutsus.includes(WARP) && !noJutsu(u) && u.chakra >= JUTSU[WARP].cost;
  for (const f of foes) {
    const d = dist(u.pos, f.pos);
    const fx = focus(u, f);
    const blow = (avg(u.weapon.dice) + wMod) * 0.65 * fx;
    // A Ryusei with a Node beside the foe warps in and strikes from behind, however far it is.
    const warpIn = warps ? warpStrikeAt(s, u, f) : null;
    if (warpIn) out.push({ intent: { kind: 'melee', what: u.weapon.name, target: f.id }, value: blow * EDGE, way: 'warp' });
    else if (d <= u.speed + reachTo(u, f) + 0.1) out.push({ intent: { kind: 'melee', what: u.weapon.name, target: f.id }, value: blow });
    if (d <= KUNAI_LONG + u.speed) {
      // With no Node near the foe yet (and the foe out of reach), the kunai leaves one: half a blow from behind more.
      const plant = plants && !warpIn && d > reachTo(u, f) + 0.1;
      const v = (avg(KUNAI.dice) + dexMod) * 0.55 * fx * (d > KUNAI.reach + u.speed ? 0.5 : 1) + (plant ? blow * EDGE * 0.5 : 0);
      out.push({ intent: { kind: 'ranged', what: KUNAI.name, target: f.id }, value: v, ...(plant ? { way: 'plant' as const } : {}) });
    }
    if (sealed) continue;
    for (const id of u.jutsus) {
      const j = JUTSU[id];
      if (!j || !offensive(j) || u.chakra < j.cost) continue;
      // A sword art needs a blade (engine.ts handsBlocker: palms and fists hold none).
      if (j.weapon === 'draw' && u.kind === 'ninja' && !u.weapon.held) continue;
      // A bonus-action jutsu needs the bonus action (planning the next turn, it will have it).
      if (j.cast === 'bonus' && !next && !u.turn.bonus) continue;
      if (d > j.range + u.speed + (f.bulk ?? 0)) continue;
      const hits = areaValue(s, u, j, f);
      if (hits <= 0) continue;
      const thrift = u.chakra >= j.cost * 2 ? 1 : 0.85;
      // A save made with disadvantage (Pursuing Flame) fails more often.
      const lands = j.save ? (j.saveAdv === 'disadvantage' ? 0.85 : 0.75) : 0.65;
      out.push({ intent: { kind: 'jutsu', what: id, target: f.id, at: { ...f.pos } }, value: avg(j.dice) * lands * hits * fx * thrift, single: hits < 2 });
    }
    // A Northstar takes a foe's mind (Command) or a beast's (Natural Submission): if the WIS save
    // fails, the foe neither strikes the Northstar's side nor holds back from its own: twice its harm.
    for (const [id, refused] of [[COMMAND, commandRefused], [SUBMISSION, submissionRefused]] as const) {
      const j = JUTSU[id];
      if (!u.jutsus.includes(id) || noJutsu(u) || u.chakra < j.cost || d > j.range + u.speed || refused(s, u, f)) continue;
      const fails = 1 - successChance(saveMod(f, 'wis'), u.saveDC, 'none', true);
      out.push({ intent: { kind: 'command', what: id, target: f.id }, value: fails * 2 * threat(f) * fx });
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
    if (homeTeam(u) === 'party' && !u.joined && f.down === 'downed' && dist(u.pos, f.pos) <= u.speed + 1.6) {
      const bandage = s.supplies.bandages > 0;
      out.push({ intent: { kind: 'heal', what: bandage ? 'bandage' : 'stabilize', target: f.id }, value: (bandage ? 9 : 6) * support });
    }
    // A Kōton shelters a hurt friend (or itself) behind a metal wall, from the foes shooting at it.
    const cover = wallCover(s, u, f);
    if (cover) out.push({ intent: { kind: 'jutsu', what: WALL, target: f.id, at: cover.at }, value: cover.worth });
  }
  // A Ryusei swaps places with whoever stands on one of its Nodes, when that clearly helps.
  if (u.jutsus.includes(SWAP)) {
    for (const o of Object.values(s.units)) {
      const v = o.id === u.id ? 0 : swapValue(s, u, o);
      if (v > 0) out.push({ intent: { kind: 'jutsu', what: SWAP, target: o.id, at: { ...o.pos } }, value: v });
    }
  }
  // Hurt and in reach of a foe: dodge.
  const threatened = foes.some((f) => dist(u.pos, f.pos) <= wielded(f).reach + 0.5);
  if (threatened && u.hp < u.maxHp * 0.3) out.push({ intent: { kind: 'defend', what: 'dodge' }, value: u.aiOrder === 'defensive' ? 9 : 4 });
  // The enemies show their clan's way (the owner, D21); allies on the AI just play the best move.
  if (u.team === 'enemy') clanWays(s, u, out);
  return out.sort((a, b) => b.value - a.value);
}

/**
 * Each clan fights its own way (docs/CLANS_DESIGN.md, D21), so the party sees it used against it:
 * an enemy's clan move takes the place of a jutsu that would reach just one foe, taking that
 * jutsu's worth (a jutsu that catches two foes or more still comes first).
 * - A Mirai opens with Pursuing Flame: its first jutsu of the fight, and every other one after it
 *   (its jutsu cast so far is even), is the flame at that foe, if the flame reaches it and the
 *   other jutsu is worth no more than two and a half flames (FLAME_FOR; a stronger one comes first).
 * - A Ryusei warps in beside that foe and strikes from behind, when a Node of its own lets it; and
 *   with no Node of its own yet, it opens by throwing a kunai at that foe, to leave one.
 * - A Northstar commands a foe whose WIS save fails at least half the time, in place of any attack
 *   or jutsu on one foe, while nobody is under its command.
 */
function clanWays(s: BattleState, u: Unit, out: Option[]): void {
  const single = (o: Option) => o.single || o.intent.kind === 'melee' || o.intent.kind === 'ranged';
  const bestOn = (id: string): number => Math.max(0, ...out.filter((o) => o.single && o.intent.target === id).map((o) => o.value));
  if (u.jutsus.includes(FLAME) && u.stats2.jutsuCast % 2 === 0) {
    // The flame's own worth on each foe it can reach (affordable, in reach this turn).
    const flameOn = new Map(out.filter((o) => o.intent.kind === 'jutsu' && o.intent.what === FLAME).map((o) => [o.intent.target!, o.value]));
    for (const o of out) {
      const mine = o.single && o.intent.what !== FLAME ? flameOn.get(o.intent.target!) : undefined;
      if (mine !== undefined && o.value <= mine * FLAME_FOR) o.intent = { kind: 'jutsu', what: FLAME, target: o.intent.target, at: { ...s.units[o.intent.target!].pos } };
    }
  }
  const opening = !ownNodes(s, u).length;
  for (const o of out) {
    if (o.way === 'warp' || (o.way === 'plant' && opening)) o.value = Math.max(o.value, bestOn(o.intent.target!) + 0.01);
  }
  if (u.jutsus.includes(COMMAND) && !Object.values(s.units).some((o) => o.commanded?.by === u.id)) {
    const best = Math.max(0, ...out.filter(single).map((o) => o.value));
    for (const o of out) {
      const t = o.intent.kind === 'command' && o.intent.what === COMMAND ? s.units[o.intent.target!] : undefined;
      if (t && 1 - successChance(saveMod(t, 'wis'), u.saveDC, 'none', true) >= 0.5) o.value = Math.max(o.value, best + o.value * 0.001);
    }
  }
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
      // Aimed at a foe right under the head, the roar would have no direction (the engine refuses it).
      if (dist(u.pos, f.pos) > roar.range || dist(u.pos, f.pos) < MIN_AIM) continue;
      const n = areaValue(s, u, roar, f);
      if (n >= 2 && (!best || n * 4 > best.value)) best = { intent: { kind: 'roar', what: 'hydra_roar', target: f.id, at: { ...f.pos } }, value: n * 4 };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.value - a.value);
}

/** The plan a unit means to carry out: on this turn, or (`next`) on its next one, with a fresh turn. */
export function planIntent(s: BattleState, u: Unit, next = false): Intent | undefined {
  if (u.kind === 'hydra_body') return { kind: 'defend', what: 'thrash' };
  const opts = u.kind === 'hydra_head' ? headOptions(s, u) : ninjaOptions(s, u, next);
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
      // A metal wall for cover and a Spatial Swap are made from where it stands, or not at all.
      if (i.what === WALL) return { at: u.pos, good: () => false, ready: !!wallCover(s, u, t) };
      if (i.what === SWAP) return { at: u.pos, good: () => false, ready: swapValue(s, u, t) > 0 };
      const reach = j.range + (t.bulk ?? 0) + (j.shape === 'single' && t.kind === 'hydra_head' ? 2.5 : 0);
      // A charge needs a clear straight run to its target.
      return goal((p) => dist(p, t.pos) <= reach && (j.melee ? !fullCoverBetween(s, p, t.pos) && (!j.charge || clearRun(s, p, t.pos)) : lineOfSight(s, p, t.pos)), t);
    }
    case 'heal':
      return goal((p) => dist(p, t.pos) <= 1.6, undefined);
    case 'command':
      return goal((p) => dist(p, t.pos) <= JUTSU[i.what].range && lineOfSight(s, p, t.pos), t);
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
  const i = planIntent(s, u, true);
  const g = i && u.speed > 0 ? goalOf(s, u, i) : null;
  // A Ryusei that will warp in beside its target: where it lands is where the Eye sees it go.
  const warp = i?.kind === 'melee' && g && !g.ready && canWarp(u, true) ? warpStrikeAt(s, u, s.units[i.target!]) : null;
  if (i && warp) i.to = warp;
  else if (i && g && !g.ready) {
    const taken = Object.values(s.units).flatMap((o) => (o.id !== u.id && o.team === u.team && !o.down && o.intent?.to ? [cellOf(o.intent.to)] : []));
    const c = stepToward(s, u, g, u.cond.prone ? u.speed / 2 : u.speed, (p) => !taken.some((t) => sameCell(t, cellOf(p))));
    if (c) i.to = cellCenter(c);
  }
  u.intent = i;
}

/**
 * A unit changed sides (Command, Natural Submission, or a Command running out): every enemy whose
 * plan was aimed at it plans again, so it doesn't strike its own side and the Eye shows the new plan.
 */
export function replanAgainst(s: BattleState, id: string, ev: BattleEvent[]): void {
  for (const e of Object.values(s.units)) {
    if (e.id === id || e.team !== 'enemy' || e.intent?.target !== id) continue;
    planEnemy(s, e);
    if (e.intent) ev.push({ t: 'intent', unit: e.id, intent: e.intent });
  }
}

/** The Eye of Tomorrow in the party: the Mirai who can read the enemies' next moves. */
export const miraiSeers = (s: BattleState): Unit[] => Object.values(s.units).filter((u) => u.team === 'party' && !u.down && u.character?.clan === 'Mirai');

/**
 * An enemy acting on its turn has begun to carry its plan out (it walked, or spent its action or
 * bonus action): the plan is spent, and the next one is made when its turn ends.
 */
export function planSpent(s: BattleState, u: Unit): boolean {
  if (s.phase !== 'combat' || s.order[s.turn] !== u.id) return false;
  return u.turn.moved > 0 || !u.turn.action || !u.turn.bonus;
}

/**
 * The enemies' plans a Mirai in the party sees with the Eye of Tomorrow (in range and in sight). An
 * enemy that has started to act on its turn shows none until it plans again (`planSpent`).
 */
export function foreseen(s: BattleState): Record<string, Intent> {
  const out: Record<string, Intent> = {};
  const seers = miraiSeers(s);
  if (!seers.length) return out;
  for (const e of Object.values(s.units)) {
    if (e.team !== 'enemy' || !e.intent || e.down || planSpent(s, e)) continue;
    if (seers.some((m) => dist(m.pos, e.pos) <= FORESIGHT_RANGE && lineOfSight(s, m.pos, e.pos))) out[e.id] = e.intent;
  }
  return out;
}
