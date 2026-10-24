// Agujas de sello / Seal Needles: senbon of platinum, which in this world blocks chakra (the owner,
// 2026-10-24: "d y c haremos que las senbos sean de platino que en nuestro lore tiene propiedades de
// bloquar el chakra o energia"). Learned two ways, both his: by studying anatomy at camp (D), or from
// a wandering old doctor met on the road (C). docs/GAMEPLAY_DESIGN.md and docs/MISSION_DESIGN.md,
// "Seal Needles". His decisions are the ability, platinum and the two ways; the numbers are our
// proposal. Pure rules: no React, no randomness of its own.

import type { ShinobiCharacter } from '../types/shinobi';
import type { RuleEvent } from '../types/mission';

/** The ability's id on a ninja's sheet (ShinobiCharacter.abilities). */
export const SEAL_NEEDLES = 'seal_needles';
/** Camps of anatomy study (Estudiar anatomía, a medic's activity) to learn it: in any camps, not in a row. */
export const ANATOMY_CAMPS = 3;
/** Platinum senbon a ninja who knows it brings to the backpack when a mission sets out. */
export const PLATINUM_POUCH = 3;
/** Platinum senbon the old doctor leaves with the party when he teaches. */
export const DOCTOR_PLATINUM = 3;

export const knowsSealNeedles = (c: Pick<ShinobiCharacter, 'abilities'> | undefined): boolean => !!c?.abilities?.includes(SEAL_NEEDLES);

export interface Learned {
  character: ShinobiCharacter;
  events: RuleEvent[];
}

/** The ninja learns Seal Needles (nothing changes if it knows it already). */
export function learnSealNeedles(c: ShinobiCharacter, how: string): Learned {
  if (knowsSealNeedles(c)) return { character: c, events: [] };
  return {
    character: { ...c, abilities: [...(c.abilities ?? []), SEAL_NEEDLES] },
    events: [{ type: 'note', text: `${c.name} learns Seal Needles (${how})` }],
  };
}

/**
 * A camp of anatomy study: one more of the ANATOMY_CAMPS; at the last one the ninja learns the
 * ability. A ninja who knows it already studies for nothing more.
 */
export function studyAnatomy(c: ShinobiCharacter): Learned {
  if (knowsSealNeedles(c)) return { character: c, events: [{ type: 'note', text: `${c.name} already knows Seal Needles` }] };
  const n = Math.min(ANATOMY_CAMPS, (c.anatomyStudy ?? 0) + 1);
  const studied: ShinobiCharacter = { ...c, anatomyStudy: n };
  const ev: RuleEvent = { type: 'note', text: `Anatomy studied: ${n} of ${ANATOMY_CAMPS} camps` };
  if (n < ANATOMY_CAMPS) return { character: studied, events: [ev] };
  const l = learnSealNeedles(studied, 'anatomy study');
  return { character: l.character, events: [ev, ...l.events] };
}

/** The backpack as a mission sets out: PLATINUM_POUCH platinum senbon for each member who knows the ability. */
export function withPlatinum<S extends { platinumSenbon: number }>(supplies: S, members: Pick<ShinobiCharacter, 'abilities'>[]): S {
  const n = members.filter(knowsSealNeedles).length * PLATINUM_POUCH;
  return n ? { ...supplies, platinumSenbon: supplies.platinumSenbon + n } : supplies;
}
