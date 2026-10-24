// Senbon, weapon poison and the healing senbon (the owner, 2026-10-23: "mete los senbons como nueva
// arma arrojadiza y hay que agregar una opcion para poder inbuir las armas en veneno y los senbons
// pueden inbuirse en pocion curativa y ser lanzado hacia aliados para curar (mas tipo de curacion
// para el healer)"; docs/GAMEPLAY_DESIGN.md, "Senbon, weapon poison and the healing senbon").
// His decisions are the three things themselves; every number here is our proposal, kept as a
// constant so he can change it in one place.

import { abilityMod } from '../rules/checks';
import type { BattleState, Unit, Weapon } from './types';
import { homeTeam } from './types';

/**
 * A senbon: a thin steel needle, thrown like a dart (5e: 1d4 piercing, finesse, 20/60 ft). Its
 * normal range is 6 m (`reach`, as for the kunai), up to SENBON_LONG with disadvantage.
 */
export const SENBON: Weapon = { name: 'Senbon', dice: '1d4', type: 'Piercing', reach: 6, finesse: true, held: false };
export const SENBON_LONG = 18;
/** A needle is light and flies true: +1 to hit (proposal; the kunai has none). */
export const SENBON_HIT = 1;
/** Senbon in each ninja's case at the start of a battle (picked back up afterwards, like kunai). */
export const SENBON_CASE = 10;

/** One vial of weapon poison coats a ninja's blade and throwing pouch for this many hits (or until the battle ends). */
export const POISON_HITS = 3;
/** The CON save a coated hit asks for. */
export const POISON_DC = 12;
/** What a failed save against the coat takes, as poison damage (and Poisoned). */
export const POISON_DICE = '1d4';
/** What the coat's save, damage and effect say they come from (the log names it). */
export const WEAPON_POISON = 'weapon_poison';

/**
 * The enemies who carry weapon poison of their own, and how many vials (proposal): the rogues, who
 * fight with blades and kunai.
 */
export const ENEMY_POISON: Partial<Record<string, number>> = { rogue: 1 };

/** A healing potion drunk (bonus action, on oneself): the same 2d4 + 2, with no WIS bonus. */
export const POTION_DICE = '2d4+2';

/** The AI drinks a potion at half its HP or less when no medic of its side stands within this (m). */
export const MEDIC_NEAR = 12;

/** A healing senbon heals a potion of healing (5e: 2d4 + 2). */
export const HEAL_SENBON_DICE = '2d4+2';
/** How far a healing senbon can be thrown: the senbon's normal range (it has to land just right). */
export const HEAL_SENBON_RANGE = SENBON.reach;
/** The healer class: its medics put the needle where it does the most good. */
export const MEDIC_CLASS = 'Medical Specialist';

/** A medic adds its WIS modifier (if positive) to a healing senbon. */
export const healSenbonBonus = (u: Unit): number => (u.character?.shinobiClass === MEDIC_CLASS ? Math.max(0, abilityMod(u.stats.wis)) : 0);

/** Senbon left in a unit's case. */
export const senbonLeft = (u: Unit): number => u.senbon ?? 0;

/** Whether a unit draws on the party's backpack (a commanded enemy or a beast that joined does not). */
const backpack = (u: Unit): boolean => homeTeam(u) === 'party' && !u.joined;

/** Vials of weapon poison a unit can use: the party's backpack, or an enemy's own pouch. */
export const poisonLeft = (s: BattleState, u: Unit): number => (backpack(u) ? s.supplies.weaponPoison ?? 0 : u.kit?.poison ?? 0);

/** Healing potions a unit can dip a senbon in: the party's backpack only. */
export const potionsLeft = (s: BattleState, u: Unit): number => (backpack(u) ? s.supplies.healingPotions ?? 0 : 0);

/** Spends one vial of weapon poison from wherever the unit carries it. */
export function spendPoison(s: BattleState, u: Unit): void {
  if (backpack(u)) s.supplies.weaponPoison = Math.max(0, (s.supplies.weaponPoison ?? 0) - 1);
  else if (u.kit) u.kit.poison = Math.max(0, (u.kit.poison ?? 0) - 1);
}

/** The coat's hits still left on a unit's weapons. */
export const coatLeft = (u: Unit): number => u.coat?.hits ?? 0;

/** A blow carries the coat: any thrown weapon, or a blade in hand (fists and palm techniques take none). */
export const carriesCoat = (u: Unit, w: Weapon, ranged: boolean): boolean => coatLeft(u) > 0 && (ranged || w.held);

// --- the medic's kit (the owner, 2026-10-24: "1 si 2 no 3 si gasta antidoto 4 si pero ... 5 me encanta
// como Feat"; docs/GAMEPLAY_DESIGN.md, "The medic's kit") ------------------------------------------

/** Quick First Aid: a Medical Specialist's bonus action, once a battle, a fallen ally within this (m) back up at 1 HP. */
export const FIRST_AID_REACH = 1.5;
/** The antidote senbon is thrown as far as the healing senbon. */
export const ANTIDOTE_SENBON_RANGE = HEAL_SENBON_RANGE;
/** Mano firme / Steady Hand (a feat): every heal its ninja gives rolls one more die. */
export const STEADY_HAND = 'steady_hand';

/** The ninja has Steady Hand. */
export const steadyHand = (u: Unit): boolean => !!u.character?.selectedFeats?.includes(STEADY_HAND);

/** A heal's dice as `u` gives them: one more die with Steady Hand ('2d4+2' → '3d4+2'). */
export function healDice(u: Unit, dice: string): string {
  if (!steadyHand(u)) return dice;
  return dice.replace(/^(\d+)d/, (_, n: string) => `${Number(n) + 1}d`);
}

/** Antidotes in the party's backpack a unit can dip a senbon in. */
export const antidotesLeft = (s: BattleState, u: Unit): number => (backpack(u) ? s.supplies.antidotes : 0);
