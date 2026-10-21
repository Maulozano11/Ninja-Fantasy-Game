// The trousers' 'boots' part, the owner's choice (2026-10-21): "con opcion de que las botas se escondan
// adentro del pantalon o que las botas vayan por fuera". compose.ts tucks the boots in.

import type { PartSlot } from '../ctx';

/**
 * Boots worn inside the trousers (their hems fall over the boot tops) or outside them (the boot tops
 * drawn over the trouser legs); `first` is the item's default.
 */
export const BOOTS_PART = (first: 'tucked' | 'out'): PartSlot => {
  const tucked = { id: 'tucked', label: 'Inside', desc: 'The boots go inside the trousers: the hems fall over the boot tops.' };
  const out = { id: 'out', label: 'Outside', desc: 'The boots go outside: the boot tops are drawn over the trouser legs.' };
  return { key: 'boots', label: 'Boots', options: first === 'tucked' ? [tucked, out] : [out, tucked] };
};
