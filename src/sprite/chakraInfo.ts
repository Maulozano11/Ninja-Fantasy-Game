// Chakra colors offered in the creator, taken from the burst effects so the
// names always match what plays on screen.

import { CHAKRA_COLORS } from './chakra';
import type { ChakraColorId, ChakraChoice as ChakraSetting } from './types';

export interface ChakraChoice {
  id: ChakraColorId;
  name: string;
  hex: string;
  burst: string;
  nature: string;
  desc: string;
}

export const CHAKRA_CHOICES: ChakraChoice[] = CHAKRA_COLORS.map((c) => ({
  id: c.id,
  name: c.name,
  hex: c.hex,
  burst: c.burst,
  nature: c.nature,
  desc: c.desc,
}));

/** The color a character's chakra shows: its tint (a chakra color or any hex), else the burst's own color. */
export function chakraHex(chakra: Pick<ChakraSetting, 'color' | 'tint'>): string {
  const t = chakra.tint;
  if (t) return CHAKRA_CHOICES.find((c) => c.id === t)?.hex ?? t;
  return CHAKRA_CHOICES.find((c) => c.id === chakra.color)?.hex ?? '#36a0f0';
}
