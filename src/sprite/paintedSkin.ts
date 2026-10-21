// Skin colours the owner painted with their own shades. With one of these as the skin, the body is
// shaded in his picture's six shades (line, dark, shadow, base, light, highlight) instead of the ramp
// color.ts works out from the base; any other skin tone keeps the worked-out ramp.

import { AZURE_SKIN, AZURE_SKIN_RAMP } from './eliseEyeArt';

/** Painted skin ramps by their base colour (lower case hex). */
export const PAINTED_SKIN_RAMPS: Record<string, readonly string[]> = {
  // Elise (the owner's second heroine): her skin and its rose shadows.
  [AZURE_SKIN]: AZURE_SKIN_RAMP,
};

/** The painted ramp for a skin colour, if he painted one. */
export const paintedSkinRamp = (hex: string): readonly string[] | undefined => PAINTED_SKIN_RAMPS[hex.toLowerCase()];
