// The "Gem" dice take the caster's chakra colour. Their sheets (src/assets/ui_dice/gem_*.png, made by
// tools/ui/dice-d20.ts) are drawn in the KEY ramp, the gem ramp of DICE_GEM_KEY_TINT; the screen
// swaps every key colour for the same step of the caster's ramp. Any tint works: a chakra colour id
// or a '#rrggbb', through the same 5 tones the chakra effects use. Pure: no DOM.

import { chakraTones } from './chakra';
import { mixHex } from './color';

/** The tint the gem sheets are drawn in. */
export const DICE_GEM_KEY_TINT = 'blue';

/** The gem ramp for a tint: 0 the outline, then 1 (darkest facet) .. 8 (the core, the numbers). */
export function diceGemRamp(tint: string): string[] {
  const [p0, p1, p2, p3, p4] = chakraTones(tint);
  return [mixHex(p0, '#07060b', 0.6), p0, mixHex(p0, p1, 0.5), p1, mixHex(p1, p2, 0.5), p2, mixHex(p2, p3, 0.5), p3, p4];
}

/**
 * The key colours as drawn in the sheets: the key tint's ramp, each step nudged until it is unique
 * and differs from `reserved` (the colours the sheets use that never change: the gold of a natural
 * 20, the sparkle white). The generator passes the same reserved list it draws with.
 */
export function diceGemKeys(reserved: string[] = []): string[] {
  const taken = new Set(reserved.map((c) => c.toLowerCase()));
  return diceGemRamp(DICE_GEM_KEY_TINT).map((c) => {
    let k = c.toLowerCase();
    // Step the blue channel down (up at 0) until the key is free: the eye cannot see one step.
    for (let i = 1; taken.has(k); i++) {
      const n = parseInt(c.slice(1), 16);
      const b = n & 255;
      const nb = b - i >= 0 ? b - i : b + i;
      k = '#' + ((n & 0xffff00) | nb).toString(16).padStart(6, '0');
    }
    taken.add(k);
    return k;
  });
}
