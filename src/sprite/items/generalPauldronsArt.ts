// The owner's Roman general's two pairs of pauldrons.
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-pauldrons-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-pauldrons-from-ref.py src/sprite/items/generalPauldronsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_PAULDRON_BRONZE = '#56331a';
export const GENERAL_STUDDED_BRONZE = '#643e32';

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
    '.aacdcce...',
    '.afhdddcib.',
    'afhddcdcjba',
    'ahhbhccddaa',
    'ahkcbfllfja',
    'ajicbhfaaaa',
    'aaaddaa..aa',
    'a..aa....aa',
    '.........aa',
  ],
  colors: {
    a: '#02021c',
    b: '#56331a',
    c: '#936c4a',
    d: '#cd8a38',
    e: '#643e32',
    f: '#42241e',
    h: '#512a1c',
    i: '#543930',
    j: '#4e2d26',
    k: '#5a3226',
    l: '#824d2e',
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
  '#824d2e': 'warm',
  '#936c4a': 'warm',
  '#cd8a38': 'warm',
};

/** His far gold-rimmed pauldron: rides the far shoulder. */
export const GENERAL_PAULDRON_F: PaintedPiece = {
  pivot: [3, 3],
  angle: 77.05,
  rows: [
    '..aa...',
    '.abca..',
    '.adbea.',
    'affhia.',
    'ajffha.',
    'affhha.',
    'ahhaiia',
    'aha..aa',
    '.aa....',
    '..a....',
  ],
  colors: {
    a: '#02021c',
    b: '#623828',
    c: '#6c3e26',
    d: '#5a3226',
    e: '#643e32',
    f: '#42241e',
    h: '#4e2d26',
    i: '#5c2c1e',
    j: '#3a2024',
  },
};

/** What each colour of GENERAL_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_PAULDRON_F_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#3a2024': 'warm',
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
    '..aabcdd...',
    '.aebcdfddc.',
    '.aahhidcdcj',
    '.akkhheddjj',
    'ahheaeeecla',
    'amheeeaemna',
    '.aaaeieema.',
    '....aaeeaa.',
    '......aaapa',
    '........aaa',
    '........ana',
    '........aan',
  ],
  colors: {
    a: '#02021c',
    b: '#704a38',
    c: '#c4843e',
    d: '#e4a848',
    e: '#5a3226',
    f: '#70422f',
    h: '#4e2d26',
    i: '#543930',
    j: '#824d2e',
    k: '#512a1c',
    l: '#643e32',
    m: '#452c30',
    n: '#42241e',
    p: '#341a1e',
  },
};

/** What each colour of GENERAL_STUDDED_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_N_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#341a1e': 'warm',
  '#42241e': 'warm',
  '#452c30': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#543930': 'warm',
  '#5a3226': 'warm',
  '#643e32': 'warm',
  '#70422f': 'warm',
  '#704a38': 'warm',
  '#824d2e': 'warm',
  '#c4843e': 'warm',
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
    '.adebfa.',
    '.ahbffa.',
    '.acbfia.',
    'aiiiija.',
    'aiiiffja',
    '.akilaaa',
    '..aba...',
    '...a....',
  ],
  colors: {
    a: '#02021c',
    b: '#6c3e26',
    c: '#9a5c30',
    d: '#996238',
    e: '#70422f',
    f: '#4e2d26',
    h: '#a26636',
    i: '#de9e44',
    j: '#5a3226',
    k: '#643e32',
    l: '#623828',
  },
};

/** What each colour of GENERAL_STUDDED_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_F_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#4e2d26': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
  '#70422f': 'warm',
  '#996238': 'warm',
  '#9a5c30': 'warm',
  '#a26636': 'warm',
  '#de9e44': 'warm',
};
