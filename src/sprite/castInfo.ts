// Names and descriptions of the cast styles for the creator, and how a
// character casts a given jutsu.

import type { CastStyle, SpriteAppearance } from './types';

export const CAST_STYLE_INFO: Record<CastStyle, { label: string; desc: string }> = {
  signs: { label: 'Hand Signs', desc: 'Weaves hand seals before the technique.' },
  runes: { label: 'Rune Palm', desc: 'An open palm with glowing runes turning before it.' },
  book: { label: 'Grimoire I', desc: 'Carries the open grimoire at the side and points at the target; an orb of the chakra\'s nature gathers before the finger.' },
  script: { label: 'Grimoire II', desc: 'Carries the open grimoire at the side and points at the target as great black letters of an ancient script appear before the caster.' },
  sphere: { label: 'Spiral Sphere', desc: 'A spinning sphere of chakra held out in one palm.' },
  lightning: { label: 'Lightning Hand', desc: 'Crackling lightning gathered in one hand, held low.' },
  wave: { label: 'Twin-Palm Wave', desc: 'Both palms cupped at the hip, charging a blast.' },
  flash: { label: 'Flash Charge', desc: 'Both arms thrust forward, charging a blinding flash.' },
  eye: { label: 'Ocular Surge', desc: 'The eyes blaze with chakra and energy surges off the face.' },
};

/** The character's default cast style ('runes' for older saves). */
export const defaultCastStyle = (look: SpriteAppearance): CastStyle => look.cast?.style ?? 'runes';

/** How the character casts this jutsu: its own style if set, else the default. */
export function castStyleFor(look: SpriteAppearance, jutsuId?: string): CastStyle {
  return (jutsuId && look.cast?.jutsu?.[jutsuId]) || defaultCastStyle(look);
}
