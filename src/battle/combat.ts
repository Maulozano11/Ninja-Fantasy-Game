// Rolls and damage: hit chances known before rolling (cover, elevation, advantage), saving throws,
// damage with criticals and resistances, falling to 0 HP, death saves, healing. All dice come
// from the battle seed plus a counter, so a battle replays exactly.

import { abilityMod, Advantage, combineAdvantage, rollCheck } from '../rules/checks';
import type { Ability } from '../rules/checks';
import { maxCritDamage, parseDice } from '../rules/dice';
import { effectMods, hasEffect } from '../rules/effects';
import { Rng, rngFor, rollDie } from '../rules/rng';
import { SHINOBI_CLASSES } from '../data/shinobiData';
import type { BattleEvent, BattleState, DamageType, Pt, RollInfo, Unit } from './types';
import { homeTeam } from './types';
import { coverBetween, dist, fullCoverBetween, hideSpotAt, levelAtPt, lineOfSight, steamAt } from './map';
import { KUNAI, KUNAI_LONG, wielded } from './units';
import { forcesOut, LIQUID_BODY, puddleDamage, puddleKnownBy, puddleSaveDc, riseFrom } from './puddle';

/** The next dice stream of the battle. */
export function nextRng(s: BattleState): Rng {
  return rngFor(s.seed, 'roll', s.rolls++);
}

/**
 * Rolls damage dice. A critical (a natural 20 on an attack, or a natural 1 on a save against it)
 * does maximum damage by the owner's rule: every die at its highest face, the critical's doubled
 * dice too, the bonus once (2d6+3 → 27). It still takes its place in the dice stream, so every
 * later roll of the battle is the same as before.
 */
export function rollDiceExpr(s: BattleState, expr: string, crit = false): number {
  const d = parseDice(expr);
  if (!d) return 0;
  const rng = nextRng(s);
  if (crit) return maxCritDamage(d);
  let total = d.bonus;
  for (let i = 0; i < d.count; i++) total += rollDie(rng, d.sides);
  return Math.max(0, total);
}

export const standing = (u: Unit): boolean => !u.down;

/** The Stealth total of a perfect hide (a natural 20): no passive Perception reaches it. */
export const PERFECT_HIDE = 99;
export const unitLevel = (s: BattleState, u: Unit): number => levelAtPt(s, u.pos) + (u.kind === 'hydra_head' ? 1.5 : 0);

const SKILL_ABILITY: Record<string, Ability> = {
  athletics: 'str',
  acrobatics: 'dex',
  stealth: 'dex',
  perception: 'wis',
  medicine: 'wis',
  survival: 'wis',
  insight: 'wis',
};

/** A unit's skill modifier: ability + proficiency, minus Exhaustion, plus effects. */
export function skillMod(u: Unit, skill: string): number {
  const ab = SKILL_ABILITY[skill] ?? 'dex';
  const m = effectMods(u.effects);
  const exh = 2 * (u.character?.exhaustion ?? 0);
  return abilityMod(u.stats[ab]) + (u.skills.includes(skill) ? u.prof : 0) - exh + m.allRolls + (ab === 'dex' ? m.dexRolls : 0);
}

export const passivePerception = (u: Unit): number => 10 + skillMod(u, 'perception');

/** A hidden unit gives itself away (an attack, a loud jutsu). */
export function reveal(u: Unit, ev: BattleEvent[]): void {
  if (u.cond.hidden === undefined) return;
  u.cond.hidden = undefined;
  ev.push({ t: 'condition', unit: u.id, cond: 'hidden', on: false });
}

/** Moved out of a hiding place (on foot or by a teleport): a hidden unit is seen. */
export function revealOutOfHiding(s: BattleState, u: Unit, ev: BattleEvent[]): void {
  // A puddle (Liquid Body) is its own hiding place.
  if (!u.down && !u.cond.puddle && hideSpotAt(s, u.pos) < 0) reveal(u, ev);
}

export function saveMod(u: Unit, ab: Ability): number {
  const m = effectMods(u.effects);
  const cls = u.character ? SHINOBI_CLASSES[u.character.shinobiClass] : undefined;
  const prof = cls?.savingProficiencies.includes(ab.toUpperCase()) ? u.prof : u.kind !== 'ninja' ? u.prof : 0;
  const exh = 2 * (u.character?.exhaustion ?? 0);
  return abilityMod(u.stats[ab]) + prof - exh + m.allRolls + m.saves + (ab === 'dex' ? m.dexRolls : 0);
}

function rollInfo(kind: RollInfo['kind'], o: ReturnType<typeof rollCheck>, adv: Advantage): RollInfo {
  const info: RollInfo = { kind, d20: o.d20, rolls: o.rolls, mod: o.modifier, total: o.total, dc: o.dc, success: o.success, chance: o.chance, crit: o.natural20, fumble: o.natural1 };
  // Two dice were rolled: the screen shows both, and which one was kept.
  return adv !== 'none' && o.rolls.length > 1 ? { ...info, adv } : info;
}

/**
 * One d20 roll. Attacks, saves and checks follow the owner's rule (a natural 20 always succeeds, a
 * natural 1 always fails); death saves and initiative count only their total.
 */
export function check(s: BattleState, kind: RollInfo['kind'], mod: number, dc: number, adv: Advantage = 'none', attack = false): RollInfo {
  const natural = attack || kind === 'save' || kind === 'check';
  return rollInfo(kind, rollCheck(nextRng(s), mod, dc, adv, natural), adv);
}

export function savingThrow(s: BattleState, u: Unit, ab: Ability, dc: number, extra: Advantage = 'none'): RollInfo {
  const m = effectMods(u.effects);
  const adv = combineAdvantage(extra, ab === 'con' && m.disadvConSaves ? 'disadvantage' : 'none', ab === 'wis' && m.disadvWisSaves ? 'disadvantage' : 'none');
  return check(s, 'save', saveMod(u, ab), dc, adv);
}

// --- attacks -------------------------------------------------------------------------------

export type AttackKind = 'melee' | 'ranged' | 'jutsu';

export interface AttackPreview {
  mod: number;
  ac: number;
  cover: 0 | 2 | 5;
  /** +2 from higher ground, −2 from lower ground. */
  height: number;
  adv: Advantage;
  chance: number;
  /** Why there is advantage or disadvantage (keys for the screen). */
  reasons: string[];
  inRange: boolean;
  /**
   * Why the attack can't be made at all, as the engine refuses it: a kunai with no line of sight
   * ('noSight'), a blow across a Kōton metal wall ('blocked': full cover, nothing passes).
   */
  blocked?: 'noSight' | 'blocked';
}

function flanked(s: BattleState, attacker: Unit, target: Unit): boolean {
  for (const ally of Object.values(s.units)) {
    if (ally.id === attacker.id || ally.team !== attacker.team || !standing(ally)) continue;
    if (dist(ally.pos, target.pos) > wielded(ally).reach + 0.1) continue;
    // An ally behind a metal wall can't strike the target.
    if (fullCoverBetween(s, ally.pos, target.pos)) continue;
    const a1 = Math.atan2(attacker.pos.z - target.pos.z, attacker.pos.x - target.pos.x);
    const a2 = Math.atan2(ally.pos.z - target.pos.z, ally.pos.x - target.pos.x);
    let d = Math.abs(a1 - a2);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > (2 * Math.PI) / 3) return true;
  }
  return false;
}

/** How far a Northstar's Aura of Sovereignty reaches (3 squares). */
export const AURA_RADIUS = 4.5;

/** A Northstar ninja still standing: its Aura of Sovereignty is up. */
export const sovereign = (u: Unit): boolean => u.kind === 'ninja' && !u.down && u.character?.clan === 'Northstar';

/** The Northstar of another side whose aura a unit stands in (its attack rolls have disadvantage). */
export function hostileAura(s: BattleState, a: Unit): Unit | undefined {
  return Object.values(s.units).find((n) => n.team !== a.team && sovereign(n) && dist(n.pos, a.pos) <= AURA_RADIUS + 0.05);
}

function hostileWithin(s: BattleState, u: Unit, r: number): boolean {
  return Object.values(s.units).some((o) => o.team !== u.team && standing(o) && o.kind !== 'hydra_body' && dist(o.pos, u.pos) <= r + 0.05);
}

/**
 * Everything about an attack before rolling: the % shown on the screen. `opts.melee`: a jutsu
 * struck in person (a sword art, a tackle) rolls with the caster's jutsu attack but is a blow like
 * any other: no cover, no penalty for a foe close by, advantage on a prone target, flanking.
 */
export function attackPreview(s: BattleState, a: Unit, t: Unit, kind: AttackKind, opts: { jutsuRange?: number; melee?: boolean } = {}): AttackPreview {
  const close = kind === 'melee' || !!opts.melee;
  const am = effectMods(a.effects);
  const tm = effectMods(t.effects);
  const d = dist(a.pos, t.pos);
  const reasons: string[] = [];
  const advs: Advantage[] = [];
  let mod: number;
  let inRange: boolean;
  if (kind === 'jutsu') {
    mod = a.jutsuAttack + am.allRolls - 2 * (a.character?.exhaustion ?? 0);
    inRange = d <= (opts.jutsuRange ?? 9) + 0.1;
  } else {
    const w = kind === 'ranged' ? KUNAI : wielded(a);
    const ab = kind === 'ranged' ? abilityMod(a.stats.dex) : w.finesse ? Math.max(abilityMod(a.stats.str), abilityMod(a.stats.dex)) : abilityMod(a.stats.str);
    mod = a.prof + ab + am.allRolls - 2 * (a.character?.exhaustion ?? 0) + (kind === 'ranged' ? am.dexRolls : 0);
    inRange = kind === 'ranged' ? d <= KUNAI_LONG + 0.1 : d <= w.reach + 0.1 + (t.kind === 'hydra_head' ? 2.5 : 0) + (t.bulk ?? 0);
    if (kind === 'ranged' && d > KUNAI.reach + 0.1) {
      advs.push('disadvantage');
      reasons.push('longRange');
    }
  }
  const cover = close ? 0 : coverBetween(s, a.pos, t.pos, [a.id, t.id]);
  const dl = unitLevel(s, a) - unitLevel(s, t);
  const height = dl >= 0.9 ? 2 : dl <= -0.9 ? -2 : 0;
  if (a.cond.hidden !== undefined) {
    advs.push('advantage');
    reasons.push('hidden');
  }
  // A Ryusei that warped in next to its foe strikes from behind.
  if (a.cond.warpEdge) {
    advs.push('advantage');
    reasons.push('behind');
  }
  if (t.cond.prone) {
    advs.push(close ? 'advantage' : 'disadvantage');
    reasons.push('prone');
  }
  if (t.cond.dodging) {
    advs.push('disadvantage');
    reasons.push('dodging');
  }
  if (t.cond.focusing) {
    advs.push('advantage');
    reasons.push('focusing');
  }
  if (t.down === 'downed') {
    advs.push('advantage');
    reasons.push('downed');
  }
  if (a.cond.prone) {
    advs.push('disadvantage');
    reasons.push('attackerProne');
  }
  if (am.disadvAttacks) {
    advs.push('disadvantage');
    reasons.push('poisoned');
  }
  if (am.advAttacks) {
    advs.push('advantage');
    reasons.push('rage');
  }
  if (close && flanked(s, a, t)) {
    advs.push('advantage');
    reasons.push('flanking');
  }
  if (!close && hostileWithin(s, a, 1.5)) {
    advs.push('disadvantage');
    reasons.push('closeEnemy');
  }
  // A blow into steam from outside it: the target can't be seen (the steam blinds the attacker inside
  // it too, but neither then sees the other, which evens out).
  if (steamAt(s, t.pos) && !steamAt(s, a.pos)) {
    advs.push('disadvantage');
    reasons.push('obscured');
  }
  if (t.cond.hidden !== undefined && passivePerception(a) < t.cond.hidden && !puddleKnownBy(t, a)) {
    advs.push('disadvantage');
    reasons.push('targetHidden');
  }
  // Inside a foe's Aura of Sovereignty: plain disadvantage (two auras are no worse than one).
  if (hostileAura(s, a)) {
    advs.push('disadvantage');
    reasons.push('aura');
  }
  const adv = combineAdvantage(...advs);
  const ac = t.ac + tm.ac + cover;
  const total = mod + height;
  const out: AttackPreview = { mod: total, ac, cover, height, adv, chance: hitChance(total, ac, adv), reasons, inRange };
  // The engine's refusals: a kunai needs the line of sight, a blow can't cross a metal wall.
  const blocked = kind === 'ranged' ? (lineOfSight(s, a.pos, t.pos) ? undefined : 'noSight') : kind === 'melee' && fullCoverBetween(s, a.pos, t.pos) ? 'blocked' : undefined;
  return blocked ? { ...out, blocked } : out;
}

/** The chance an attack roll hits: it hits on a natural 20 and misses on a natural 1. */
export function hitChance(mod: number, ac: number, adv: Advantage): number {
  let faces = 0;
  for (let f = 1; f <= 20; f++) if (f === 20 || (f !== 1 && f + mod >= ac)) faces++;
  const p = faces / 20;
  return adv === 'advantage' ? 1 - (1 - p) ** 2 : adv === 'disadvantage' ? p * p : p;
}

export function rollAttack(s: BattleState, pv: AttackPreview): RollInfo {
  return check(s, 'attack', pv.mod, pv.ac, pv.adv, true);
}

// --- damage --------------------------------------------------------------------------------

const RESIST: Partial<Record<string, DamageType>> = { Fire: 'Fire', Water: 'Cold', Lightning: 'Lightning', Earth: 'Bludgeoning', Wind: 'Slashing' };

/** Damage after resistances (Warding seal, the Taijutsu Master's iron body) and the weather. */
export function adjustDamage(s: BattleState, t: Unit, amount: number, type: DamageType): number {
  let dmg = amount;
  const seal = t.effects.find((e) => e.id === 'warding_seal');
  if (seal && RESIST[seal.detail ?? 'Fire'] === type) dmg = Math.floor(dmg / 2);
  if (t.character?.shinobiClass === 'Taijutsu Master' && type === 'Bludgeoning') dmg = Math.floor(dmg / 2);
  if (s.weather === 'Downpour') {
    if (type === 'Fire') dmg = Math.floor(dmg * 0.75);
    if (type === 'Lightning' || type === 'Cold') dmg = Math.floor(dmg * 1.25);
  }
  if (s.weather === 'Scorching Drought' && type === 'Fire') dmg = Math.floor(dmg * 1.25);
  return Math.max(0, dmg);
}

export interface DamageOpts {
  crit?: boolean;
  source?: string;
  /** A melee attack that may knock the target out instead of killing it. */
  knockout?: boolean;
  melee?: boolean;
  /** An explosion (tag, barrel): it seals a hydra stump like fire and lightning. */
  explosion?: boolean;
  /** A weapon's blow (a blade, a kunai, a fist): a Liquid Body puddle takes half of it. */
  weapon?: boolean;
  /** A wind attack: it scatters a Liquid Body puddle. */
  wind?: boolean;
}

/** A severed hydra head misses this many of its turns, then grows back unless its stump is sealed. */
export const HEAD_REGROW = 2;

/**
 * Applies damage to a unit: temporary HP first, then HP. Party members drop and make death saves
 * (in Legend massive damage kills), enemies die or are knocked out, hydra heads are severed.
 */
export function damage(s: BattleState, t: Unit, raw: number, type: DamageType, o: DamageOpts, ev: BattleEvent[]): void {
  if (t.down === 'dead' || t.down === 'fled') return;
  if (t.head?.severed) {
    // A cut stump is sealed by fire, lightning or an explosion; otherwise the head grows back.
    const how = o.explosion ? 'explosion' : type === 'Fire' ? 'fire' : type === 'Lightning' ? 'lightning' : undefined;
    if (how && !t.head.sealed) {
      t.head.sealed = true;
      ev.push({ t: 'seal', unit: t.id, how, source: o.source });
    }
    return;
  }
  const attacker = o.source ? s.units[o.source] : undefined;
  // A Liquid Body puddle: weapons and fire do half, lightning double (battle/puddle.ts).
  const puddle = !!t.cond.puddle;
  let amount = adjustDamage(s, t, puddle ? puddleDamage(raw, type, !!o.weapon) : raw, type);
  // By the side it belongs to: a commanded enemy is still an enemy.
  if (attacker && homeTeam(attacker) === 'enemy') amount = Math.round(amount * attacker.power);
  if (o.crit) {
    if (homeTeam(t) === 'party') t.stats2.critsTaken++;
    if (attacker && homeTeam(attacker) === 'party') attacker.stats2.critsLanded++;
  }
  if (t.down === 'downed' || t.down === 'stable') {
    // Hitting a fallen ninja: a failed death save (two on a critical).
    if (amount > 0) deathSaveFailure(s, t, o.crit ? 2 : 1, ev);
    return;
  }
  if (t.tempHp > 0) {
    const absorbed = Math.min(t.tempHp, amount);
    t.tempHp -= absorbed;
    amount -= absorbed;
  }
  const before = t.hp;
  t.hp = Math.max(0, t.hp - amount);
  ev.push({ t: 'damage', unit: t.id, amount, dmgType: type, hp: t.hp, crit: o.crit, source: o.source });
  if (t.hp > 0) {
    // Lightning, fire and wind force a puddle out; any other hit asks for a CON save (5e concentration).
    if (puddle && t.cond.puddle) {
      let out = forcesOut(type, !!o.wind);
      if (!out && amount > 0) {
        const roll = savingThrow(s, t, 'con', puddleSaveDc(amount));
        ev.push({ t: 'save', unit: t.id, what: LIQUID_BODY, roll, ab: 'con' });
        out = !roll.success;
      }
      if (out) riseFrom(t, 'forced', ev);
    }
    return;
  }
  const overflow = amount - before;
  if (t.kind === 'hydra_head' && t.head) {
    t.head.severed = true;
    t.head.regrowIn = HEAD_REGROW;
    ev.push({ t: 'sever', unit: t.id });
    // The hydra dies when every head is down at once.
    const body = s.units[t.head.body];
    const heads = Object.values(s.units).filter((h) => h.head?.body === t.head!.body);
    if (body && !body.down && heads.every((h) => h.head!.severed)) killHydra(s, body, ev);
    return;
  }
  if (t.kind === 'hydra_body') {
    killHydra(s, t, ev);
    return;
  }
  // A commanded unit that drops goes back to its own side (and falls as one of them). A beast that
  // joined isn't a party member: it falls like a foe would, with no death saves.
  releaseCommand(t, ev);
  if (t.team === 'party' && !t.joined) {
    t.stats2.fell = true;
    if (o.crit) t.stats2.fellToCrit = true;
    if (s.difficulty === 'legend' && overflow >= t.maxHp) {
      t.down = 'dead';
      ev.push({ t: 'down', unit: t.id, state: 'dead' });
      return;
    }
    t.down = 'downed';
    t.deathSaves = { ok: 0, bad: 0 };
    t.cond = { prone: true };
    ev.push({ t: 'down', unit: t.id, state: 'downed' });
    return;
  }
  t.down = o.knockout && o.melee ? 'ko' : 'dead';
  t.cond = {};
  ev.push({ t: 'down', unit: t.id, state: t.down });
}

/** A commanded unit goes back to the side it left: its turns under command ran out, or it dropped. */
export function releaseCommand(u: Unit, ev: BattleEvent[]): void {
  if (!u.commanded) return;
  u.team = u.commanded.team;
  ev.push({ t: 'command', unit: u.id, by: u.commanded.by, on: false });
  u.commanded = undefined;
}

/** The hydra's body falls: every head falls with it. */
function killHydra(s: BattleState, body: Unit, ev: BattleEvent[]): void {
  body.hp = 0;
  body.down = 'dead';
  body.cond = {};
  ev.push({ t: 'down', unit: body.id, state: 'dead' });
  for (const h of Object.values(s.units)) {
    if (h.head?.body !== body.id || h.down) continue;
    h.down = 'dead';
    ev.push({ t: 'down', unit: h.id, state: 'dead' });
  }
}

function deathSaveFailure(s: BattleState, t: Unit, n: number, ev: BattleEvent[]): void {
  t.deathSaves.bad += n;
  if (t.deathSaves.bad >= 3) finishDying(s, t, ev);
}

function finishDying(s: BattleState, t: Unit, ev: BattleEvent[]): void {
  // Only Legend has permanent death; in Story and Normal the ninja stays out until the end.
  t.down = s.difficulty === 'legend' ? 'dead' : 'stable';
  ev.push({ t: 'down', unit: t.id, state: t.down });
}

/** A downed ninja's death save at the start of its turn. Fall aftermath gives disadvantage. */
export function deathSave(s: BattleState, t: Unit, ev: BattleEvent[]): void {
  const adv: Advantage = hasEffect(t.effects, 'fall_aftermath') ? 'disadvantage' : 'none';
  const roll = check(s, 'death', 0, 10, adv);
  if (roll.d20 === 20) {
    t.down = undefined;
    t.hp = 1;
    t.deathSaves = { ok: 0, bad: 0 };
    ev.push({ t: 'deathSave', unit: t.id, roll, ok: 0, bad: 0 });
    ev.push({ t: 'heal', unit: t.id, amount: 1, hp: 1, source: 'death save' });
    return;
  }
  if (roll.d20 === 1) t.deathSaves.bad += 2;
  else if (roll.success) t.deathSaves.ok += 1;
  else t.deathSaves.bad += 1;
  ev.push({ t: 'deathSave', unit: t.id, roll, ok: t.deathSaves.ok, bad: t.deathSaves.bad });
  if (t.deathSaves.bad >= 3) finishDying(s, t, ev);
  else if (t.deathSaves.ok >= 3) {
    t.down = 'stable';
    ev.push({ t: 'down', unit: t.id, state: 'stable' });
  }
}

/** Healing: a fallen ninja gets back up (prone) with the healed HP. */
export function heal(t: Unit, amount: number, source: string, ev: BattleEvent[]): void {
  if (t.down === 'dead' || t.down === 'fled' || t.down === 'ko' || amount <= 0) return;
  const maxHp = t.maxHp;
  if (t.down === 'downed' || t.down === 'stable') {
    t.down = undefined;
    t.hp = 0;
    t.deathSaves = { ok: 0, bad: 0 };
    t.cond.prone = true;
  }
  const hp = Math.min(maxHp, t.hp + amount);
  const got = hp - t.hp;
  t.hp = hp;
  ev.push({ t: 'heal', unit: t.id, amount: got, hp, source });
}

export const midpoint = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
