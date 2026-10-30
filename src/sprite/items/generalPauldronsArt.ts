// The owner's Roman general's two pairs of pauldrons.
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-pauldrons-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-pauldrons-from-ref.py src/sprite/items/generalPauldronsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_PAULDRON_BRONZE = '#5a3226';
export const GENERAL_STUDDED_BRONZE = '#623828';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_PAULDRONS_REST: Record<string, [number, number]> = {
  GENERAL_PAULDRON_N: [110, 147],
  GENERAL_PAULDRON_F: [131, 148],
  GENERAL_STUDDED_N: [109, 147],
  GENERAL_STUDDED_F: [130, 147],
};

/** His near gold-rimmed pauldron: rides the near shoulder. */
export const GENERAL_PAULDRON_N: PaintedPiece = {
  pivot: [4, 5],
  angle: 107.91,
  rows: [
    '...aab.....',
    '.aaccdef...',
    '.ahhceeebb.',
    'aeeiieeccca',
    'ahccieejiaa',
    'ahbekiejika',
    'acdefejaaaa',
    'aaaeeaa..aa',
    'a..aa....aa',
    '.........aa',
  ],
  colors: {
    a: '#02021c',
    b: '#543930',
    c: '#56331a',
    d: '#643e32',
    e: '#c4843e',
    f: '#704a38',
    h: '#4e2d26',
    i: '#512a1c',
    j: '#42241e',
    k: '#5a3226',
  },
};

/** What each colour of GENERAL_PAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_PAULDRON_N_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#543930': 'warm',
  '#56331a': 'warm',
  '#5a3226': 'warm',
  '#643e32': 'warm',
  '#704a38': 'warm',
  '#c4843e': 'warm',
};

/** His far gold-rimmed pauldron: rides the far shoulder. */
export const GENERAL_PAULDRON_F: PaintedPiece = {
  pivot: [3, 3],
  angle: 77.05,
  rows: [
    '..aa...',
    '.abca..',
    '.adbca.',
    'aeefha.',
    'aeeida.',
    'aeefba.',
    'aiiajja',
    'aia..aa',
    '.aa....',
    '..a....',
  ],
  colors: {
    a: '#02021c',
    b: '#623828',
    c: '#6c3e26',
    d: '#5a3226',
    e: '#42241e',
    f: '#5c2c1e',
    h: '#000226',
    i: '#4e2d26',
    j: '#643e32',
  },
};

/** What each colour of GENERAL_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_PAULDRON_F_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#5a3226': 'warm',
  '#5c2c1e': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
};

/** His near studded pauldron with its strips: rides the near shoulder. */
export const GENERAL_STUDDED_N: PaintedPiece = {
  pivot: [5, 5],
  angle: 107.91,
  rows: [
    '....aa.....',
    '..aabbbc...',
    '.adbbefbbb.',
    '.aahhdbbbbc',
    '.aijhhdkfcc',
    'aiihaddlbma',
    'anihddadaaa',
    '.aaahdddaa.',
    '....aaddaa.',
    '......aaapa',
    '........aaa',
    '........ana',
    '........aan',
  ],
  colors: {
    a: '#02021c',
    b: '#e4a848',
    c: '#824d2e',
    d: '#5a3226',
    e: '#623828',
    f: '#70422f',
    h: '#4e2d26',
    i: '#452c30',
    j: '#512a1c',
    k: '#643e32',
    l: '#543930',
    m: '#000226',
    n: '#42241e',
    p: '#341a1e',
  },
};

/** What each colour of GENERAL_STUDDED_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_N_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#341a1e': 'warm',
  '#42241e': 'warm',
  '#452c30': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#543930': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#70422f': 'warm',
  '#824d2e': 'warm',
  '#e4a848': 'warm',
};

/** His far studded pauldron: rides the far shoulder. */
export const GENERAL_STUDDED_F: PaintedPiece = {
  pivot: [4, 4],
  angle: 77.05,
  rows: [
    '...a....',
    '..aba...',
    '..acca..',
    '.adccea.',
    '.afdeea.',
    '.acceha.',
    'ahhbija.',
    'ahhkjjja',
    '.alllaaa',
    '..aba...',
    '...a....',
  ],
  colors: {
    a: '#02021c',
    b: '#6c3e26',
    c: '#9a5c30',
    d: '#996238',
    e: '#4e2d26',
    f: '#a26636',
    h: '#de9e44',
    i: '#623828',
    j: '#5a3226',
    k: '#543930',
    l: '#643e32',
  },
};

/** What each colour of GENERAL_STUDDED_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_F_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#4e2d26': 'warm',
  '#543930': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
  '#996238': 'warm',
  '#9a5c30': 'warm',
  '#a26636': 'warm',
  '#de9e44': 'warm',
};
