// Saya's ninja top, arm guards and fingerless gloves, the owner's pixels 1:1 (tools/refs/saya-upper-from-ref.py
// from docs/reference/saya-game-scale-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots recolour from (at these, every pixel is hers). */
export const SAYA_CLOTH = '#374061';
export const SAYA_TRIM = '#a73234';
export const SAYA_PLATE = '#ebe5d7';

/** Which slot recolours each of her colours (her line, the gold-brown rim and the strap stay). */
export const SAYA_KIND: Record<string, 'cloth' | 'trim' | 'plate'> = {
  '#222338': 'cloth',
  '#272c48': 'cloth',
  '#374061': 'cloth',
  '#373b49': 'cloth',
  '#3f1e30': 'trim',
  '#431527': 'trim',
  '#5f1a29': 'trim',
  '#6e212c': 'trim',
  '#6f2f32': 'trim',
  '#772930': 'trim',
  '#7e3232': 'trim',
  '#a73234': 'trim',
  '#b63133': 'trim',
  '#bfb2a7': 'plate',
  '#ebe5d7': 'plate',
};

/** The top: her plate, her navy and red pipings; under her scarf, hair and belts, filled. */
export const SAYA_TOP: PaintedPiece = {
  pivot: [11, -2],
  angle: -89.50,
  rows: [
    '...000000000000000.....',
    '....02ccccccccccc20....',
    '.....02ccccccccccc20...',
    '.....02ccccccccccc20...',
    '.....020000000000000...',
    '.....02kBMBMMMMMMMMM0..',
    '.....00nMMMMBBBBBMMMB0.',
    '....00kBMMMMMMMMMMMMM0.',
    '...020kBMMMMMMMMMMMMM0.',
    '..2020kBBMMMMMMMMMMMB0.',
    '..200d2BBBBBBkkkkkBBB0.',
    '..00a2b2BBBkk00000kBB0.',
    '..00222b2kk00229220k0..',
    '...0222ab0022cci2c20...',
    '....0dd0092eccci2cci0..',
    '....00022922icci2cii0..',
    '....0022c2ic2ici2i2i0..',
    '...0002222iccc2222ci0..',
    '..000022c2icccci2cc0...',
    '.0000222cc6iccci2ci0...',
    '.2cccccccccc2ici2icc2..',
    '2ccccccccccc2ici2ic22..',
    '2ccccccccccc2ici2ic2222',
    '2ccccccccccc2ici2ic2222',
    '2ccccccccccc2ici2ic2222',
    '2ccccccccccc2ici2ic2222',
    '2ccccccccccc2ici2ic2222',
    '2ccccccccccc2ici2ic2222',
    '0000000000000000000....',
    '....00000000000........',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '6': '#272c48',
    '9': '#6e212c',
    'a': '#6f2f32',
    'b': '#772930',
    'c': '#374061',
    'd': '#7e3232',
    'e': '#63483b',
    'i': '#a73234',
    'k': '#8e5b3a',
    'n': '#825e50',
    'B': '#bfb2a7',
    'M': '#ebe5d7',
  },
};

/** The near upper arm guard: navy, the red band slanting round it, red inside, the red elbow band. */
export const SAYA_UPPER_N: PaintedPiece = {
  pivot: [8, -3],
  angle: 107.97,
  rows: [
    '....0200...',
    '....06cc00.',
    '...0000ccc0',
    '...0iii00c.',
    '..000iii70.',
    '..02c00ii9.',
    '.006ccc099.',
    '09i00cc200.',
    '00iii0220..',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '6': '#272c48',
    '7': '#5f1a29',
    '9': '#6e212c',
    'c': '#374061',
    'i': '#a73234',
  },
};

/** The near forearm guard: the red at the elbow, navy with a red stripe, the red cuff. */
export const SAYA_FORE_N: PaintedPiece = {
  pivot: [6, 0],
  angle: 103.11,
  rows: [
    '..0200ii00',
    '.0000c0b90',
    '.09jj00090',
    '.0222ij000',
    '.02cccib0.',
    '.02ccci20.',
    '.02ccci20.',
    '.02cci280.',
    '02ccci20..',
    '02ccc420..',
    '0biii420..',
    '00000i90..',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '4': '#3f1e30',
    '8': '#373b49',
    '9': '#6e212c',
    'b': '#772930',
    'c': '#374061',
    'i': '#a73234',
    'j': '#b63133',
  },
};

/** The far upper arm guard: navy, the red band, the red elbow band. */
export const SAYA_UPPER_F: PaintedPiece = {
  pivot: [1, -4],
  angle: 77.78,
  rows: [
    '..0000..',
    '..0220..',
    '..00000.',
    '..09i90.',
    '.099000.',
    '.000220.',
    '.0222000',
    '.0000990',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '9': '#6e212c',
    'i': '#a73234',
  },
};

/** The far forearm guard: the red elbow band, navy with its red stripe outside, the red cuff. */
export const SAYA_FORE_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 59.54,
  rows: [
    '09bb0000....',
    '090022000...',
    '002200i20...',
    '.000ii220...',
    '.0022cci80..',
    '...022cci20.',
    '...0222c2i0.',
    '....022ii00.',
    '....0bb00620',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '6': '#272c48',
    '8': '#373b49',
    '9': '#6e212c',
    'b': '#772930',
    'c': '#374061',
    'i': '#a73234',
  },
};

/**
 * The gloves, per hand: from `from` fine pixels along the hand (from the middle of the hand
 * picture's wrist cell toward the fingers) each zone takes over; `null` leaves the fingers bare.
 */
export const SAYA_GLOVE_ZONES: Record<'N' | 'F', [number, 'strap' | 'back' | 'band' | null][]> = {
  N: [[0.5, 'strap'], [1.5, 'back'], [5.5, 'band'], [6.5, null]],
  F: [[0.5, 'strap'], [2.5, 'back'], [4.5, null]],
};

/** Her tones for our hand pictures' shades (line, crease, shadow, base, light), per zone and side. */
export const SAYA_GLOVE_TONES = {
  strapN: ['#020102', '#020102', '#3e2b25', '#3e2b25', '#63483b'],
  backN: ['#020102', '#222338', '#272c48', '#374061', '#374061'],
  bandN: ['#020102', '#5f1a29', '#6e212c', '#a73234', '#b63133'],
  strapF: ['#020102', '#3e2b25', '#3e2b25', '#63483b', '#7b513c'],
  backF: ['#020102', '#5f1a29', '#6e212c', '#6f2f32', '#a73234'],
} as const;
