// The Mirai's Path of the Infernal Fire in battle (docs/CLANS_DESIGN.md, the owner's numbers of
// 2026-10-29, D-T24): the Ember Armour, level 6. The Colossal Avatar (levels 9 and 12) comes next.

import { addEffect, effectMods, hasEffect } from '../rules/effects';
import { infernalSteps } from '../rules/paths';
import type { BattleEvent, BattleState, Hit, Unit } from './types';

export const EMBER = 'ember_armour';
/** Its chakra (a bonus action too). */
export const EMBER_COST = 4;
export const EMBER_BLOW = '1d4';
export const EMBER_BURN = '1d6';

export const emberOn = (u: Unit): boolean => hasEffect(u.effects, EMBER) && !u.down;

/**
 * The ninja puts on the Ember Armour (bonus action, EMBER_COST chakra, 3 of its turns): in the
 * fighting, with the Path's step, its bonus action and chakra, not sealed. Putting it on again
 * renews it.
 */
export function emberArmour(s: BattleState, u: Unit, ev: BattleEvent[]): string | null {
  if (s.phase !== 'combat') return 'combatOnly';
  if (!infernalSteps(u.character).ember) return 'noPath';
  if (!u.turn.bonus) return 'noBonus';
  if (effectMods(u.effects).noJutsu) return 'chakraSealed';
  if (u.chakra < EMBER_COST) return 'noChakra';
  u.turn.bonus = false;
  u.chakra -= EMBER_COST;
  u.effects = addEffect(u.effects, EMBER, { source: 'Ember Armour' }).effects;
  ev.push({ t: 'chakra', unit: u.id, delta: -EMBER_COST, chakra: u.chakra, reason: EMBER });
  ev.push({ t: 'effect', unit: u.id, effect: EMBER, on: true });
  return null;
}

/** Fire resistance while it is on (combat.ts adjustDamage). */
export const resistsFire = (t: Unit): boolean => hasEffect(t.effects, EMBER);

/** A melee weapon blow by a ninja in the armour carries its fire (dealt after the blow). */
export function emberBlow(a: Unit, h: Hit, roll: (expr: string, crit: boolean) => number): void {
  if (h.melee && emberOn(a)) h.ember = roll(EMBER_BLOW, !!h.crit);
}
