// The owner's pouch belt on his Joven salvaje, his pixels (tools/refs/youth-pouches-from-ref.py from
// docs/reference/joven-salvaje-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const POUCH_BELT_LEATHER = '#473228';
export const POUCH_BELT_KHAKI = '#80684a';
export const POUCH_BELT_BUCKLE = '#a5abb7';

/** Which colour slot recolours each of his colours ('line': his black line, which stays as he drew it; 'skin': the character's skin). */
export const POUCH_BELT_SLOT: Record<string, 'buckle' | 'line' | 'main' | 'pouch'> = {
  '#020202': 'line',
  '#170e11': 'line',
  '#1c1114': 'line',
  '#2c1e1b': 'main',
  '#30201c': 'pouch',
  '#32231c': 'main',
  '#3a2721': 'main',
  '#3f2b24': 'main',
  '#473228': 'main',
  '#483426': 'pouch',
  '#4b3428': 'main',
  '#4f372b': 'main',
  '#553c2e': 'pouch',
  '#59402e': 'pouch',
  '#5a606c': 'buckle',
  '#5c4532': 'pouch',
  '#5d4130': 'pouch',
  '#636975': 'buckle',
  '#644a35': 'pouch',
  '#694e36': 'pouch',
  '#755b42': 'pouch',
  '#7c6448': 'pouch',
  '#80684a': 'pouch',
  '#84684b': 'pouch',
  '#957c59': 'pouch',
  '#9d8763': 'pouch',
  '#a1a9b3': 'buckle',
  '#a4906c': 'pouch',
  '#a5abb7': 'buckle',
  '#a8afb7': 'buckle',
  '#e1dcd6': 'buckle',
  '#e1e0dd': 'buckle',
};

/** Where each piece's first row's first cell lands in our male idle frame 0, unturned. */
export const POUCH_BELT_REST: Record<string, [number, number]> = {
  POUCH_BELT_POUCHES: [113, 168],
  POUCH_BELT_STRAP: [116, 170],
};

/** The three pouches with their snaps, the buckle and his outlines. Rides the pelvis. */
export const POUCH_BELT_POUCHES: PaintedPiece = {
  pivot: [14, 8],
  angle: -89.65,
  rows: [
    '.......aabaaaa.....abbaa.',
    '.cbbaaaadeeeeacccccafeehb',
    '.cieeeebjjdjdb..klmbiidha',
    'cnnpjpdajdqdja..mmrbisddc',
    'canpqdta.....a..murain..c',
    '.bv....bedsjwacculxafiyfc',
    '.bezAAa.bdjjwb..cccaifya.',
    '.beAAza.adddfa.....aifyb.',
    '..aAzza.adddfa......abba.',
    '..azzza.bdddfa...........',
    '...bba..bdjjwb...........',
    '.........aaaa............',
  ],
  colors: {
    a: '#170e11',
    b: '#1c1114',
    c: '#020202',
    d: '#84684b',
    e: '#a4906c',
    f: '#5d4130',
    h: '#9d8763',
    i: '#59402e',
    j: '#80684a',
    k: '#e1e0dd',
    l: '#5a606c',
    m: '#a5abb7',
    n: '#553c2e',
    p: '#7c6448',
    q: '#e1dcd6',
    r: '#636975',
    s: '#30201c',
    t: '#483426',
    u: '#a8afb7',
    v: '#957c59',
    w: '#5c4532',
    x: '#a1a9b3',
    y: '#755b42',
    z: '#694e36',
    A: '#644a35',
  },
};

/** The belt where it shows, beside the buckle and across the pouches. Rides the pelvis. */
export const POUCH_BELT_STRAP: PaintedPiece = {
  pivot: [11, 6],
  angle: -89.65,
  rows: [
    '...........ab........',
    '...........ba........',
    '.....cbbde.aa......cc',
    'fhfa.................',
  ],
  colors: {
    a: '#473228',
    b: '#4b3428',
    c: '#32231c',
    d: '#4f372b',
    e: '#2c1e1b',
    f: '#3a2721',
    h: '#3f2b24',
  },
};
