// The owner's Roman legate's pauldrons and sleeves.
// Lifted from the owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg) and
// brought down to our scale by tools/refs/legate-pauldrons-sleeves-from-ref.py (tools/refs/legate_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/legate-pauldrons-sleeves-from-ref.py src/sprite/items/legateArmsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LEGATE_PAULDRON_BRONZE = '#543520';
export const LEGATE_SLEEVE_RED = '#262128';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const LEGATE_ARMS_REST: Record<string, [number, number]> = {
  LEGATE_PAULDRON_N: [107, 147],
  LEGATE_PAULDRON_F: [128, 146],
  LEGATE_SLEEVE_N: [106, 153],
  LEGATE_SLEEVE_F: [132, 153],
};

/** His near bronze pauldron with its straps: rides the near shoulder. */
export const LEGATE_PAULDRON_N: PaintedPiece = {
  pivot: [7, 5],
  angle: 107.91,
  rows: [
    '....aaaaaa.....',
    '...abbccca.....',
    '..abbbbdeffaaaa',
    '.ahhhiaiiffejja',
    '.ahhhhkkaicjjja',
    '.ajjjjjhkailkda',
    '.ajcacmmjkabbaa',
    '.ajjcjmjcaknaaa',
    '.ajajjhjcaja.aa',
    'aja.aaajccca.aa',
    'aja....aaaaaaaa',
    'aa.............',
    'aa.a...........',
  ],
  colors: {
    a: '#000220',
    b: '#8c5d38',
    c: '#553a2f',
    d: '#a3703a',
    e: '#683d22',
    f: '#72462e',
    h: '#433232',
    i: '#d49a52',
    j: '#543520',
    k: '#4b2c30',
    l: '#392e2c',
    m: '#101224',
    n: '#422a26',
  },
};

/** What each colour of LEGATE_PAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_PAULDRON_N_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000220': 'line',
  '#101224': 'dark',
  '#392e2c': 'warm',
  '#422a26': 'warm',
  '#433232': 'warm',
  '#4b2c30': 'warm',
  '#543520': 'warm',
  '#553a2f': 'warm',
  '#683d22': 'warm',
  '#72462e': 'warm',
  '#8c5d38': 'warm',
  '#a3703a': 'warm',
  '#d49a52': 'warm',
};

/** His far bronze pauldron: rides the far shoulder. */
export const LEGATE_PAULDRON_F: PaintedPiece = {
  pivot: [6, 5],
  angle: 77.05,
  rows: [
    '....aaaaaa....',
    '...abccccca...',
    '...abcccccca..',
    '...abccccccca.',
    '..abbcaccccca.',
    'aabddecccccca.',
    'afffccaccccca.',
    'ahhhfcaccccca.',
    'ahhhiiiicccca.',
    'aihjhklaffffa.',
    'afikkkhaaafffa',
    'afimnhha..ahfa',
    '.aimnha..aaaaa',
    '..aaaaa.......',
  ],
  colors: {
    a: '#000220',
    b: '#422a26',
    c: '#433232',
    d: '#4b2c30',
    e: '#4d2f24',
    f: '#553a2f',
    h: '#72462e',
    i: '#5c3828',
    j: '#dca64e',
    k: '#a3703a',
    l: '#6d4a36',
    m: '#2c2020',
    n: '#362224',
  },
};

/** What each colour of LEGATE_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_PAULDRON_F_KIND: Record<string, 'line' | 'warm'> = {
  '#000220': 'line',
  '#2c2020': 'warm',
  '#362224': 'warm',
  '#422a26': 'warm',
  '#433232': 'warm',
  '#4b2c30': 'warm',
  '#4d2f24': 'warm',
  '#553a2f': 'warm',
  '#5c3828': 'warm',
  '#6d4a36': 'warm',
  '#72462e': 'warm',
  '#a3703a': 'warm',
  '#dca64e': 'warm',
};

/** His near dark red sleeve: rides the near shoulder. */
export const LEGATE_SLEEVE_N: PaintedPiece = {
  pivot: [8, -1],
  angle: 107.91,
  rows: [
    '..aa........aa..',
    '..a.aaa....abba.',
    '..aacbdaaaabbdda',
    '.acbbbddddcdddda',
    '.addddddddcbddaa',
    '.aeeeeeeffhhaa..',
    '.aeeeeieefddaa..',
    'aeeeeeieedddaa..',
    'aaaaaaaaaaaaaa..',
  ],
  colors: {
    a: '#000220',
    b: '#1a1420',
    c: '#280a2a',
    d: '#3a0b2d',
    e: '#262128',
    f: '#441028',
    h: '#5c3828',
    i: '#681134',
  },
};

/** What each colour of LEGATE_SLEEVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_SLEEVE_N_KIND: Record<string, 'dark' | 'line' | 'purple' | 'warm'> = {
  '#000220': 'line',
  '#1a1420': 'dark',
  '#262128': 'purple',
  '#280a2a': 'dark',
  '#3a0b2d': 'dark',
  '#441028': 'purple',
  '#5c3828': 'warm',
  '#681134': 'purple',
};

/** His far dark red sleeve: rides the far shoulder. */
export const LEGATE_SLEEVE_F: PaintedPiece = {
  pivot: [2, -2],
  angle: 77.05,
  rows: [
    '....aaaaa.',
    '...abbbba.',
    '..abcccca.',
    '.adcccccca',
    'addefffffa',
    'adeffffffa',
    'abecbbbbba',
    'abcbbaaaaa',
    'accaa.....',
    '.aa.......',
  ],
  colors: {
    a: '#000220',
    b: '#241824',
    c: '#3a0b2d',
    d: '#433232',
    e: '#392e2c',
    f: '#370624',
  },
};

/** What each colour of LEGATE_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_SLEEVE_F_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000220': 'line',
  '#241824': 'dark',
  '#370624': 'dark',
  '#392e2c': 'warm',
  '#3a0b2d': 'dark',
  '#433232': 'warm',
};
