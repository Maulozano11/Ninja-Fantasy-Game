// Saya's pleated skirt, belts with the pouch, and scabbard: the owner's pixels 1:1 from his Saya at our
// scale, her scabbard from her big picture (tools/refs/saya-lower-from-ref.py from
// docs/reference/saya-game-scale-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots recolour from (at these, every pixel is hers). */
export const SHADE_BASE = {
  cloth: '#374061',
  stripe: '#a73234',
  leather: '#63483b',
  steel: '#b2b5ba',
  scabbard: '#1d1d32',
  gold: '#c48e42',
} as const;

/** Which slot recolours each of her colours (her black line stays). */
export const SHADE_KIND: Record<string, keyof typeof SHADE_BASE> = {
  '#222338': 'cloth',
  '#272c48': 'cloth',
  '#374061': 'cloth',
  '#373b49': 'cloth',
  '#3f1e30': 'stripe',
  '#431527': 'stripe',
  '#5f1a29': 'stripe',
  '#6e212c': 'stripe',
  '#6f2f32': 'stripe',
  '#772930': 'stripe',
  '#7e3232': 'stripe',
  '#a73234': 'stripe',
  '#b63133': 'stripe',
  '#3e2b25': 'leather',
  '#63483b': 'leather',
  '#6f727d': 'steel',
  '#9899a2': 'steel',
  '#b2b5ba': 'steel',
  '#1d1d32': 'scabbard',
  '#343545': 'scabbard',
  '#9d6e44': 'gold',
  '#c48e42': 'gold',
  '#c69151': 'gold',
};

/** The skirt: her navy pleats, red stripes and red hem; the top under her belts and the near-left pleat filled. */
export const SHADE_SKIRT: PaintedPiece = {
  pivot: [14, -5],
  angle: -98.05,
  rows: [
    '..................22..........',
    '.002222222222222222c220000620.',
    '.0000022cc9b0092c2ccc2900i2c0.',
    '.002c002cc9b00icc2ccc2i00i2c0.',
    '.02cc02ccci020icc2ccc2i00i2c0.',
    '.02c002ccii020icc2ccc2ci00icc0',
    '.0iii000ci0220icc2ccc2ci00icc0',
    '..000000000000jcc2ccc2ci0.0ic0',
    '............000ii9iii9i0..0ii0',
    '..............000000000....000',
  ],
  colors: {
    '0': '#020102',
    '2': '#222338',
    '6': '#272c48',
    '9': '#6e212c',
    'b': '#772930',
    'c': '#374061',
    'i': '#a73234',
    'j': '#b63133',
  },
};

/** The belts: two slung brown belts with steel buckles and the pouch on the near hip. */
export const SHADE_BELTS: PaintedPiece = {
  pivot: [13, 3],
  angle: -98.05,
  rows: [
    '...00055000..........050..',
    '..0000555ee000......05500.',
    '.05550055eeeCe00...0ew500.',
    '0eeeeee0000eqeee000eew0.0.',
    '0eeeeeeeee000ee5CCe0e00..0',
    '00000weew5000005Ceee00...0',
    '...0505ee05500e005e5C5000.',
    '..00550005e50eee5005q55e0.',
    '....00555ee50e000..0055e0.',
    '.....0055e5500............',
    '......0000000.............',
  ],
  colors: {
    '0': '#020102',
    '5': '#3e2b25',
    'e': '#63483b',
    'q': '#6f727d',
    'w': '#9899a2',
    'C': '#b2b5ba',
  },
};

/** The scabbard: black-navy, lit along its upper side, a gold chape at the tip and a gold throat ring. */
export const SHADE_SCABBARD: PaintedPiece = {
  pivot: [29, -7],
  angle: -98.05,
  rows: [
    '......................0000..',
    '.....................0efg0..',
    '....................0efg0...',
    '...................0RTT0....',
    '..................0RTT0.....',
    '.................0RTT0......',
    '................0RTT0.......',
    '...............0RTT0........',
    '..............0RTT0.........',
    '.............0RTT0..........',
    '............0RTT0...........',
    '...........0RTT0............',
    '..........0RTT0.............',
    '.........0RTT0..............',
    '........0RTT0...............',
    '.......0RTT0................',
    '......0RTT0.................',
    '.....0RTT0..................',
    '....0RTT0...................',
    '...0eTT0....................',
    '..0fgg0.....................',
    '..0gg0......................',
    '..000.......................',
  ],
  colors: {
    '0': '#02010d',
    'R': '#343545',
    'T': '#1d1d32',
    'e': '#c69151',
    'f': '#c48e42',
    'g': '#9d6e44',
  },
};
