// The owner's navy trousers with gold studs, his pixels (tools/refs/solen-trousers-from-ref.py from
// docs/reference/solen-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const FOUNDER_TROUSERS = '#2b314d';
export const FOUNDER_TROUSERS_STUD = '#f1b744';

/** What each of his colours is, as the script sorts them (tools/refs/solen_ref.py kind). */
export const FOUNDER_TROUSERS_KIND: Record<string, 'line' | 'skin' | 'red' | 'gold' | 'leather' | 'steel' | 'stud' | 'white' | 'grey' | 'navy' | 'ice'> = {
  '#000211': 'line',
  '#000316': 'line',
  '#01010c': 'line',
  '#01020c': 'line',
  '#010316': 'line',
  '#18182e': 'navy',
  '#181a30': 'navy',
  '#1a1c33': 'navy',
  '#1a1c34': 'navy',
  '#212742': 'navy',
  '#2b304d': 'navy',
  '#2d3350': 'navy',
  '#2d3453': 'navy',
  '#e3a748': 'gold',
  '#e7ac49': 'gold',
  '#e9ae43': 'gold',
  '#f1b744': 'gold',
  '#f8c445': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const FOUNDER_TROUSERS_REST: Record<string, [number, number]> = {
  FOUNDER_THIGH_N: [110, 184],
  FOUNDER_THIGH_F: [128, 187],
};

/** How far his legs stand from ours at rest (fine pixels): his trousers and sandals turn about our knees and ankles moved this far. */
export const FOUNDER_LEG_OUT: Record<'N' | 'F', [number, number]> = { N: [-6, 0], F: [-2, 5] };

/** The near trouser leg, under the skirt to below the knee: it rides the thigh about the knee. */
export const FOUNDER_THIGH_N: PaintedPiece = {
  pivot: [6, 8],
  angle: 87.91,
  rows: [
    '......aaaaa..',
    '......abaccaa',
    '.....ada.abaa',
    '...aaedcaca.a',
    '...eddfbdbcaa',
    '..fdddhabccha',
    '..ahhbddeadia',
    '..adbbccdhada',
    '.addbjcbbddea',
    '.ahdcccbjcdhf',
    'ahddbkbcccdda',
    'addihbcclbda.',
    'adbbddddihda.',
    '.ahccbhddda..',
    '..aedcbbida..',
    '....eeaaaa...',
  ],
  colors: {
    a: '#000211',
    b: '#2b304d',
    c: '#2d3453',
    d: '#1a1c33',
    e: '#010316',
    f: '#01010c',
    h: '#18182e',
    i: '#212742',
    j: '#f8c445',
    k: '#e9ae43',
    l: '#e3a748',
  },
};

/** The far trouser leg: it rides the thigh about the knee. */
export const FOUNDER_THIGH_F: PaintedPiece = {
  pivot: [8, 5],
  angle: 65.49,
  rows: [
    '.......aaab',
    'aaaaaaacccb',
    'accccacccca',
    'adbaaddeeea',
    'acbccceeeea',
    'addfdeeehea',
    'aeeebbeeeea',
    'aeecccfeeia',
    'acddeeebbcf',
    'acceeaa..f.',
    '.aaea.a....',
    '...aeaa....',
    '....aa.....',
  ],
  colors: {
    a: '#000211',
    b: '#000316',
    c: '#1a1c34',
    d: '#181a30',
    e: '#2d3350',
    f: '#01020c',
    h: '#f1b744',
    i: '#e7ac49',
  },
};
