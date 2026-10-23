// What a ninja carries through a mission: HP, chakra, Hit and Chakra Dice, Tension, Exhaustion and
// effects (docs/MISSION_DESIGN.md). Every function returns a new character plus the events.

import type { ChakraNature, ClanType, ShinobiCharacter } from '../types/shinobi';
import { CLANS_DATA, DEFAULT_CHARACTER, LEGENDARY_PRESETS, SHINOBI_CLASSES } from '../data/shinobiData';
import { chakraNature } from '../sprite/chakraNature';
import { getAppearance, migrateAppearance } from '../sprite/legacy';
import type { ChakraColorId } from '../sprite/types';
import type { BreakdownKind, ConvictionValue, EffectId, RuleEvent, SkillId } from '../types/mission';
import { savingThrow, SKILL_ABILITY } from './checks';
import { deriveStats, effectiveMaxHp, SHEET_VERSION } from './derived';
import type { BuildInput } from './derived';
import { addEffect, EFFECTS, endMission, hasEffect, removeEffect, sanitizeEffects } from './effects';
import { offNatureJutsus, ultimateToElement } from './jutsuNature';
import { GROWTH_LEVEL } from './natureGrowth';
import { tagJutsuToItem } from './pouch';
import { checkRng, Dice, pick } from './rng';

export type Step = { character: ShinobiCharacter; events: RuleEvent[] };

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export const tensionOf = (c: ShinobiCharacter): number => c.tension ?? 0;
export const exhaustionOf = (c: ShinobiCharacter): number => c.exhaustion ?? 0;
export const hitDiceLeft = (c: ShinobiCharacter): number => Math.max(0, c.level - (c.hitDiceSpent ?? 0));
export const chakraDiceLeft = (c: ShinobiCharacter): number => Math.max(0, c.level - (c.chakraDiceSpent ?? 0));

/**
 * The ninja's elemental nature: its chakra type, picked in the creator's Chakra section. It is read
 * from the look's burst and nowhere else; the colour the chakra shows never changes it (the owner,
 * 2026-10-21). A sheet without a look reads its old aura colour as the burst it always had.
 */
export const natureOf = (c: ShinobiCharacter): ChakraNature => chakraNature(getAppearance(c).chakra);

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
  // Back at the village: Triple Nature's discount is ready again.
  delete fresh.tripleNatureSpent;
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
  out.tripleNatureSpent = c.tripleNatureSpent === true ? true : undefined;
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
 * that replaced them, and accents don't matter ('Kōton' is Koton). Null when it isn't a clan (nor
 * a name every object has, like 'constructor').
 */
export function migrateClan(raw: unknown): ClanType | null {
  if (typeof raw !== 'string') return null;
  const plain = raw.normalize('NFD').replace(/\p{M}/gu, '');
  if (Object.hasOwn(CLANS_DATA, plain)) return plain as ClanType;
  return Object.hasOwn(OLD_CLANS, plain) ? OLD_CLANS[plain] : null;
}

/** Old clans whose bonus the old formula built into a sheet's maxima: Uddo's +6 HP, Akkai's +25 % chakra. */
const OLD_BONUS_CLANS = ['Uddo', 'Senju', 'Akkai', 'Uzumaki'];

const buildOf = (c: ShinobiCharacter): BuildInput => ({ level: c.level, stats: c.stats, clan: c.clan, shinobiClass: c.shinobiClass, armor: c.armorStyle, feats: c.selectedFeats ?? [] });

/** The numbers a sheet stores that a build derives (speed doesn't depend on the scores). */
const DERIVED_KEYS = ['maxHp', 'maxChakra', 'armorClass', 'jutsuSaveDC', 'jutsuAttackBonus'] as const;

/**
 * New maxima for a sheet: a ninja that was at full stays at full; otherwise it keeps what it had
 * left, never above the new maxima.
 */
function refit(was: ShinobiCharacter, now: ShinobiCharacter): ShinobiCharacter {
  const hpFull = was.currentHp >= effectiveMaxHp(was);
  const chakraFull = was.currentChakra >= was.maxChakra;
  const maxHp = effectiveMaxHp(now);
  return {
    ...now,
    currentHp: hpFull ? maxHp : Math.min(was.currentHp, maxHp),
    currentChakra: chakraFull ? now.maxChakra : Math.min(was.currentChakra, now.maxChakra),
  };
}

/**
 * Counts the clan's ability bonus in a sheet made before it counted (docs/CLANS_DESIGN.md, D2): each
 * stored number gets exactly what the bonus adds to it (the formula with the bonus minus the formula
 * without it), so numbers from the creator's formula come out as the formula gives them now, and
 * hand-made ones keep their hand-made part. Marked as version 2, so it never happens twice.
 */
export function countClanBonus(c: ShinobiCharacter): ShinobiCharacter {
  if ((c.sheetVersion ?? 1) >= SHEET_VERSION) return c;
  const out: ShinobiCharacter = { ...c, sheetVersion: SHEET_VERSION };
  if (!Object.hasOwn(SHINOBI_CLASSES, c.shinobiClass) || !Object.hasOwn(CLANS_DATA, c.clan)) return out;
  const before = deriveStats(buildOf(c), { clanBonus: false });
  const after = deriveStats(buildOf(c));
  for (const k of DERIVED_KEYS) {
    const add = after[k] - before[k];
    if (Number.isFinite(add) && Number.isFinite(c[k])) out[k] = c[k] + add;
  }
  return refit(c, out);
}

/**
 * The chakra burst each legend and companion had before its chakra type followed its jutsu
 * (2026-10-21), and the one it has now (its preset in data/shinobiData.ts or data/missions.ts; a test
 * keeps the two the same), by id.
 */
export const LEGEND_BURST_CHANGE: Readonly<Record<string, { old: ChakraColorId; now: ChakraColorId }>> = {
  preset_storm: { old: 'violet', now: 'yellow' }, // Kaien: Spectral Guardian, now Lightning
  preset_night: { old: 'blue', now: 'yellow' }, // Ren: Rising Tide, now Lightning
  preset_sunburst: { old: 'orange', now: 'green' }, // Hiro: Cinder Nova, now Wind
  preset_warlord: { old: 'violet', now: 'red' }, // Raiga: Spectral Guardian, now Fire
  companion_hana: { old: 'green', now: 'blue' }, // Hana: Leafwind Spiral, now Water
  companion_kenji: { old: 'violet', now: 'brown' }, // Kenji: Spectral Guardian, now Earth
};

/**
 * A saved copy of a legend or companion (the hero, the roster, a mission under way) that still has
 * the burst it had before its type followed its jutsu gets the legend's burst of today, so its nature
 * matches its jutsu again (the owner, 2026-10-21: "actualiza"). It keeps the colour it showed: its own
 * tint, or the old burst's natural colour. Nothing else changes.
 *
 * Only a copy whose jutsu fit the legend's type of today better than the old burst's type (fewer of
 * its Element and S-rank jutsu are of another element) is moved: that is a copy saved with the
 * legend's own jutsu. A player who picks the old burst's type in today's creator (Ren as Water, Hiro
 * with Cinder Nova) gets the jutsu fitted to it (rules/jutsuNature.ts, fitLoadout), so that copy is
 * the player's choice and stays as it is, on every load. A moved copy no longer has the old burst, so
 * the move happens once.
 */
export function updateLegendChakra(c: ShinobiCharacter): ShinobiCharacter {
  const change = Object.hasOwn(LEGEND_BURST_CHANGE, c.id) ? LEGEND_BURST_CHANGE[c.id] : undefined;
  if (!change || !c.selectedJutsus) return c;
  // A sheet older than the sprite look draws its burst from its old aura colour: the same look here.
  const look = getAppearance(c);
  const chakra = look.chakra;
  if (!chakra || chakra.color !== change.old) return c;
  const offOld = offNatureJutsus(c.selectedJutsus, chakraNature(chakra)).length;
  const offNow = offNatureJutsus(c.selectedJutsus, chakraNature({ color: change.now })).length;
  if (offNow >= offOld) return c;
  return { ...c, appearance: { ...look, chakra: { ...chakra, color: change.now, tint: chakra.tint ?? change.old } } };
}

/**
 * A saved copy of a legend that has a second element on its own sheet (Kaien Fire, Raiga Earth: the
 * owner, 2026-10-21, "ok con kaien y raiga") gets it, and the legend's level-5 choice when the copy is
 * level 5 or more, so its jutsu of that element are its nature again. Only a copy that has not made a
 * level-5 choice or had elements of its own (both fields missing) and still has the legend's type: a
 * copy whose player changed the type keeps what it has. Written once: the next load finds the fields.
 */
export function addLegendNatures(c: ShinobiCharacter): ShinobiCharacter {
  if (c.extraNatures !== undefined || c.natureGrowth !== undefined) return c;
  const legend = LEGENDARY_PRESETS.find((p) => p.character.id === c.id)?.character;
  if (!legend?.extraNatures?.length || natureOf(c) !== natureOf(legend)) return c;
  return {
    ...c,
    extraNatures: [...legend.extraNatures],
    ...(legend.natureGrowth && c.level >= GROWTH_LEVEL ? { natureGrowth: legend.natureGrowth } : {}),
  };
}

/** A sheet whose look still has the old headband plate, the slender body or a neck choice, with today's look (the same sheet if not). */
function withTodaysLook(c: ShinobiCharacter): ShinobiCharacter {
  if (!c.appearance) return c;
  const look = migrateAppearance(c.appearance);
  return look === c.appearance ? c : { ...c, appearance: look };
}

/**
 * A sheet saved with a jutsu in its S-rank slot that is an Element slot's now (the Devouring Tide,
 * rank A since 2026-10-21) gets it in an Element slot (rules/jutsuNature.ts, ultimateToElement).
 */
export function tideToElement(c: ShinobiCharacter): ShinobiCharacter {
  const moved = c.selectedJutsus ? ultimateToElement(c.selectedJutsus) : null;
  return moved ? { ...c, selectedJutsus: moved.loadout } : c;
}

/**
 * A sheet from an older save or an import, as today's rules read it:
 * - the explosive tag, a jutsu no more, swapped for the starting sheet's Utility jutsu and two tags
 *   in the ninja's pouch (rules/pouch.ts, tagJutsuToItem);
 * - a legend's or companion's copy with its old chakra burst and the legend's own jutsu moved to the
 *   legend's type (updateLegendChakra);
 * - a copy of Kaien or Raiga given the legend's second element (addLegendNatures);
 * - a jutsu in the S-rank slot that is an Element slot's now moved to one (tideToElement);
 * - its clan converted (old names load as the clan that replaced them). When its numbers came from
 *   the creator's formula (its AC and jutsu DC and attack still match it) and its old clan built a
 *   bonus into them, its max HP and chakra are worked out again without it, and what it has left is
 *   kept under the new maxima;
 * - the clan's ability bonus counted in its numbers, once (countClanBonus);
 * - its headband as plain cloth: the old plate's fields dropped (sprite/legacy.ts, migrateAppearance);
 * - a look on the slender body, which is gone, on the female body (migrateAppearance);
 * - a saved neck choice dropped: every look has today's slim nape (migrateAppearance).
 * Hand-made numbers (the presets) keep their hand-made part; the other jutsu stay as they are, and of
 * the look only that old burst, the headband plate, the slender body and the neck change. A sheet that is already today's comes back as it is.
 */
export function migrateCharacter(saved: ShinobiCharacter): ShinobiCharacter {
  const c = tideToElement(addLegendNatures(updateLegendChakra(tagJutsuToItem(withTodaysLook(saved)))));
  const clan = migrateClan(c.clan) ?? DEFAULT_CHARACTER.clan;
  const before = (c.sheetVersion ?? 1) < SHEET_VERSION;
  if (clan === c.clan && !before) return c;
  let out: ShinobiCharacter = { ...c, clan };
  if (clan !== c.clan && OLD_BONUS_CLANS.includes(c.clan) && Object.hasOwn(SHINOBI_CLASSES, c.shinobiClass)) {
    // The formula the sheet was made with: without the clan's ability bonus if it is that old.
    const d = deriveStats(buildOf(out), { clanBonus: !before });
    if (d.armorClass === c.armorClass && d.jutsuSaveDC === c.jutsuSaveDC && d.jutsuAttackBonus === c.jutsuAttackBonus) {
      const fresh = { ...out, maxHp: d.maxHp, maxChakra: d.maxChakra };
      out = { ...fresh, currentHp: Math.min(c.currentHp, effectiveMaxHp(fresh)), currentChakra: Math.min(c.currentChakra, d.maxChakra) };
    }
  }
  return countClanBonus(out);
}

/** Spanish name of an effect for the screens. */
export const effectNameEs = (id: EffectId): string => EFFECTS[id]?.nameEs ?? id;
