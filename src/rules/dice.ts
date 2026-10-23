// Dice notation ("2d8+3") parsed and rolled. The old combat parser dropped the "+3".

import { Rng, rollDie } from './rng';

export interface DiceExpr {
  count: number;
  sides: number;
  bonus: number;
}

export interface DiceRoll {
  expr: DiceExpr;
  rolls: number[];
  /** Sum of the dice plus the bonus, never below 0. */
  total: number;
}

/** Parses "2d8+3", "1d4", "d6", "3d6-1" or a plain number. Null when the text isn't dice. */
export function parseDice(text: string): DiceExpr | null {
  const m = text.replace(/\s+/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$|^([+-]?\d+)$/i);
  if (!m) return null;
  if (m[4] !== undefined) return { count: 0, sides: 0, bonus: Number(m[4]) };
  const count = m[1] === '' ? 1 : Number(m[1]);
  const sides = Number(m[2]);
  if (count < 1 || sides < 1) return null;
  return { count, sides, bonus: m[3] ? Number(m[3]) : 0 };
}

export function rollDice(rng: Rng, dice: DiceExpr | string): DiceRoll {
  const expr = typeof dice === 'string' ? parseDice(dice) : dice;
  if (!expr) throw new Error(`Not dice notation: ${String(dice)}`);
  const rolls = Array.from({ length: expr.count }, () => rollDie(rng, expr.sides));
  return { expr, rolls, total: Math.max(0, rolls.reduce((a, b) => a + b, 0) + expr.bonus) };
}

export const averageDice = (e: DiceExpr): number => (e.count * (e.sides + 1)) / 2 + e.bonus;

export function formatDice(e: DiceExpr): string {
  if (!e.count) return String(e.bonus);
  const bonus = e.bonus > 0 ? `+${e.bonus}` : e.bonus < 0 ? `${e.bonus}` : '';
  return `${e.count}d${e.sides}${bonus}`;
}

/**
 * A critical's damage (owner's rule, docs/GAMEPLAY_DESIGN.md "Dice"): every die at its highest
 * face, the critical's doubled dice too, plus the bonus once. 2d6+3 → 4×6+3 = 27.
 */
export function maxCritDamage(dice: DiceExpr | string): number {
  const e = typeof dice === 'string' ? parseDice(dice) : dice;
  if (!e) return 0;
  return Math.max(0, 2 * e.count * e.sides + e.bonus);
}
