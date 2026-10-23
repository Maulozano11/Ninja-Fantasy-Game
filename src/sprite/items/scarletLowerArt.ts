// The owner's Scarlet's pinstripe trousers and noble belt in his colours, the belt's ornaments as
// the reduced reference has them (tools/refs/scarlet-lower-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line. */
export const PIN_LINE = '#040405';
/** The colours the trousers' slots recolour from (at these, every pixel is his): his lit cloth and his lit stripe. */
export const PIN_CLOTH = '#252328';
export const PIN_STRIPE = '#39383c';
/** His trousers by the tone our cloth light gives a pixel (0 darkest .. 5 a fold's lit crest): the cloth, and his stripes on it. */
export const PIN_CLOTH_TONES = ['#111014', '#111014', '#111014', '#1a191e', '#252328', '#39383c'] as const;
export const PIN_STRIPE_TONES = ['#111014', '#1a191e', '#252328', '#2e2d33', '#39383c', '#504e52'] as const;
/** Fine pixels from one stripe to the next across a leg (his are 2 of his pixels apart, about one of ours). */
export const PIN_GAP = 3;

/** The colours the belt's slots recolour from: his strap, his gold and his tassel's red. */
export const BELT_LEATHER = '#111014';
export const BELT_GOLD = '#a8865d';
export const BELT_RED = '#84141f';
/** His belt by tone (0 darkest .. 5 the sheen beside the buckle). */
export const BELT_TONES = ['#111014', '#111014', '#111014', '#211a24', '#39383c', '#504e52'] as const;
/** What each colour of the ornaments is: his gold, his tassel's red, his strap (seen through the buckle) or his black line. */
export const BELT_KIND: Record<string, 'gold' | 'red' | 'leather' | 'line'> = {
  '#040405': 'line',
  '#4e3c2b': 'gold',
  '#7c1e2c': 'red',
  '#84141f': 'red',
  '#846542': 'gold',
  '#947650': 'gold',
  '#9e3b41': 'red',
  '#a8865d': 'gold',
};

/**
 * Where each ornament is tied on (its pivot), in the torso's frame: design units from the pelvis along
 * rig.right and rig.up, as on our male at idle frame 0 (his torso leaning -2 degrees). Each is
 * stamped upright there, the cross and the tassel hanging straight down.
 */
export const BELT_AT = {
  buckle: [1.3080, 1.6403],
  cross: [-0.2434, 0.1936],
  tassel: [3.7367, -0.4457],
  star: [-2.3818, -3.7342],
} as const;

/** His ring buckle on the front of the belt, its dark hole inside. */
export const BELT_BUCKLE: PaintedPiece = {
  pivot: [1, 1],
  angle: 0.00,
  rows: [
    'JSSJ',
    'SaaO',
    'OaaJ',
    'JOOv',
  ],
  colors: {
    a: '#040405',
    v: '#4e3c2b',
    J: '#846542',
    O: '#947650',
    S: '#a8865d',
  },
};

/** His gold cross hanging from the belt over the near thigh: a small cross on the big one, the long stem. */
export const BELT_CROSS: PaintedPiece = {
  pivot: [2, 0],
  angle: 0.00,
  rows: [
    '..J..',
    '..S..',
    '.JSJ.',
    'JaSaJ',
    '.JSJ.',
    '..S..',
    '..J..',
    '..v..',
  ],
  colors: {
    a: '#040405',
    v: '#4e3c2b',
    J: '#846542',
    S: '#a8865d',
  },
};

/** His far gold knot and the red tassel under it. */
export const BELT_CORD: PaintedPiece = {
  pivot: [0, 0],
  angle: 0.00,
  rows: [
    'J',
    'u',
    's',
    'D',
    'D',
    's',
  ],
  colors: {
    s: '#84141f',
    u: '#7c1e2c',
    D: '#9e3b41',
    J: '#846542',
  },
};

/** His small gold star hanging just inside the coat's near edge. */
export const BELT_STAR: PaintedPiece = {
  pivot: [0, 0],
  angle: 0.00,
  rows: [
    'JS',
    'SJ',
  ],
  colors: {
    J: '#846542',
    S: '#a8865d',
  },
};
