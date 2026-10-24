// The owner's Roman general's two pairs of pauldrons.
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-pauldrons-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-pauldrons-from-ref.py src/sprite/items/generalPauldronsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_PAULDRON_BRONZE = '#543930';
export const GENERAL_STUDDED_BRONZE = '#623828';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_PAULDRONS_REST: Record<string, [number, number]> = {
  GENERAL_PAULDRON_N: [110, 147],
  GENERAL_PAULDRON_F: [131, 148],
  GENERAL_STUDDED_N: [108, 147],
  GENERAL_STUDDED_F: [130, 147],
};

/** His near gold-rimmed pauldron: rides the near shoulder. */
export const GENERAL_PAULDRON_N: PaintedPiece = {
  pivot: [4, 5],
  angle: 107.91,
  rows: [
    '...aab.....',
    '.aaccccd...',
    '.adecccccf.',
    'ahijjjcckla',
    'ambjnbjcca.',
    'alppbqqqcca',
    'abprsqbaaaa',
    'aaattaa...a',
    'a..aa....aa',
    '.........aa',
  ],
  colors: {
    a: '#02021c',
    b: '#42241e',
    c: '#a16a42',
    d: '#4e2d26',
    e: '#5a3226',
    f: '#26121d',
    h: '#87562b',
    i: '#936c4a',
    j: '#341a1e',
    k: '#543930',
    l: '#56331a',
    m: '#512a1c',
    n: '#3e2a26',
    p: '#704a38',
    q: '#3a2024',
    r: '#c4843e',
    s: '#643e32',
    t: '#754223',
  },
};

/** What each colour of GENERAL_PAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_PAULDRON_N_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#02021c': 'line',
  '#26121d': 'dark',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#3e2a26': 'warm',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#543930': 'warm',
  '#56331a': 'warm',
  '#5a3226': 'warm',
  '#643e32': 'warm',
  '#704a38': 'warm',
  '#754223': 'warm',
  '#87562b': 'warm',
  '#936c4a': 'warm',
  '#a16a42': 'warm',
  '#c4843e': 'warm',
};

/** His far gold-rimmed pauldron: rides the far shoulder. */
export const GENERAL_PAULDRON_F: PaintedPiece = {
  pivot: [3, 3],
  angle: 77.05,
  rows: [
    '..aa...',
    '.abba..',
    '.accda.',
    'aefhia.',
    'afffja.',
    'afhiia.',
    'akkalla',
    'afa..aa',
    '.aa....',
    '..a....',
  ],
  colors: {
    a: '#02021c',
    b: '#623828',
    c: '#643e32',
    d: '#b67837',
    e: '#3a2024',
    f: '#42241e',
    h: '#4e2d26',
    i: '#341a1e',
    j: '#26121d',
    k: '#9a5c30',
    l: '#6c3e26',
  },
};

/** What each colour of GENERAL_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_PAULDRON_F_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#02021c': 'line',
  '#26121d': 'dark',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
  '#9a5c30': 'warm',
  '#b67837': 'warm',
};

/** His near studded pauldron with its strips: rides the near shoulder. */
export const GENERAL_STUDDED_N: PaintedPiece = {
  pivot: [6, 5],
  angle: 107.91,
  rows: [
    '.....aa.....',
    '...aabbcd...',
    '..aeeeebdbe.',
    '..afbheeeeei',
    '..abdddceebb',
    '.ajjjddjkeba',
    '.almjdjjlnea',
    '..aaamplnnq.',
    '.....aaqnna.',
    '.......aarqa',
    '.........asa',
    '.a.......aia',
    'a........aac',
  ],
  colors: {
    a: '#02021c',
    b: '#4e2d26',
    c: '#3a2024',
    d: '#5a3226',
    e: '#a26636',
    f: '#452c30',
    h: '#341a1e',
    i: '#42241e',
    j: '#543930',
    k: '#2a1e1c',
    l: '#623828',
    m: '#d69642',
    n: '#6c3e26',
    p: '#e4a848',
    q: '#000226',
    r: '#643e32',
    s: '#3e2a26',
  },
};

/** What each colour of GENERAL_STUDDED_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_N_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#2a1e1c': 'warm',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#3e2a26': 'warm',
  '#42241e': 'warm',
  '#452c30': 'warm',
  '#4e2d26': 'warm',
  '#543930': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
  '#a26636': 'warm',
  '#d69642': 'warm',
  '#e4a848': 'warm',
};

/** His far studded pauldron: rides the far shoulder. */
export const GENERAL_STUDDED_F: PaintedPiece = {
  pivot: [4, 4],
  angle: 77.05,
  rows: [
    '...a....',
    '..aba...',
    '..acda..',
    '.aecefa.',
    '.acchha.',
    '.adbhda.',
    'abbbija.',
    'akkkjjla',
    '.ajkkaaa',
    '..aka...',
    '...a....',
  ],
  colors: {
    a: '#02021c',
    b: '#6c3e26',
    c: '#a26636',
    d: '#ae7235',
    e: '#996238',
    f: '#512a1c',
    h: '#4e2d26',
    i: '#3a2024',
    j: '#623828',
    k: '#de9e44',
    l: '#5a3226',
  },
};

/** What each colour of GENERAL_STUDDED_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_STUDDED_F_KIND: Record<string, 'line' | 'warm'> = {
  '#02021c': 'line',
  '#3a2024': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#6c3e26': 'warm',
  '#996238': 'warm',
  '#a26636': 'warm',
  '#ae7235': 'warm',
  '#de9e44': 'warm',
};
