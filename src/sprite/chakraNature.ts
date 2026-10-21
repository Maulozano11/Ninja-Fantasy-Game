// Chakra types: the nature each chakra burst stands for, and the types the creator offers.
//
// The owner (2026-10-21): the elemental nature is the chakra type the player picks. A fire-type
// chakra is Fire whatever its colour; the electric one is Lightning. So the type is the burst
// (`ChakraChoice.color`, an id), the colour is only a look (`ChakraChoice.tint`), and the nature is
// read from the burst alone. Pure data, no drawing: the rules read it (rules/ninja.ts, natureOf).

import type { ChakraNature } from '../types/shinobi';
import type { ChakraChoice, ChakraColorId } from './types';

/** The nature each burst stands for. Every burst belongs to exactly one type. */
export const BURST_NATURE: Record<ChakraColorId, ChakraNature> = {
  red: 'Fire', // Pyre Crown: flames
  orange: 'Fire', // Cinder Nova: embers and a fiery shockwave
  yellow: 'Lightning', // Storm Lash: bolts
  green: 'Wind', // Leafwind Spiral: a whirlwind of wind and leaves
  blue: 'Water', // Rising Tide: rings of water
  indigo: 'Shadow', // Nightveil Mist: shadow smoke
  violet: 'Spirit', // Spectral Guardian: a ghost warrior
  white: 'Light', // Heaven Pillar: a pillar of light
  black: 'Void', // Abyss Orbit: void orbs, cracking space
  brown: 'Earth', // Shattered Earth: cracked ground, rocks tearing loose
  cyan: 'Lightning', // Living Sparks: now and then small bolts on and around the body, no glow
};

export interface ChakraType {
  nature: ChakraNature;
  /** One of the five elements, or a type that is no element. */
  elemental: boolean;
  /** Its bursts; the first is the one a player gets on picking the type. */
  bursts: ChakraColorId[];
}

/** The types in the order the creator shows them: the elements, then the others. */
export const CHAKRA_TYPES: ChakraType[] = [
  { nature: 'Fire', elemental: true, bursts: ['red', 'orange'] },
  { nature: 'Water', elemental: true, bursts: ['blue'] },
  { nature: 'Wind', elemental: true, bursts: ['green'] },
  { nature: 'Lightning', elemental: true, bursts: ['yellow', 'cyan'] },
  { nature: 'Earth', elemental: true, bursts: ['brown'] },
  { nature: 'Shadow', elemental: false, bursts: ['indigo'] },
  { nature: 'Spirit', elemental: false, bursts: ['violet'] },
  { nature: 'Light', elemental: false, bursts: ['white'] },
  { nature: 'Void', elemental: false, bursts: ['black'] },
];

/**
 * A chakra's type: its burst's nature. The colour (tint) plays no part. A burst the game does not
 * know is drawn as the water burst (sprite/chakra.ts), so it reads as Water.
 */
export function chakraNature(chakra: Pick<ChakraChoice, 'color'>): ChakraNature {
  return Object.hasOwn(BURST_NATURE, chakra.color) ? BURST_NATURE[chakra.color] : 'Water';
}

/** The type of a nature (Water's for a nature with no type yet). */
export function chakraType(nature: ChakraNature): ChakraType {
  return CHAKRA_TYPES.find((t) => t.nature === nature) ?? CHAKRA_TYPES.find((t) => t.nature === 'Water')!;
}

/**
 * The chakra turned to another type: the type's first burst, unless its burst already is of that
 * type. The colour and the when-to-show switches stay as they are.
 */
export function withNature(chakra: ChakraChoice, nature: ChakraNature): ChakraChoice {
  const t = chakraType(nature);
  return t.bursts.includes(chakra.color) ? chakra : { ...chakra, color: t.bursts[0] };
}
