// Weapon Element Enhancement (Potenciación elemental del arma), the Weapon Master's class ability.
//
// The owner (2026-10-23), verbatim: "ok ahora para la clase de maestro de armas , agregale weapon
// element enhacement como habilidad y le pondra un efecto de animacion a las armas (si es rayo ,
// electricidad alredor del arma , si es viento , vfx de viento alrededor del arma , si es fuego el
// arma prende en llamas , si es agua se extiende el alcance del arma con agua vfx , si es tierra se
// ponen obsdiana filosa en tu arma , no aplica para genjutsu, solo elemental )".
//
// His rules: the Bukijutsu Master (maestro de armas) has it; it puts the ninja's element on the
// weapon (lightning crackles round it, wind swirls round it, fire sets it alight, water lengthens its
// reach, earth sets sharp obsidian on it); only the five elements, never genjutsu. Everything else
// here (the bonus action, the chakra, the rounds, the dice, each element's extra) is the builder's
// proposal, waiting for his numbers (docs/GAMEPLAY_DESIGN.md, "Weapon Element Enhancement").
//
// Pure rules: no React, no images, no Math.random (the dice are rolled by the engine's seeded rolls).

import { extraNatures, hasSecondElement } from '../rules/natureGrowth';
import { natureOf } from '../rules/ninja';
import type { ChakraNature, ShinobiCharacter } from '../types/shinobi';
import type { BattleEvent, DamageType, Unit } from './types';

/** The ability's id (a class ability: it sits among the unit's jutsu, like a clan's). */
export const WEAPON_ELEMENT = 'weapon_element';

/** The class that has it. */
export const IMBUE_CLASS = 'Bukijutsu Master';

/** The elements a weapon can take: the five elemental natures (no genjutsu, no Light or Void). */
export type ImbueElement = 'Fire' | 'Lightning' | 'Wind' | 'Water' | 'Earth';
export const IMBUE_ELEMENTS: readonly ImbueElement[] = ['Fire', 'Lightning', 'Wind', 'Water', 'Earth'];

// --- the proposal's numbers (the owner fixed none but the water's longer reach) -------------------

/** Chakra it costs (proposal: as much as the Kōton block or the Shooting-Star Thrust). */
export const IMBUE_COST = 2;
/** The ninja's own turns it lasts, the one it is cast in counted (proposal: as the charged Chidori). */
export const IMBUE_ROUNDS = 3;
/** The element's damage each weapon hit adds (proposal: a small die, doubled to its maximum on a crit like every die). */
export const IMBUE_DICE = '1d4';
/** Water: meters the weapon's melee reach grows by (the owner: "se extiende el alcance del arma"; the 1.5 m is our proposal). */
export const WATER_REACH = 1.5;
/** Wind: meters a critical hit blows the target back (proposal). */
export const WIND_PUSH = 1.5;
/** Earth: the lowest natural d20 that is a critical hit with obsidian on the edge (proposal: 19–20). */
export const EARTH_CRIT = 19;

/**
 * The damage each element adds. Fire and lightning are their own; the game has no water, wind or
 * earth damage, so they deal what their jutsu deal: water strikes (bludgeoning, like the Water
 * Dragon), wind cuts (slashing, like the Wind Blade), obsidian pierces (piercing, like the Earth
 * Bullets).
 */
export const IMBUE_DAMAGE: Record<ImbueElement, DamageType> = {
  Fire: 'Fire',
  Lightning: 'Lightning',
  Wind: 'Slashing',
  Water: 'Bludgeoning',
  Earth: 'Piercing',
};

/**
 * The elements whose effect on the weapon waits for the owner's yes: not offered (no button) until he
 * approves it. The owner (2026-10-23): "me gusta las armas con mejora elemental metelas en el juego
 * menos la de agua se ve mal y no de calidad mejorala para que se ve mas epica y proporcional". He approved
 * the new water (vfx/weapon-water-v2) the same day: "me gusta agua aprovado". None waits now.
 */
export const IMBUE_PENDING: readonly ImbueElement[] = [];

/** An element the ninja can put on its weapon: its chakra type, if it is one of the five elements and not waiting for approval. */
export const imbueElementOf = (nature: ChakraNature | string | undefined): ImbueElement | null =>
  IMBUE_ELEMENTS.includes(nature as ImbueElement) && !IMBUE_PENDING.includes(nature as ImbueElement) ? (nature as ImbueElement) : null;

/**
 * The class abilities a ninja of this class and these natures has (its chakra type and, once unlocked, its
 * second element: imbueNaturesOf), in the order their buttons show.
 */
export function classAbilities(shinobiClass: string | undefined, natures: ChakraNature | string | undefined | readonly (ChakraNature | string)[]): string[] {
  const list = Array.isArray(natures) ? natures : [natures];
  return shinobiClass === IMBUE_CLASS && list.some((n) => imbueElementOf(n)) ? [WEAPON_ELEMENT] : [];
}

/**
 * The natures a ninja can put on its weapon: its chakra type, and its second element once it has
 * unlocked it (the owner, 2026-10-23: "tambien segundo elemento al momento de desbloquear"; the second
 * element of natureGrowth.ts, never the third).
 */
export function imbueNaturesOf(c: ShinobiCharacter): ChakraNature[] {
  const main = natureOf(c);
  return hasSecondElement(c) ? [main, ...extraNatures(c, main).slice(0, 1)] : [main];
}

/** The elements this unit can put on its weapon, its chakra type's first, each one of the five and not waiting for approval. */
export function unitImbueElements(u: Pick<Unit, 'character'>): ImbueElement[] {
  if (!u.character) return [];
  const out: ImbueElement[] = [];
  for (const n of imbueNaturesOf(u.character)) {
    const e = imbueElementOf(n);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

/** The element this unit puts on its weapon unless it chooses another (the first of unitImbueElements), or null. */
export function unitImbueElement(u: Pick<Unit, 'character'>): ImbueElement | null {
  return unitImbueElements(u)[0] ?? null;
}

/** The element on the weapon a unit strikes with right now: imbued, and the weapon in hand. */
export const activeImbue = (u: Pick<Unit, 'imbued' | 'armed' | 'weapon'>): ImbueElement | null => (u.imbued && u.armed && u.weapon.held ? u.imbued.element : null);

/** Meters the unit's melee reach grows by now: water on the weapon in hand. */
export const imbueReach = (u: Pick<Unit, 'imbued' | 'armed' | 'weapon'>): number => (activeImbue(u) === 'Water' ? WATER_REACH : 0);

/**
 * Why the unit can't put its element (or `element`, one of its two) on its weapon now, or null (the
 * engine checks the action, the bonus action and the chakra itself): not one of its elements, no
 * weapon to hold (fists, a palm technique), already on the weapon (one at a time).
 */
export function imbueBlocker(u: Unit, element?: ImbueElement): string | null {
  const els = unitImbueElements(u);
  if (!els.length || (element && !els.includes(element))) return 'noElement';
  if (!u.weapon.held) return 'noBlade';
  if (u.imbued) return 'alreadyImbued';
  return null;
}

/** Why it ended: its rounds ran out, its ninja fell, its chakra was sealed. */
export type ImbueEnd = 'expired' | 'down' | 'sealed';

/** Puts the element on the weapon for its rounds. */
export function startImbue(u: Unit, element: ImbueElement, ev: BattleEvent[]): void {
  u.imbued = { element, rounds: IMBUE_ROUNDS };
  ev.push({ t: 'imbue', unit: u.id, element, on: true });
}

/** Ends it (and tells the screen and the log why). */
export function endImbue(u: Unit, end: ImbueEnd, ev: BattleEvent[]): void {
  const m = u.imbued;
  if (!m) return;
  u.imbued = undefined;
  ev.push({ t: 'imbue', unit: u.id, element: m.element, on: false, end });
}

/** It can't hold any more: its ninja fell, or its chakra was sealed. */
export function imbueHolds(u: Unit, sealed: boolean, ev: BattleEvent[]): void {
  if (!u.imbued) return;
  if (u.down) endImbue(u, 'down', ev);
  else if (sealed) endImbue(u, 'sealed', ev);
}

/** At the start of its ninja's turn it loses a round; with none left it fades (its cast's own turn is the first). */
export function tickImbue(u: Unit, ev: BattleEvent[]): void {
  if (!u.imbued) return;
  u.imbued.rounds -= 1;
  if (u.imbued.rounds <= 0) endImbue(u, 'expired', ev);
}
