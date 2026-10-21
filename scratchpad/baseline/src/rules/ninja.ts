// What a ninja carries through a mission: HP, chakra, Hit and Chakra Dice, Tension, Exhaustion and
// effects (docs/MISSION_DESIGN.md). Every function returns a new character plus the events.

import type { ClanType, ShinobiCharacter } from '../types/shinobi';
import { CLANS_DATA, DEFAULT_CHARACTER } from '../data/shinobiData';
import type { BreakdownKind, ConvictionValue, EffectId, RuleEvent, SkillId } from '../types/mission';
import { savingThrow, SKILL_ABILITY } from './checks';
import { effectiveMaxHp } from './derived';
import { addEffect, EFFECTS, endMission, hasEffect, removeEffect, sanitizeEffects } from './effects';
import { checkRng, Dice, pick } from './rng';

export type Step = { character: ShinobiCharacter; events: RuleEvent[] };

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const tensionOf = (c: ShinobiCharacter): number => c.tension ?? 0;
export const exhaustionOf = (c: ShinobiCharacter): number => c.exhaustion ?? 0;
export const hitDiceLeft = (c: ShinobiCharacter): number => Math.max(0, c.level - (c.hitDiceSpent ?? 0));
export const chakraDiceLeft = (c: ShinobiCharacter): number => Math.max(0, c.level - (c.chakraDiceSpent ?? 0));

/** Unconscious from Exhaustion level 6: can't act until back at level 5. */
export const isUnconscious = (c: ShinobiCharacter): boolean => exhaustionOf(c) >= 6;

export function changeHp(c: ShinobiCharacter, delta: number, reason: string): Step {
  const hp = clamp(c.currentHp + delta, 0, effectiveMaxHp(c));
  const real = hp - c.currentHp;
  return { character: { ...c, currentHp: hp }, events: real ? [{ type: 'hp', who: c.id, delta: real, hp, reason }] : [] };
}

export function changeChakra(c: ShinobiCharacter, delta: number, reason: string): Step {
  const chakra = clamp(c.currentChakra + delta, 0, c.maxChakra);
  const real = chakra - c.currentChakra;
  return { character: { ...c, currentChakra: chakra }, events: real ? [{ type: 'chakra', who: c.id, delta: real, chakra, reason }] : [] };
}

/** Adds an effect (the same one refreshes instead of stacking). `campNo` dates until-camp effects. */
export function giveEffect(c: ShinobiCharacter, id: EffectId, reason: string, opts: { campNo?: number; detail?: string } = {}): Step {
  const r = addEffect(c.effects, id, { ...opts, source: reason });
  return { character: { ...c, effects: r.effects }, events: [{ type: 'effect', who: c.id, effect: id, change: r.change, reason }] };
}

export function takeEffect(c: ShinobiCharacter, id: EffectId, reason: string): Step {
  if (!hasEffect(c.effects, id)) return { character: c, events: [] };
  return { character: { ...c, effects: removeEffect(c.effects, id) }, events: [{ type: 'effect', who: c.id, effect: id, change: 'removed', reason }] };
}

/**
 * Exhaustion up or down. `cap` limits how high this source can push it (Tension never pushes it
 * past 5). Level 6 knocks the ninja unconscious.
 */
export function changeExhaustion(c: ShinobiCharacter, delta: number, reason: string, cap = 6): Step {
  const now = exhaustionOf(c);
  const target = delta > 0 ? (now >= cap ? now : Math.min(now + delta, cap)) : Math.max(0, now + delta);
  if (target === now) return { character: c, events: [] };
  const events: RuleEvent[] = [{ type: 'exhaustion', who: c.id, delta: target - now, exhaustion: target, reason }];
  if (target >= 6) events.push({ type: 'unconscious', who: c.id });
  return { character: { ...c, exhaustion: target }, events };
}

const BREAKDOWNS: BreakdownKind[] = ['panic', 'paranoia', 'blind_rage', 'despair'];

/**
 * Tension up or down. Encouraged takes 1 off the next gain. At 10 the ninja makes a WIS save
 * (DC 12, advantage with the shrine's blessing): Breakdown on a failure, Awakening on a success,
 * and Tension goes back to 5. Already broken or awakened: +1 Exhaustion instead (never past 5).
 */
export function changeTension(c: ShinobiCharacter, delta: number, reason: string, dice: Dice, campNo = 0): Step {
  let ch = c;
  const events: RuleEvent[] = [];
  let d = delta;
  if (d > 0 && hasEffect(ch.effects, 'encouraged')) {
    d -= 1;
    ch = { ...ch, effects: removeEffect(ch.effects, 'encouraged') };
    events.push({ type: 'effect', who: c.id, effect: 'encouraged', change: 'removed', reason: 'used against Tension' });
  }
  const now = tensionOf(ch);
  const next = clamp(now + d, 0, 10);
  if (next !== now) events.push({ type: 'tension', who: c.id, delta: next - now, tension: next, reason });
  ch = { ...ch, tension: next };
  if (next < 10) return { character: ch, events };

  if (hasEffect(ch.effects, 'breakdown') || hasEffect(ch.effects, 'will_of_fire')) {
    const ex = changeExhaustion(ch, 1, 'Tension reached 10 again', 5);
    ch = { ...ex.character, tension: 5 };
    events.push(...ex.events, { type: 'tension', who: c.id, delta: -5, tension: 5, reason: 'back to 5' });
    return { character: ch, events };
  }

  const outcome = savingThrow(checkRng(dice), ch, 'wis', 12, { tensionSave: true });
  events.push({ type: 'check', who: c.id, what: 'WIS save at 10 Tension', outcome });
  if (hasEffect(ch.effects, 'shrine_blessing')) ch = { ...ch, effects: removeEffect(ch.effects, 'shrine_blessing') };
  if (outcome.success) {
    const r = giveEffect(ch, 'will_of_fire', 'Awakening', { campNo });
    ch = r.character;
    events.push({ type: 'awakening', who: c.id }, ...r.events);
  } else {
    const kind = pick(dice.rng, BREAKDOWNS);
    const r = giveEffect(ch, 'breakdown', 'Breakdown', { campNo, detail: kind });
    ch = r.character;
    events.push({ type: 'breakdown', who: c.id, kind }, ...r.events);
  }
  ch = { ...ch, tension: 5 };
  events.push({ type: 'tension', who: c.id, delta: -5, tension: 5, reason: 'back to 5' });
  return { character: ch, events };
}

/** Trait left at the village by a Breakdown or an Awakening (small, good or bad). */
export const TRAITS: Record<string, { name: string; nameEs: string; good: boolean }> = {
  trait_panic: { name: 'Jumpy', nameEs: 'Asustadizo', good: false },
  trait_paranoia: { name: 'Distrustful', nameEs: 'Desconfiado', good: false },
  trait_blind_rage: { name: 'Short fuse', nameEs: 'Mecha corta', good: false },
  trait_despair: { name: 'Gloomy', nameEs: 'Sombrío', good: false },
  trait_will_of_fire: { name: 'Steady heart', nameEs: 'Corazón firme', good: true },
};

/**
 * Back at the village: everything comes back. Scars stay, and each Breakdown or Awakening leaves
 * one small trait.
 */
export function returnToVillage(c: ShinobiCharacter): Step {
  const events: RuleEvent[] = [];
  const traits = [...(c.traits ?? [])];
  for (const e of c.effects ?? []) {
    if (e.id === 'breakdown' && e.detail) traits.push(`trait_${e.detail}`);
    if (e.id === 'will_of_fire') traits.push('trait_will_of_fire');
  }
  const kept = endMission(c.effects);
  for (const id of kept.expired) events.push({ type: 'effect', who: c.id, effect: id, change: 'expired', reason: 'back at the village' });
  const fresh: ShinobiCharacter = {
    ...c,
    effects: kept.effects,
    traits,
    hitDiceSpent: 0,
    chakraDiceSpent: 0,
    tension: 0,
    exhaustion: 0,
    pillsSinceCamp: 0,
  };
  fresh.currentHp = effectiveMaxHp(fresh);
  fresh.currentChakra = fresh.maxChakra;
  return { character: fresh, events };
}

const CONVICTIONS: ConvictionValue[] = ['protect_innocents', 'village_loyalty', 'complete_mission', 'clan_honour', 'protect_comrades', 'seek_truth'];

/**
 * Mission fields from an imported or older sheet, clamped to sane values. Unknown effects,
 * skills or convictions are dropped.
 */
export function sanitizeMissionFields(c: ShinobiCharacter): ShinobiCharacter {
  const num = (v: unknown, lo: number, hi: number): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), lo, hi) : undefined;
  const strings = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined);
  const out: ShinobiCharacter = { ...c };
  out.hitDiceSpent = num(c.hitDiceSpent, 0, c.level);
  out.chakraDiceSpent = num(c.chakraDiceSpent, 0, c.level);
  out.tension = num(c.tension, 0, 10);
  out.exhaustion = num(c.exhaustion, 0, 6);
  out.pillsSinceCamp = num(c.pillsSinceCamp, 0, 99);
  out.effects = c.effects === undefined ? undefined : sanitizeEffects(c.effects);
  out.scars = strings(c.scars);
  out.traits = strings(c.traits)?.filter((t) => t in TRAITS);
  out.conviction = strings(c.conviction)?.filter((v): v is ConvictionValue => CONVICTIONS.includes(v as ConvictionValue)).slice(0, 2);
  out.skillProficiencies = strings(c.skillProficiencies)?.filter((s): s is SkillId => s in SKILL_ABILITY);
  for (const k of Object.keys(out) as (keyof ShinobiCharacter)[]) if (out[k] === undefined) delete out[k];
  return out;
}

/** Old clan names (two renames deep) and the clans that replaced them. */
const OLD_CLANS: Record<string, ClanType> = { Uddo: 'Ryusei', Akkai: 'Koton', Taki: 'Northstar', Senju: 'Ryusei', Uzumaki: 'Koton', Hyuga: 'Northstar', Uchiha: 'Mirai' };

/**
 * The clan a saved or imported sheet names, as one of today's clans: old names load as the clan
 * that replaced them, and accents don't matter ('Kōton' is Koton). Null when it isn't a clan.
 */
export function migrateClan(raw: unknown): ClanType | null {
  if (typeof raw !== 'string') return null;
  const plain = raw.normalize('NFD').replace(/\p{M}/gu, '');
  if (plain in CLANS_DATA) return plain as ClanType;
  return OLD_CLANS[plain] ?? null;
}

/** A sheet from an older save with its clan converted; HP, chakra, look and jutsu stay as they are. */
export function migrateCharacter(c: ShinobiCharacter): ShinobiCharacter {
  const clan = migrateClan(c.clan) ?? DEFAULT_CHARACTER.clan;
  return clan === c.clan ? c : { ...c, clan };
}

/** Spanish name of an effect for the screens. */
export const effectNameEs = (id: EffectId): string => EFFECTS[id]?.nameEs ?? id;
