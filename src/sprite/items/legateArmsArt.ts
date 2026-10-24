// The owner's Roman legate's pauldrons and sleeves.
// Lifted from the owner's Roman legate (docs/reference/roman-legate-owner-reference.jpg) and
// brought down to our scale by tools/refs/legate-pauldrons-sleeves-from-ref.py (tools/refs/legate_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/legate-pauldrons-sleeves-from-ref.py src/sprite/items/legateArmsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LEGATE_PAULDRON_BRONZE = '#5c3828';
export const LEGATE_SLEEVE_RED = '#681134';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const LEGATE_ARMS_REST: Record<string, [number, number]> = {
  LEGATE_PAULDRON_N: [112, 145],
  LEGATE_PAULDRON_F: [130, 147],
  LEGATE_SLEEVE_N: [111, 151],
  LEGATE_SLEEVE_F: [134, 151],
};

/** His near bronze pauldron with its straps: rides the near shoulder. */
export const LEGATE_PAULDRON_N: PaintedPiece = {
  pivot: [2, 7],
  angle: 107.91,
  rows: [
    '......aa.....',
    '....aaba.....',
    '...acdefaaaa.',
    '..acdcchihhja',
    '.adkleccbehma',
    '.adnlnkccnhha',
    'adlllnkncpaa.',
    'ablnnlnnccaa.',
    'aehpbebbna.a.',
    '.aaadeala.aa.',
    '....aaaaaaaa.',
  ],
  colors: {
    a: '#000220',
    b: '#5c3828',
    c: '#7c5434',
    d: '#422a26',
    e: '#683d22',
    f: '#8c5d38',
    h: '#a3703a',
    i: '#72462e',
    j: '#585252',
    k: '#433232',
    l: '#553a2f',
    m: '#392e2c',
    n: '#543520',
    p: '#362224',
  },
};

/** What each colour of LEGATE_PAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_PAULDRON_N_KIND: Record<string, 'grey' | 'line' | 'warm'> = {
  '#000220': 'line',
  '#362224': 'warm',
  '#392e2c': 'warm',
  '#422a26': 'warm',
  '#433232': 'warm',
  '#543520': 'warm',
  '#553a2f': 'warm',
  '#585252': 'grey',
  '#5c3828': 'warm',
  '#683d22': 'warm',
  '#72462e': 'warm',
  '#7c5434': 'warm',
  '#8c5d38': 'warm',
  '#a3703a': 'warm',
};

/** His far bronze pauldron: rides the far shoulder. */
export const LEGATE_PAULDRON_F: PaintedPiece = {
  pivot: [4, 4],
  angle: 77.05,
  rows: [
    '....aaaa...',
    '.aaabbaba..',
    'acdceefha..',
    'aiijjekaba.',
    'ajjjlckmba.',
    'ajlllnkmba.',
    'alljpeqraka',
    'ammsenftaaa',
    'akkqpfqa...',
    '.akqdea....',
    '..aaaaa....',
  ],
  colors: {
    a: '#000220',
    b: '#a3703a',
    c: '#1b1c29',
    d: '#7c5434',
    e: '#5c3828',
    f: '#362224',
    h: '#4b2c30',
    i: '#3e3a3e',
    j: '#4e4a4c',
    k: '#553a2f',
    l: '#585252',
    m: '#2e2e36',
    n: '#4d2f24',
    p: '#82532c',
    q: '#654431',
    r: '#282632',
    s: '#94663a',
    t: '#2c2020',
  },
};

/** What each colour of LEGATE_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_PAULDRON_F_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'warm'> = {
  '#000220': 'line',
  '#1b1c29': 'dark',
  '#282632': 'hair',
  '#2c2020': 'warm',
  '#2e2e36': 'hair',
  '#362224': 'warm',
  '#3e3a3e': 'grey',
  '#4b2c30': 'warm',
  '#4d2f24': 'warm',
  '#4e4a4c': 'grey',
  '#553a2f': 'warm',
  '#585252': 'grey',
  '#5c3828': 'warm',
  '#654431': 'warm',
  '#7c5434': 'warm',
  '#82532c': 'warm',
  '#94663a': 'warm',
  '#a3703a': 'warm',
};

/** His near dark red sleeve: rides the near shoulder. */
export const LEGATE_SLEEVE_N: PaintedPiece = {
  pivot: [3, 1],
  angle: 107.91,
  rows: [
    '..........a..',
    '.aaaa....aba.',
    '.abccaaaabbca',
    '.abccccbdccca',
    '.acccccddccea',
    'aceffeccccha.',
    'aa.iifeccea..',
    '....aaaccafa.',
    '.......aaaa..',
  ],
  colors: {
    a: '#000220',
    b: '#1a1420',
    c: '#3a0b2d',
    d: '#280a2a',
    e: '#441028',
    f: '#262128',
    h: '#4b2c30',
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
  '#4b2c30': 'warm',
  '#681134': 'purple',
};

/** His far dark red sleeve: rides the far shoulder. */
export const LEGATE_SLEEVE_F: PaintedPiece = {
  pivot: [0, 0],
  angle: 77.05,
  rows: [
    '....aa.',
    '...aba.',
    '..abba.',
    '.acbbda',
    'accebf.',
    'acceba.',
    '.abbba.',
    '.abbbaa',
    '.adaa..',
    '..a....',
  ],
  colors: {
    a: '#000220',
    b: '#241824',
    c: '#433232',
    d: '#3a0b2d',
    e: '#392e2c',
    f: '#100021',
  },
};

/** What each colour of LEGATE_SLEEVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const LEGATE_SLEEVE_F_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000220': 'line',
  '#100021': 'dark',
  '#241824': 'dark',
  '#392e2c': 'warm',
  '#3a0b2d': 'dark',
  '#433232': 'warm',
};
