// Saya's ninja top, arm guards and fingerless gloves (tools/refs/saya-upper-from-ref.py from
// docs/reference/saya-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the colour slots recolour from (at these, every pixel is hers). */
export const SAYA_CLOTH = '#314161';
export const SAYA_TRIM = '#ad333f';
export const SAYA_PLATE = '#eae3cb';

/** Which slot recolours each of her colours (her line, her gold and the brown strap stay). */
export const SAYA_KIND: Record<string, 'cloth' | 'trim' | 'plate'> = {
  '#1d1d32': 'cloth',
  '#1f2241': 'cloth',
  '#2e3e5d': 'cloth',
  '#314161': 'cloth',
  '#3f5177': 'cloth',
  '#647299': 'cloth',
  '#4b0f30': 'trim',
  '#6e1c38': 'trim',
  '#7c1d36': 'trim',
  '#842b3c': 'trim',
  '#ad333f': 'trim',
  '#bb2e3e': 'trim',
  '#eae3cb': 'plate',
  '#c1b3a1': 'plate',
  '#a8927c': 'plate',
  '#8d7768': 'plate',
  '#fbe499': 'plate',
  '#feeeb5': 'plate',
  '#c9a880': 'plate',
};

/** The top: high navy collar, the cream plate with its rims, the red piping and the straps; rides the torso about the neck. */
export const SAYA_TOP: PaintedPiece = {
  pivot: [12, -1],
  angle: -89.50,
  rows: [
    '....kkkkkkkkkkkkkk.......',
    '....kEeeXXXXXuuuUk.......',
    '....kEeeXXXXXXuuuUk......',
    '....kreeekkkkkekkkkk.....',
    '....kreekYYWWDkDWWDk.....',
    '....kreekWYcccDcccck.....',
    '....kreekcYccccccccck....',
    '....kreekcccccccccccLk...',
    '...kreeekccccccccccLLk...',
    '...kreeekLccccccccLLLk...',
    '..kreeeekLLLccLLLLLLwwk..',
    '..kreeeekkyGGGGGGGGGjjk..',
    '..kreeeeekkkkkkkkkkkkkk..',
    '...kreeXXXqXXeeXquuuUk...',
    '....kreeXXqXeeXXquuUk....',
    '.....kreXXqXeXXXqUk......',
    '.....kreXXjXXXXujk.......',
    '.....kreXXoXXXXuok.......',
    '....kreeXXqXXXXuqUk......',
    '...kreeXXXqXeXXuquUk.....',
    '..kreeeXXXqXeeXuquuUk....',
    '..kreeeXXXqXXeXuquuuUk...',
    '.kreeeeXXXqXXXXuquuuUk...',
    'kkkkkkkkkkkkkkkkkkkkkkkk.',
  ],
  colors: {
    k: '#02010d',
    U: '#1d1d32',
    u: '#1f2241',
    X: '#2e3e5d',
    e: '#314161',
    E: '#3f5177',
    q: '#6e1c38',
    r: '#ad333f',
    c: '#eae3cb',
    L: '#c1b3a1',
    D: '#a8927c',
    w: '#8d7768',
    W: '#fbe499',
    Y: '#feeeb5',
    G: '#e6c486',
    y: '#f6d886',
    j: '#e8ba58',
    o: '#c48e42',
  },
};

/** The near upper arm guard: red top edge, navy, the red elbow band; rides the upper arm about the shoulder. */
export const SAYA_UPPER_N: PaintedPiece = {
  pivot: [7, -3],
  angle: 107.97,
  rows: [
    '..kkkkkkkkkk',
    '..kRRrrrrqk.',
    '.kEMMEeeXuk.',
    '.kEMMEeeXk..',
    '.kEMMEeeXk..',
    '.kEMEEeeXk..',
    'kEMMEeeXk...',
    'kRRrrrrqk...',
    'kkkkkkkkk...',
  ],
  colors: {
    k: '#02010d',
    u: '#1f2241',
    X: '#2e3e5d',
    e: '#314161',
    E: '#3f5177',
    M: '#647299',
    q: '#6e1c38',
    r: '#ad333f',
    R: '#bb2e3e',
  },
};

/** The near forearm guard: navy outside, a red stripe, maroon inside, the red cuff; rides the forearm about the elbow. */
export const SAYA_FORE_N: PaintedPiece = {
  pivot: [5, 2],
  angle: 103.11,
  rows: [
    '..kEMeXrqk..',
    '..kEMeXrqk..',
    '.kEMeXrqqk..',
    '.kEMeXrqqk..',
    '.kEMeXrqqk..',
    '.kEMeXrqQk..',
    '.kEMeXrqk...',
    'kEMeeXrqk...',
    'kEMeXrqk....',
    'kEMeXrqk....',
    'kRRrrrqk....',
    'kkkkkkkk....',
  ],
  colors: {
    k: '#02010d',
    X: '#2e3e5d',
    e: '#314161',
    E: '#3f5177',
    M: '#647299',
    Q: '#4b0f30',
    q: '#6e1c38',
    r: '#ad333f',
    R: '#bb2e3e',
  },
};

/** The far upper arm guard, in the far side's darker navy; rides the upper arm about the shoulder. */
export const SAYA_UPPER_F: PaintedPiece = {
  pivot: [3, -3],
  angle: 77.78,
  rows: [
    '.kkkkkkkk..',
    'kRrrrqqQk..',
    'kEeeXXuUk..',
    'kEeeXXuUk..',
    '.kEeeXXuUk.',
    '.kEeeXXuUk.',
    '.kEeeXXuUk.',
    '.kRrrrqqQk.',
    '.kkkkkkkkk.',
  ],
  colors: {
    k: '#02010d',
    U: '#1d1d32',
    u: '#1f2241',
    X: '#2e3e5d',
    e: '#314161',
    E: '#3f5177',
    Q: '#4b0f30',
    q: '#6e1c38',
    r: '#ad333f',
    R: '#bb2e3e',
  },
};

/** The far forearm guard: maroon inside (toward the body), the red stripe, navy outside, the red cuff; rides the forearm about the elbow. */
export const SAYA_FORE_F: PaintedPiece = {
  pivot: [5, 1],
  angle: 59.54,
  rows: [
    'kqqreXXuk......',
    '.kqqreXXuk.....',
    '.kqqreXXuk.....',
    '..kqqreXXuk....',
    '..kqqreXXuk....',
    '...kqqreXXuk...',
    '....kqreXXuk...',
    '....kqqreXXuk..',
    '.....kqreXXuk..',
    '......kqreXXuk.',
    '......krrrrqqk.',
    '.......kkkkkkk.',
  ],
  colors: {
    k: '#02010d',
    u: '#1f2241',
    X: '#2e3e5d',
    e: '#314161',
    q: '#6e1c38',
    r: '#ad333f',
  },
};

/**
 * The gloves: from `from` fine pixels along the hand (from the middle of the hand picture's wrist
 * cell toward the fingers) each zone takes over; `null` leaves the fingers bare.
 */
export const SAYA_GLOVE_ZONES: [number, 'strap' | 'back' | 'band' | null][] = [
  [-0.5, 'strap'],
  [0.5, 'back'],
  [2.5, 'band'],
  [3.5, null],
];

/** Her tones for our hand pictures' shades (line, crease, shadow, base, light), per zone and side. */
export const SAYA_GLOVE_TONES = {
  strap: ['#02010d', '#302525', '#453631', '#534239', '#604f46'],
  backN: ['#02010d', '#1f2241', '#2e3e5d', '#314161', '#3f5177'],
  bandN: ['#02010d', '#4b0f30', '#6e1c38', '#ad333f', '#bb2e3e'],
  backF: ['#02010d', '#4b0f30', '#6e1c38', '#7c1d36', '#842b3c'],
  bandF: ['#02010d', '#4b0f30', '#6e1c38', '#ad333f', '#ad333f'],
} as const;
