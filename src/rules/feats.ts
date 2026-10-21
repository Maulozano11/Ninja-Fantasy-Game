// What a feat asks of a ninja before it may take it, and Triple Nature's chakra discount
// (docs/GAMEPLAY_DESIGN.md, "The ladder").
//
// The owner (2026-10-21, later), choosing the third-element feat: "feat del tercer elemento opcion a".
// Option A, "Tres naturalezas" / "Triple Nature": level 9 and a second element already chosen at level
// 5; it gives a third element (rules/natureGrowth.ts), and once per long rest a jutsu of one of the
// ninja's elements costs 1 chakra less when the previous jutsu it cast that battle was of another of its
// elements. The other feats ask for nothing. Pure data, no React.

import { SHINOBI_FEATS } from '../data/shinobiData';
import type { ChakraNature, ShinobiCharacter, ShinobiFeat } from '../types/shinobi';
import { fitThirdElement, hasSecondElement } from './natureGrowth';

/** What a feat may ask for: a level, a second element. */
export type FeatNeed = 'level' | 'secondElement';

type Sheet = Pick<ShinobiCharacter, 'level' | 'selectedFeats'> & Partial<Pick<ShinobiCharacter, 'natureGrowth' | 'extraNatures'>>;

/** What the ninja still lacks for the feat (empty when it may take it). */
export function featNeeds(f: Pick<ShinobiFeat, 'requires'>, c: Sheet): FeatNeed[] {
  const r = f.requires;
  if (!r) return [];
  const out: FeatNeed[] = [];
  if (r.level !== undefined && c.level < r.level) out.push('level');
  if (r.secondElement && !hasSecondElement(c)) out.push('secondElement');
  return out;
}

/** The ninja may take the feat: it meets what the feat asks for. */
export const featOpen = (f: Pick<ShinobiFeat, 'requires'>, c: Sheet): boolean => featNeeds(f, c).length === 0;

/**
 * The sheet without the feats it no longer meets the requirements of (a ninja that leaves its second
 * element for the higher rank loses Triple Nature), and with its third element as its feat says
 * (rules/natureGrowth.ts `fitThirdElement`). The same sheet when nothing changes. Unknown feat ids stay.
 */
export function keepEarnedFeats<C extends Sheet>(c: C, nature: ChakraNature): C {
  const feats = c.selectedFeats.filter((id) => {
    const f = SHINOBI_FEATS.find((x) => x.id === id);
    return !f || featOpen(f, c);
  });
  const next = feats.length === c.selectedFeats.length ? c : { ...c, selectedFeats: feats };
  return fitThirdElement(next, nature);
}

/** Triple Nature's discount, in chakra. */
export const TRIPLE_NATURE_DISCOUNT = 1;

/**
 * Triple Nature's discount on a jutsu of `nature` for a ninja of `natures` (its elements) whose previous
 * jutsu this battle was of `previous`: 1 chakra when both are its elements and not the same one, and the
 * discount is not `spent` since the last long rest; else 0.
 */
export function tripleNatureDiscount(natures: readonly string[], spent: boolean, previous: string | undefined, nature: string | undefined): number {
  if (spent || !previous || !nature || previous === nature) return 0;
  return natures.includes(previous) && natures.includes(nature) ? TRIPLE_NATURE_DISCOUNT : 0;
}
