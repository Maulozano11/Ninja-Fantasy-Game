// Lyra's hair, the owner's picture of her at our game scale, his pixels (tools/refs/lyra-hair-from-ref.py
// from docs/reference/lyra-game-scale-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';
import type { PaintedPart } from './capeArt';

/** One character per colour of his (all the pieces share them). */
export const LYRA_HAIR_COLORS: Record<string, string> = {
  k: '#010101',
  a: '#0e0408',
  b: '#190f18',
  c: '#2a0e1c',
  d: '#3b1023',
  e: '#4e1524',
  f: '#282834',
  g: '#5a1723',
  h: '#681d24',
  i: '#772523',
  j: '#454350',
  l: '#872e27',
  m: '#a33f27',
  n: '#b24325',
  o: '#d3673a',
  p: '#cb7862',
  q: '#c88530',
  r: '#da9a42',
  s: '#e2a545',
  t: '#ea987f',
  u: '#fec8a6',
};

/** Over the head (hairFront): crown, fringe, far lock, the back of the head, the pin, the bow and her ear. Its pivot is the cell on our face anchor. */
export const LYRA_HAIR_HEAD: PaintedPart = {
  pivot: [16, 12],
  rows: [
    '............kkkkkkkkkkk.......',
    '..........kkmmmmiddimmmkk.....',
    '.........kmommmmmmmdhhhmhk....',
    '........klmmmsmmmhhidddhmmk...',
    '........klimsdsmimmmmmmdmhik..',
    '.......kmiisciqdmmmddddmdoomk.',
    '.......kihdsssdmooddddddddmok.',
    '......kkednsdddmmod......ddok.',
    '......kmhhrdmdmmmd........dmmk',
    '....kkkddqdidmmhmd........ddmk',
    '..kkjfkdqdddmmhmd.........cdmk',
    '..kjfkkkkhmmmmmd..........kdhk',
    '...kkfkhdddddddd..........kdhk',
    '....kfkhdhdtpgmd..........kdhk',
    '...kjkhmdmduend...........khk.',
    '..kjjkhmdmmdmd............kc..',
    '...kknhmdnmgmd............kd..',
    '...kmhnmgdmhdhd............dd.',
    '.kknhhmmddghdmd...............',
    'kmkkdmmmddmmdld...............',
    '...knmmgdddhgemd..............',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Behind the body (hairBack): her wavy hair to the waist. Pivot on our face anchor; it turns with the torso (angle: our idle torso's). */
export const LYRA_HAIR_LONG: PaintedPiece = {
  pivot: [24, -2],
  angle: -89.5,
  rows: [
    '..............hmdmdden',
    '..............hmdmmdmd',
    '.............nhmdnmgmd',
    '...........kmhnmgdmhdh',
    '.........kknhhmmddghdm',
    '........kmkkdmmmddmmdl',
    '........nk.knmmgdddhge',
    '........k.kmmmnddddgmm',
    '........kknmgmhddddddg',
    '........mmhdnghdddddcm',
    '........khhnhghdddddcc',
    '.......hhhmgdghdddddcc',
    '......hdhnidkghddddegc',
    '.....idkmnhddghddddekc',
    '.....dkhmhddkggggddegc',
    '..kmmdkmmhdddggggddegc',
    '..kmmddmmhdddggggddegc',
    '..kmmhdmmhdddggggdeegc',
    '...kmmdmmhdddggggkeegc',
    '....kmhhmmdddgggkddegc',
    '....kmhhmmdddggggddegc',
    'k..kmmhhmmdddgggddddgc',
    'kkkmmhhhmmdddgggddddgc',
    '.kllhkhhmmdddgggddddac',
    '..kkkkhhmmdddgggdkddgc',
    '.....khhmmdddggddkhdgc',
    '.....khkmmdddghhdkhdgc',
    '......kkmmddkdhhddkdgc',
    '........kkdddddhhdhdgc',
    '..........kdddkhhdhdgc',
    '...........kkdkkhdhdgc',
    '............kk..kkkkkk',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** Over the near shoulder onto the chest (hairFront, behind the near arm): her braid. Pivot on our face anchor; it turns with the torso. */
export const LYRA_HAIR_BRAID: PaintedPiece = {
  pivot: [5, -10],
  angle: -89.5,
  rows: [
    'ddgdmd..',
    '.cmmhd..',
    '.cchdnb.',
    '.kcmmgb.',
    'egcbek..',
    '....kgk.',
    '....kbkk',
    '....dhnd',
    '....dmmd',
    '....dhmd',
    '....kdhk',
    '.....dd.',
  ],
  colors: LYRA_HAIR_COLORS,
};

/** His dark line: kept as he drew it when the hair is recoloured. */
export const LYRA_HAIR_LINE = 'kab';
/** The bow (its greys follow the ribbon colour) and the pin (its golds follow the ornament colour). */
export const LYRA_HAIR_BOW = 'fj';
export const LYRA_HAIR_PIN = 'qrs';
/** Her ear, in our skin ramp's shades. */
export const LYRA_HAIR_EAR: Record<string, number> = { p: 2, t: 2, u: 3 };
/** The colour slots' defaults: his mid auburn, the bow's grey, the pin's gold. */
export const LYRA_HAIR_BASE = '#a33f27';
export const LYRA_RIBBON_BASE = '#454350';
export const LYRA_PIN_BASE = '#e2a545';
