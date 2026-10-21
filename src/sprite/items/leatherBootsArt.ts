// The owner's brown laced boots, his pixels (tools/refs/trunks-leather-boots-from-ref.py from
// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LEATHER_BOOT_BROWN = '#5a3a27';

/** Which colour slot recolours each of his colours ('line': his black line and what else stays as he drew it). */
export const LEATHER_BOOT_SLOT: Record<string, 'line' | 'main'> = {
  '#000000': 'line',
  '#010101': 'line',
  '#030202': 'line',
  '#030403': 'line',
  '#040203': 'line',
  '#201214': 'main',
  '#201215': 'main',
  '#221315': 'main',
  '#241316': 'main',
  '#241416': 'main',
  '#241418': 'main',
  '#25141a': 'main',
  '#2a1518': 'main',
  '#2b1719': 'main',
  '#311818': 'main',
  '#391e1b': 'main',
  '#3a1d1c': 'main',
  '#3b1d1d': 'main',
  '#3d1f1d': 'main',
  '#3f201d': 'main',
  '#41231f': 'main',
  '#422621': 'main',
  '#452821': 'main',
  '#482b20': 'main',
  '#563927': 'main',
  '#5a3a27': 'main',
  '#5c3b28': 'main',
  '#5f3b29': 'main',
  '#603d2a': 'main',
  '#623f29': 'main',
  '#623f2b': 'main',
  '#643f2b': 'main',
  '#64412c': 'main',
  '#66412c': 'main',
  '#67422b': 'main',
  '#734e33': 'main',
  '#8d6543': 'main',
  '#8f6744': 'main',
  '#916946': 'main',
  '#926945': 'main',
  '#946945': 'main',
  '#966b47': 'main',
  '#966c47': 'main',
  '#986c47': 'main',
  '#987454': 'main',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const LEATHER_BOOT_REST: Record<string, [number, number]> = {
  BOOT_SHAFT_F: [131, 200],
  BOOT_FOOT_F: [131, 207],
  BOOT_SHAFT_N: [110, 198],
  BOOT_FOOT_N: [109, 209],
};

/** The far laced shaft: it turns with the shin about the ankle. */
export const BOOT_SHAFT_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 98.58,
  rows: [
    'abaaaaaaaa',
    'acdeefecha',
    'ieeeefecha',
    '.affffecha',
    '.afdddecha',
    '.ajeddeeha',
    '.ackedjdi.',
    '.aeeddelha',
  ],
  colors: {
    a: '#000000',
    b: '#452821',
    c: '#5f3b29',
    d: '#643f2b',
    e: '#241316',
    f: '#3d1f1d',
    h: '#2b1719',
    i: '#040203',
    j: '#201215',
    k: '#986c47',
    l: '#25141a',
  },
};

/** The far foot: it stays flat on the ground. */
export const BOOT_FOOT_F: PaintedPiece = {
  pivot: [4, -4],
  angle: 98.58,
  rows: [
    '.abbccbbda......',
    'abeccccdfha.....',
    'aibccccjfdkaaa..',
    'aifbccclbjfffla.',
    'amcbmccblcfnnnca',
    'aemmaeebccccccla',
    '.aaa.aammmemmmea',
    '.......aaaaaaaa.',
  ],
  colors: {
    a: '#010101',
    b: '#241418',
    c: '#623f2b',
    d: '#2b1719',
    e: '#3f201d',
    f: '#926945',
    h: '#8d6543',
    i: '#422621',
    j: '#966b47',
    k: '#311818',
    l: '#66412c',
    m: '#391e1b',
    n: '#987454',
  },
};

/** The near laced shaft: it turns with the shin about the ankle. */
export const BOOT_SHAFT_N: PaintedPiece = {
  pivot: [8, 9],
  angle: 104.09,
  rows: [
    '.abcaa......',
    '..defdaaaaaa',
    '..hdijfkeila',
    '..mfddddddda',
    '.adifkkfeeha',
    '.aldekfeeen.',
    '.alhdddddda.',
    '.apkdeedma..',
    '.addcfjdpa..',
    '.amddddea...',
    '.addeedma...',
    'alefkfeqa...',
  ],
  colors: {
    a: '#000000',
    b: '#563927',
    c: '#734e33',
    d: '#241416',
    e: '#623f29',
    f: '#8f6744',
    h: '#41231f',
    i: '#5a3a27',
    j: '#201214',
    k: '#946945',
    l: '#3a1d1c',
    m: '#67422b',
    n: '#030403',
    p: '#482b20',
    q: '#2a1518',
  },
};

/** The near foot: it stays flat on the ground. */
export const BOOT_FOOT_N: PaintedPiece = {
  pivot: [9, -2],
  angle: 104.09,
  rows: [
    '.abcdedcfa.',
    '.acehhfeia.',
    '.ahhjjchhba',
    'abbcdedjbha',
    'abcedddecba',
    'akccjjjccka',
    'ahkbbbbbbha',
    '.aaaaaaaaa.',
  ],
  colors: {
    a: '#030202',
    b: '#3b1d1d',
    c: '#603d2a',
    d: '#916946',
    e: '#966c47',
    f: '#2a1518',
    h: '#221315',
    i: '#5c3b28',
    j: '#64412c',
    k: '#3f201d',
  },
};
