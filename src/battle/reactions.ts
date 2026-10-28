// Reactions in the enemy's turn beyond the opportunity attack, Premonitory Evasion and Kawarimi
// (the owner, 2026-10-28, N15 a of docs/SPACE_DESIGN.md: "pausa y pregunta con cada disparador
// nuevo (proyectil entrante, enemigo a la vista, aliado golpeado)"): a kunai coming at a Bukijutsu
// Master can be deflected, and caught and thrown back when it loses all its damage; a blow about
// to land on a comrade can be taken by a ninja standing beside them. Both cost the reaction; the
// engine pauses and asks the player (engine.ts applyHits, react), the AI decides for its own.

import type { BattleState, Hit, Unit } from './types';
import { JUTSU } from './jutsu';
import { abilityMod } from '../rules/checks';
import { effectMods } from '../rules/effects';
import { dist } from './map';
import { rollDiceExpr } from './combat';

/** What the deflection takes off the kunai: 1d10 + DEX + the level (5e's Deflect Missiles), and its chakra. */
export const DEFLECT_DICE = '1d10';
export const DEFLECT_COST = 1;
/** How close a comrade must stand to take a blow meant for another. */
export const INTERPOSE_REACH = 1.6;

/** A blow a weapon threw from afar (a kunai), not a jutsu and not a blade's reach. */
export const thrownBlow = (h: Hit): boolean => !!h.aimed && h.amount > 0 && !h.melee && !h.unblockable && !h.unseen && !JUTSU[h.what];

/**
 * Deflecting a kunai (the owner's "devolver proyectil"): a Bukijutsu Master with its reaction and
 * a weapon in hand, in the fighting, DEFLECT_COST chakra, against a thrown blow it can see coming.
 */
export function canDeflect(s: BattleState, t: Unit, h: Hit): boolean {
  if (s.phase !== 'combat' || !thrownBlow(h) || h.deflectDeclined) return false;
  if (t.kind !== 'ninja' || t.down || !t.armed || !t.turn.reaction || t.cond.surprised) return false;
  if (t.character?.shinobiClass !== 'Bukijutsu Master') return false;
  return !effectMods(t.effects).noJutsu && t.chakra >= DEFLECT_COST;
}

/**
 * The blade meets the kunai: the blow loses DEFLECT_DICE + DEX + level; losing it all, the kunai is
 * caught (the caller throws it back). Returns the hit as it lands (0 damage when caught) and whether
 * it was caught.
 */
export function deflect(s: BattleState, t: Unit, h: Hit): { hit: Hit; less: number; caught: boolean } {
  t.turn.reaction = false;
  t.chakra -= DEFLECT_COST;
  const less = Math.min(h.amount, rollDiceExpr(s, DEFLECT_DICE) + abilityMod(t.stats.dex) + (t.character?.level ?? 1));
  const amount = h.amount - less;
  return { hit: { ...h, amount, deflectDeclined: true }, less, caught: amount <= 0 };
}

/**
 * A comrade who can step in front of a blow (the owner's "aliado golpeado"): on the target's side,
 * standing within INTERPOSE_REACH of it, with its reaction, not already asked for this blow.
 */
export function interposers(s: BattleState, h: Hit): Unit[] {
  const t = s.units[h.unit];
  if (!t || s.phase !== 'combat' || !h.aimed || h.amount <= 0 || h.unblockable || h.unseen || h.interposedFor) return [];
  return Object.values(s.units).filter(
    (r) =>
      r.id !== t.id && r.team === t.team && r.kind === 'ninja' && !r.down && r.turn.reaction && !r.cond.surprised && !r.cond.prone && !(h.interposeDeclined ?? []).includes(r.id) && dist(r.pos, t.pos) <= INTERPOSE_REACH,
  );
}

/** The comrade takes the blow: the hit lands on it instead, its reaction spent. */
export function interpose(r: Unit, h: Hit): Hit {
  r.turn.reaction = false;
  return { ...h, unit: r.id, interposedFor: h.unit, interposeDeclined: undefined, evadeDeclined: undefined, deflectDeclined: undefined };
}

/** An AI comrade steps in when its order is to protect and it stands the blow far better than the one meant for it. */
export function aiInterposes(r: Unit, t: Unit, h: Hit): boolean {
  return r.aiOrder === 'defensive' && r.hp - h.amount > 0 && r.hp > t.hp * 1.5;
}
