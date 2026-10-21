// The owner's open-toe shin boots and short far glove, his pixels (tools/refs/tactical-boots-glove-from-ref.py
// from docs/reference/tactical-coat-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TACTICAL_BOOTS = '#17161e';
export const TACTICAL_GLOVE = '#1f2320';
export const TACTICAL_SKIN = '#e9bb98';

/** What each of his colours is, as the script sorts them (tools/refs/tactical_ref.py kind). */
export const TACTICAL_KIT_KIND: Record<string, 'dark' | 'line' | 'red' | 'skin'> = {
  '#000000': 'line',
  '#010100': 'line',
  '#010101': 'line',
  '#020202': 'line',
  '#030304': 'line',
  '#030403': 'line',
  '#070908': 'dark',
  '#121615': 'dark',
  '#131219': 'dark',
  '#141319': 'dark',
  '#15141c': 'dark',
  '#161918': 'dark',
  '#17161e': 'dark',
  '#18161f': 'dark',
  '#1b1e1d': 'dark',
  '#1f2320': 'dark',
  '#222328': 'dark',
  '#26242a': 'dark',
  '#27272c': 'dark',
  '#28282d': 'dark',
  '#282830': 'dark',
  '#282930': 'dark',
  '#2b2b33': 'dark',
  '#2c2c33': 'dark',
  '#2e2f39': 'dark',
  '#2f3030': 'dark',
  '#31303b': 'dark',
  '#33333d': 'dark',
  '#343640': 'dark',
  '#353539': 'dark',
  '#424241': 'dark',
  '#444652': 'dark',
  '#4d1823': 'red',
  '#8c8366': 'dark',
  '#9c5c4b': 'skin',
  '#9f5c4f': 'skin',
  '#b0705b': 'skin',
  '#bb745d': 'skin',
  '#be7c64': 'skin',
  '#c8876c': 'skin',
  '#cc866c': 'skin',
  '#cc896f': 'skin',
  '#eac39f': 'skin',
  '#ebc3a2': 'skin',
  '#edc5a4': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const TACTICAL_KIT_REST: Record<string, [number, number]> = {
  TACTICAL_BOOT_SHIN_F: [132, 195],
  TACTICAL_BOOT_FOOT_F: [133, 204],
  TACTICAL_BOOT_SHIN_N: [114, 203],
  TACTICAL_BOOT_FOOT_N: [114, 213],
  TACTICAL_GLOVE_F: [139, 171],
};

/** The far boot's shaft: it turns with the shin about the ankle. */
export const TACTICAL_BOOT_SHIN_F: PaintedPiece = {
  pivot: [3, 8],
  angle: 98.56,
  rows: [
    'aaaaaaaaa',
    'abbbbccda',
    'abeebbbbf',
    'abeebccba',
    '.aehbccba',
    '.abhbccba',
    '.abebdbba',
    '.abeicbaa',
    '.abbbbica',
    '.abeicbaa',
    '.abbbbica',
  ],
  colors: {
    a: '#010100',
    b: '#15141c',
    c: '#282830',
    d: '#2c2c33',
    e: '#26242a',
    f: '#030304',
    h: '#222328',
    i: '#33333d',
  },
};

/** The far boot's foot, its band, his bare toes and the sole: it stays flat on the ground. */
export const TACTICAL_BOOT_FOOT_F: PaintedPiece = {
  pivot: [2, -1],
  angle: 98.56,
  rows: [
    'abcddbbba......',
    'aabbbeebba.....',
    'afabbeeheiaa...',
    'affacbeeeeibaa.',
    'ajfabkbbeblmmna',
    'abbbbbbbbbbbbba',
    '.aaaaaaaaaaaaaa',
  ],
  colors: {
    a: '#010101',
    b: '#18161f',
    c: '#27272c',
    d: '#343640',
    e: '#2e2f39',
    f: '#cc866c',
    h: '#444652',
    i: '#131219',
    j: '#9f5c4f',
    k: '#282930',
    l: '#c8876c',
    m: '#ebc3a2',
    n: '#be7c64',
  },
};

/** The near boot's shaft: it turns with the shin about the ankle. */
export const TACTICAL_BOOT_SHIN_N: PaintedPiece = {
  pivot: [4, 4],
  angle: 104.09,
  rows: [
    '.aaaaaaaaa',
    '.abbbbbbba',
    'abbbcbbbba',
    'abbbbbbba.',
    'abbbcbbba.',
    'abbbbbbba.',
    'abbcbbba..',
    '.abbbbba..',
    '.abcbbbbba',
    'abbbbbbdba',
    'eabcbbbbba',
    'abbbbbbdba',
  ],
  colors: {
    a: '#000000',
    b: '#17161e',
    c: '#28282d',
    d: '#2b2b33',
    e: '#4d1823',
  },
};

/** The near boot's foot, its band, his bare toes and the sole: it stays flat on the ground. */
export const TACTICAL_BOOT_FOOT_N: PaintedPiece = {
  pivot: [4, -6],
  angle: 104.09,
  rows: [
    'abcccccbba',
    'abbbbbbcca',
    'adefeehbia',
    'afjejfkeea',
    'abbbbbbbba',
    '.aaaaaaaaa',
  ],
  colors: {
    a: '#020202',
    b: '#17161e',
    c: '#31303b',
    d: '#bb745d',
    e: '#eac39f',
    f: '#edc5a4',
    h: '#cc896f',
    i: '#141319',
    j: '#b0705b',
    k: '#9c5c4b',
  },
};

/** The short glove on the far wrist: it turns with the forearm about the wrist. */
export const TACTICAL_GLOVE_F: PaintedPiece = {
  pivot: [3, 2],
  angle: 60.43,
  rows: [
    '...ab.',
    '..acdb',
    'eacfdh',
    'eiccjh',
    'ekal..',
  ],
  colors: {
    a: '#1b1e1d',
    b: '#070908',
    c: '#424241',
    d: '#353539',
    e: '#000000',
    f: '#8c8366',
    h: '#030403',
    i: '#2f3030',
    j: '#121615',
    k: '#161918',
    l: '#1f2320',
  },
};
