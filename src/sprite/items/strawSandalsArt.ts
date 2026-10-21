// The owner's sandals on his Joven salvaje, his pixels (tools/refs/youth-sandals-from-ref.py from
// docs/reference/joven-salvaje-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const STRAW_SANDAL_STRAPS = '#181621';

/** His sole's colour (the Sole colour recolours the sole pieces from it). */
export const STRAW_SANDAL_SOLE = '#191822';

/** Which colour slot recolours each of his colours ('line': his black line, which stays as he drew it; 'skin': the character's skin). */
export const STRAW_SANDAL_SLOT: Record<string, 'line' | 'main' | 'skin'> = {
  '#000000': 'line',
  '#010101': 'line',
  '#020303': 'line',
  '#030303': 'line',
  '#040304': 'line',
  '#050303': 'line',
  '#0b0102': 'line',
  '#0f0d12': 'line',
  '#16141f': 'main',
  '#161420': 'main',
  '#170c0f': 'line',
  '#171420': 'main',
  '#181621': 'main',
  '#191723': 'main',
  '#191823': 'main',
  '#1a1822': 'main',
  '#24212f': 'main',
  '#250c0f': 'line',
  '#2a0e11': 'skin',
  '#2a2835': 'main',
  '#2b2936': 'main',
  '#2d2c39': 'main',
  '#2e2c39': 'main',
  '#2f2c39': 'main',
  '#2f2d3b': 'main',
  '#353340': 'main',
  '#843c3c': 'skin',
  '#9c4e4a': 'skin',
  '#b26357': 'skin',
  '#c16e5c': 'skin',
  '#c36b58': 'skin',
  '#c47360': 'skin',
  '#c5715d': 'skin',
  '#c77161': 'skin',
  '#c97762': 'skin',
  '#cb7761': 'skin',
  '#cd7f6a': 'skin',
  '#d38068': 'skin',
  '#da8f74': 'skin',
  '#e6a685': 'skin',
  '#eaaa85': 'skin',
  '#ebb08b': 'skin',
  '#ecb08b': 'skin',
  '#ecb28d': 'skin',
  '#edae89': 'skin',
  '#eeb48f': 'skin',
  '#efb691': 'skin',
  '#f1b791': 'skin',
  '#f3bc96': 'skin',
  '#f3c09b': 'skin',
  '#f6c7a6': 'skin',
  '#f6c8a6': 'skin',
  '#f7c4a4': 'skin',
  '#f7c6a2': 'skin',
};

/** Where each piece's first row's first cell lands in our male idle frame 0, unturned. */
export const STRAW_SANDAL_REST: Record<string, [number, number]> = {
  STRAW_SANDAL_STRAP_N: [114, 206],
  STRAW_SANDAL_FOOT_N: [112, 209],
  STRAW_SANDAL_SOLE_N: [113, 217],
  STRAW_SANDAL_STRAP_F: [132, 201],
  STRAW_SANDAL_FOOT_F: [132, 204],
  STRAW_SANDAL_SOLE_F: [136, 209],
};

/** The near ankle straps; they turn with the shin about the ankle. */
export const STRAW_SANDAL_STRAP_N: PaintedPiece = {
  pivot: [4, 1],
  angle: 104.09,
  rows: [
    '.abba....',
    '.acccaaaa',
    '.adefehda',
    'addddddda',
  ],
  colors: {
    a: '#000000',
    b: '#040304',
    c: '#2a2835',
    d: '#181621',
    e: '#ecb28d',
    f: '#edae89',
    h: '#b26357',
  },
};

/** The near foot: straps over the bare toes, his line round them; flat on the ground. */
export const STRAW_SANDAL_FOOT_N: PaintedPiece = {
  pivot: [6, -2],
  angle: 0.00,
  rows: [
    '..abbbbbbba',
    '.acbbdebba.',
    '.afebbbhba.',
    'acdbbbbbia.',
    'abbjjjjbba.',
    'abbbbbbhba.',
    'akllmlnbba.',
    'amplqlrmsa.',
    'a........a.',
    'aaaaaaaaaa.',
  ],
  colors: {
    a: '#030303',
    b: '#181621',
    c: '#2a0e11',
    d: '#eaaa85',
    e: '#ebb08b',
    f: '#250c0f',
    h: '#2f2c39',
    i: '#eeb48f',
    j: '#2b2936',
    k: '#c77161',
    l: '#f6c7a6',
    m: '#f7c6a2',
    n: '#da8f74',
    p: '#c36b58',
    q: '#c5715d',
    r: '#c16e5c',
    s: '#cb7761',
  },
};

/** The near sole, drawn with the foot in the Sole colour. */
export const STRAW_SANDAL_SOLE_N: PaintedPiece = {
  pivot: [5, -10],
  angle: 0.00,
  rows: [
    'abbbbbaa',
  ],
  colors: {
    a: '#191823',
    b: '#2e2c39',
  },
};

/** The far ankle straps; they turn with the shin about the ankle. */
export const STRAW_SANDAL_STRAP_F: PaintedPiece = {
  pivot: [3, 2],
  angle: 98.58,
  rows: [
    '.abaabbc...',
    '.defhija...',
    'bjkjjljja..',
    'ajmmmjnnjab',
  ],
  colors: {
    a: '#050303',
    b: '#010101',
    c: '#170c0f',
    d: '#0b0102',
    e: '#843c3c',
    f: '#0f0d12',
    h: '#353340',
    i: '#24212f',
    j: '#191723',
    k: '#16141f',
    l: '#efb691',
    m: '#ecb08b',
    n: '#2f2d3b',
  },
};

/** The far foot: straps over the bare toes, his line round them; flat on the ground. */
export const STRAW_SANDAL_FOOT_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 0.00,
  rows: [
    'abcccbddbaa....',
    'abbcedbffeea...',
    'acbbdbhibdbbaa.',
    'abjbbffbdbklmna',
    'abbebbhbepqfrma',
    'aaaa..........a',
    '....aaaaaaaaaaa',
  ],
  colors: {
    a: '#020303',
    b: '#1a1822',
    c: '#ecb08b',
    d: '#2f2d3b',
    e: '#171420',
    f: '#f3c09b',
    h: '#f1b791',
    i: '#f3bc96',
    j: '#c97762',
    k: '#9c4e4a',
    l: '#d38068',
    m: '#f7c4a4',
    n: '#cd7f6a',
    p: '#e6a685',
    q: '#f6c8a6',
    r: '#c47360',
  },
};

/** The far sole, drawn with the foot in the Sole colour. */
export const STRAW_SANDAL_SOLE_F: PaintedPiece = {
  pivot: [-1, -6],
  angle: 0.00,
  rows: [
    'aabaabacab',
  ],
  colors: {
    a: '#1a1822',
    b: '#161420',
    c: '#2d2c39',
  },
};
