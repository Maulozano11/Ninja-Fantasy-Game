// The last stand (the owner, 2026-10-28, M1: "cuando se pierden los 3 dados de salvación... se ofrece
// estas opciones: se puede hacer el jutsu o golpe definitivo más fuerte con 300 % de fuerza y hay un
// 34 % de probabilidad de no morir; retirada: se retira de la batalla y sale vivo con una mutilación
// fija"). A player's ninja that loses its third death save is asked (combat.ts finishDying sets the
// pending 'lastStand'; engine.ts react resolves it with this module):
// - sacrifice: it rises for one blow, its strongest (the AI's own choice of plan, intent.ts), free
//   and at SACRIFICE_POWER; then SACRIFICE_LIVES of surviving, stable at 0 HP; otherwise it dies for
//   good, whatever the difficulty.
// - retreat: it leaves the battle alive at 1 HP, with a mutilation fixed by the blow that dropped it
//   (fire: an arm; a cut or a thrust: an eye; a blow: a leg; anything else: an arm), a permanent
//   effect (rules/effects.ts) an implant can later replace (rules/implants.ts).

import type { BattleState, DamageType, Unit } from './types';

export const SACRIFICE_POWER = 3;
/** The chance a sacrifice leaves the ninja alive (the owner's 34 %). */
export const SACRIFICE_LIVES = 0.34;

export type Mutilation = NonNullable<Unit['mutilation']>;

/** What a retreat costs, by the blow that brought the ninja down. */
export function mutilationFor(type: DamageType | undefined): Mutilation {
  if (type === 'Slashing' || type === 'Piercing') return 'missing_eye';
  if (type === 'Bludgeoning' || type === 'Force') return 'missing_leg';
  return 'missing_arm';
}

/** Whether the pending last stand is this unit's. */
export const lastStandOf = (s: BattleState, id: string): boolean => s.pending?.kind === 'lastStand' && s.pending.reactor === id;
