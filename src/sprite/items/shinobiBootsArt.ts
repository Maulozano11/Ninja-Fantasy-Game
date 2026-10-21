// The owner's black open-toe boots on his Cazador 1, his pixels (tools/refs/cazador1-boots-from-ref.py
// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const BOOT_CLOTH = '#282830';
export const BOOT_SOLE = '#1d1c27';
export const BOOT_SKIN = '#e7bb98';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const BOOT_KIND: Record<string, 'line' | 'boot' | 'skin'> = {
  '#000000': 'line',
  '#010101': 'line',
  '#010102': 'line',
  '#161320': 'boot',
  '#16141f': 'boot',
  '#181623': 'boot',
  '#191722': 'boot',
  '#1b1b22': 'boot',
  '#1d1c27': 'boot',
  '#1e1d26': 'boot',
  '#201f27': 'boot',
  '#282830': 'boot',
  '#292732': 'boot',
  '#2a2a32': 'boot',
  '#2b2b33': 'boot',
  '#2c2b33': 'boot',
  '#353841': 'boot',
  '#464855': 'boot',
  '#4a4e5a': 'boot',
  '#8a4d49': 'skin',
  '#8f4f48': 'skin',
  '#8f514a': 'skin',
  '#93524b': 'skin',
  '#98574d': 'skin',
  '#c88562': 'skin',
  '#ca8869': 'skin',
  '#d39572': 'skin',
  '#d49876': 'skin',
  '#d89e7b': 'skin',
  '#dca37f': 'skin',
  '#e5ae8a': 'skin',
  '#ebbc9a': 'skin',
  '#ecc09e': 'skin',
  '#edbe9c': 'skin',
  '#edc1a0': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const BOOT_REST: Record<string, [number, number]> = {
  BOOT_SHIN_N: [112, 194],
  BOOT_FOOT_N: [111, 212],
  BOOT_SOLE_N: [112, 215],
  BOOT_SHIN_F: [132, 196],
  BOOT_FOOT_F: [132, 209],
  BOOT_SOLE_F: [136, 211],
};

/** The near boot's shaft: it turns with the shin about the ankle. */
export const BOOT_SHIN_N: PaintedPiece = {
  pivot: [6, 13],
  angle: 104.09,
  rows: [
    '..abbcaaaa',
    '..adecbaaa',
    '..abddbbaa',
    '.aabbbbbaa',
    '.afaaaaaaa',
    '.afaaaaaaa',
    '.adaaaaaaa',
    '.adffffaaa',
    '.adfcccbfa',
    '.adfbbfffa',
    '.adbcbbffa',
    '.afcbbbfa.',
    '.affbcffa.',
    '.ahfffhha.',
    '.afbcbhha.',
    'afcccbbaa.',
    'afbbbbhfa.',
    'ahffhhbfa.',
  ],
  colors: {
    a: '#000000',
    b: '#282830',
    c: '#2c2b33',
    d: '#464855',
    e: '#4a4e5a',
    f: '#181623',
    h: '#16141f',
  },
};

/** The near foot, open toes over the dark foot: it stays flat on the ground. */
export const BOOT_FOOT_N: PaintedPiece = {
  pivot: [7, -5],
  angle: 104.09,
  rows: [
    'abccddeffa',
    'achcicjdca',
    'aklejejmja',
    'a........a',
    '.aaaaaaaa.',
  ],
  colors: {
    a: '#000000',
    b: '#98574d',
    c: '#edc1a0',
    d: '#edbe9c',
    e: '#d49876',
    f: '#191722',
    h: '#ca8869',
    i: '#c88562',
    j: '#8f4f48',
    k: '#d89e7b',
    l: '#8a4d49',
    m: '#d39572',
  },
};

/** The near sole, the foot's last row of cloth: flat on the ground with the foot. */
export const BOOT_SOLE_N: PaintedPiece = {
  pivot: [6, -8],
  angle: 104.09,
  rows: [
    'aabaaaba',
  ],
  colors: {
    a: '#1e1d26',
    b: '#1b1b22',
  },
};

/** The far boot's shaft: it turns with the shin about the ankle. */
export const BOOT_SHIN_F: PaintedPiece = {
  pivot: [3, 7],
  angle: 98.56,
  rows: [
    'aaaaaaaaa...',
    'abbbbbbba...',
    'abcbdddba...',
    'abbbdddba...',
    'abdbddea....',
    'abdbddda....',
    'abdbddba....',
    'abdbddba....',
    'aabdddba....',
    'aaafdbba....',
    'aaaadddba...',
    'aaaaadddha..',
    'aaaaaddddbaa',
  ],
  colors: {
    a: '#010102',
    b: '#191722',
    c: '#353841',
    d: '#2b2b33',
    e: '#292732',
    f: '#201f27',
    h: '#161320',
  },
};

/** The far foot, open toes over the dark foot: it stays flat on the ground. */
export const BOOT_FOOT_F: PaintedPiece = {
  pivot: [3, -6],
  angle: 98.56,
  rows: [
    'abbbccccbdefa.',
    'abbbbbcbchidja',
    'aaaa.........a',
    '....aaaaaaaaa.',
  ],
  colors: {
    a: '#010101',
    b: '#16141f',
    c: '#2a2a32',
    d: '#8f514a',
    e: '#93524b',
    f: '#e5ae8a',
    h: '#ecc09e',
    i: '#ebbc9a',
    j: '#dca37f',
  },
};

/** The far sole, the foot's last row of cloth: flat on the ground with the foot. */
export const BOOT_SOLE_F: PaintedPiece = {
  pivot: [-1, -8],
  angle: 98.56,
  rows: [
    'aaaaaaaaa',
  ],
  colors: {
    a: '#1d1c27',
  },
};
