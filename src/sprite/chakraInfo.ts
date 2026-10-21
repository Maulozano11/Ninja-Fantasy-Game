// Chakra bursts and colors offered in the creator, taken from the burst effects so the names always
// match what plays on screen. Each burst is of one chakra type (its nature: chakraNature.ts); each
// burst's natural color is also offered as a color for any type.

import type { ChakraNature } from '../types/shinobi';
import { CHAKRA_COLORS } from './chakra';
import { BURST_NATURE } from './chakraNature';
import type { ChakraColorId, ChakraChoice as ChakraSetting } from './types';

export interface ChakraChoice {
  id: ChakraColorId;
  /** The natural color's name. */
  name: string;
  hex: string;
  burst: string;
  /** What the burst shows (the cast effects' key). */
  motif: string;
  /** The burst's type: the ninja's nature in the rules. */
  nature: ChakraNature;
  desc: string;
}

export const CHAKRA_CHOICES: ChakraChoice[] = CHAKRA_COLORS.map((c) => ({
  id: c.id,
  name: c.name,
  hex: c.hex,
  burst: c.burst,
  motif: c.motif,
  nature: BURST_NATURE[c.id],
  desc: c.desc,
}));

/** The color a character's chakra shows: its tint (a chakra color or any hex), else the burst's own color. */
export function chakraHex(chakra: Pick<ChakraSetting, 'color' | 'tint'>): string {
  const t = chakra.tint;
  if (t) return CHAKRA_CHOICES.find((c) => c.id === t)?.hex ?? t;
  return CHAKRA_CHOICES.find((c) => c.id === chakra.color)?.hex ?? '#36a0f0';
}
