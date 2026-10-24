// Liquid Body (Técnica de Agua: Cuerpo Líquido; docs/GAMEPLAY_DESIGN.md, "Liquid Body"): the ninja
// melts into a puddle on the ground and passes for terrain. The owner's rules (2026-10-24): rank C,
// Water only, 2 chakra, an action with seals to melt; leaving the puddle, or attacking from it,
// always costs the bonus action ("salir del charco o atacar desde el charco cuesta una bonus accion
// hagas lo que hagas"); still, it is hidden; moving on dry ground within a foe's sight it is noticed
// like a crouched ninja, on wet ground or in shallow water it stays hidden; weapons do half, a hit
// calls for a CON save or it is forced out; lightning (double), fire and wind force it out; stepped
// on or found, it is forced out too.
//
// Pure and leaf-like: the state's own data, no dice (the rolls are made where the engine rolls).

import type { BattleEvent, BattleState, DamageType, Pt, Unit } from './types';
import { dampAt, dist } from './map';

/** The jutsu's id. */
export const LIQUID_BODY = 'water_liquid_body';
/** How long it holds in the fighting, in its own turns (10 rounds); the stealth phase doesn't count. */
export const PUDDLE_ROUNDS = 10;
/** A foe whose step comes this close (m) treads on the puddle: the cell or the one next to it. */
export const STEP_ON = 0.6;
/** The puddle's own cell stays wet while it lies there (it is water): this many rounds, renewed each turn. */
export const PUDDLE_WET_ROUNDS = 2;

export const inPuddle = (u: Unit): boolean => !!u.cond.puddle;

/** Its form takes no hands: what a puddle can't do (the engine's refusal key), or null. */
export function puddleBlocks(u: Unit, act: string): string | null {
  if (!u.cond.puddle) return null;
  return ['jutsu', 'hide', 'crouch', 'jump', 'draw', 'shove', 'item', 'stabilize', 'stone', 'drag'].includes(act) ? 'inPuddle' : null;
}

/** Melts: its turn's movement left halves (it moves at half speed) and the foes in `knownBy` saw it. */
export function meltInto(u: Unit, knownBy: string[], ev: BattleEvent[]): void {
  u.cond.puddle = { rounds: PUDDLE_ROUNDS, knownBy: [...knownBy] };
  u.cond.crouched = false;
  u.turn.move = Math.max(0, Math.min(u.turn.move, u.speed / 2 - u.turn.moved));
  ev.push({ t: 'condition', unit: u.id, cond: 'puddle', on: true });
  ev.push({ t: 'note', key: 'puddleIn', params: { name: u.name } });
}

/**
 * Out of the puddle. `rise`: by its own choice (the bonus action is paid by the caller), it comes up
 * low and stays hidden if it was (crouched, as a hidden ninja keeps its hiding); `forced`: struck
 * out, stepped on, found, or the jutsu ran out, and every foe sees it.
 */
export function riseFrom(u: Unit, how: 'rise' | 'forced' | 'timeout', ev: BattleEvent[]): void {
  if (!u.cond.puddle) return;
  u.cond.puddle = undefined;
  ev.push({ t: 'condition', unit: u.id, cond: 'puddle', on: false });
  if (how === 'forced') {
    if (u.cond.hidden !== undefined) {
      u.cond.hidden = undefined;
      u.cond.perfectHide = undefined;
      ev.push({ t: 'condition', unit: u.id, cond: 'hidden', on: false });
    }
    ev.push({ t: 'note', key: 'puddleForced', params: { name: u.name } });
    return;
  }
  if (u.cond.hidden !== undefined) {
    u.cond.crouched = true;
    ev.push({ t: 'condition', unit: u.id, cond: 'crouched', on: true });
  }
  ev.push({ t: 'note', key: how === 'timeout' ? 'puddleEnds' : 'puddleRise', params: { name: u.name } });
}

/**
 * What a hit does to a puddle (the owner's rules): weapons half their blow (slashing, piercing,
 * bludgeoning), fire half (it turns to steam), lightning double (the water carries it).
 */
export function puddleDamage(amount: number, type: DamageType, weapon: boolean): number {
  if (type === 'Lightning') return amount * 2;
  if (type === 'Fire') return Math.floor(amount / 2);
  if (weapon && (type === 'Slashing' || type === 'Piercing' || type === 'Bludgeoning')) return Math.floor(amount / 2);
  return amount;
}

/** Lightning, fire and wind force it out whatever the damage; any other hit asks for a CON save. */
export const forcesOut = (type: DamageType, wind: boolean): boolean => wind || type === 'Lightning' || type === 'Fire';

/** The CON save a hit asks for: DC 10 or half the damage, whichever is higher (5e concentration). */
export const puddleSaveDc = (amount: number): number => Math.max(10, Math.floor(amount / 2));

/** It moves unseen here: wet ground, shallow water or a river. Dry ground gives a moving puddle away. */
export const puddleCover = (s: BattleState, p: Pt): boolean => dampAt(s, p);

/** Foes' puddles that a step at `p` treads on. */
export function puddlesUnder(s: BattleState, mover: Unit, p: Pt): Unit[] {
  return Object.values(s.units).filter((o) => o.cond.puddle && !o.down && o.id !== mover.id && o.team !== mover.team && dist(o.pos, p) <= STEP_ON);
}

/** A foe treads on it (`tread`) or finds it with a Search: forced out, seen by everyone. */
export function foundOut(u: Unit, by: Unit, ev: BattleEvent[], how: 'tread' | 'search' = 'tread'): void {
  ev.push({ t: 'note', key: how === 'tread' ? 'puddleFound' : 'puddleSearched', params: { name: u.name, other: by.name } });
  riseFrom(u, 'forced', ev);
}

/** Whether `viewer` knows where `u` is: not hidden from it, or a puddle it saw melt or noticed. */
export function puddleKnownBy(u: Unit, viewer: Unit): boolean {
  return !!u.cond.puddle?.knownBy.includes(viewer.id);
}

/** A foe noticed it (it moved on dry ground in its sight): it knows where the puddle is from now on. */
export function notice(u: Unit, by: Unit): void {
  if (u.cond.puddle && !u.cond.puddle.knownBy.includes(by.id)) u.cond.puddle = { ...u.cond.puddle, knownBy: [...u.cond.puddle.knownBy, by.id] };
}
