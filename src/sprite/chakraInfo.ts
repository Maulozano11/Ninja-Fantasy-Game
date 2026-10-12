// Chakra colors offered in the creator, taken from the burst effects so the
// names always match what plays on screen.

import { CHAKRA_COLORS } from './chakra';
import type { ChakraColorId } from './types';

export interface ChakraChoice {
  id: ChakraColorId;
  name: string;
  hex: string;
  burst: string;
  desc: string;
}

export const CHAKRA_CHOICES: ChakraChoice[] = CHAKRA_COLORS.map((c) => ({ id: c.id, name: c.name, hex: c.hex, burst: c.burst, desc: c.desc }));
