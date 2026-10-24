// The owner's bronze cuirass (armor_hoplite).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-armor-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-armor-from-ref.py src/sprite/items/hopliteArmorArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_ARMOR_BRONZE = '#764830';
export const HOPLITE_ARMOR_STEEL = '#312c32';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_ARMOR_REST: Record<string, [number, number]> = {
  HOPLITE_CHEST: [118, 151],
  HOPLITE_CLASP: [123, 152],
};

/** His cuirass: rides the neck, leaning with the torso. */
export const HOPLITE_CHEST: PaintedPiece = {
  pivot: [10, -1],
  angle: -87.46,
  rows: [
    '..aaaaaaaaaaaaaaaa.',
    '..abccdddeffffceha.',
    '..adeeijjkffedhlea.',
    '..aaedmmjknaaaaaaa.',
    '....apmqjja........',
    '...ahhjrrrbaa...aa.',
    '...ahirjjbbbja.aa..',
    '....airjrrhbstata..',
    '...ahirjjjnibiitj..',
    '..auhqiiinnkbhsja..',
    '.ajkca...a.anbeea..',
    'ajkccvaaanannhbua..',
    'ajkwwlmennxxaaaaha.',
    '.ayyehuzixaAcdcvba.',
    '.ahBBwCmxDEAFdvvaa.',
    '.annccEwacGDfffHca.',
    '..aecccDIfffiiiifa.',
    '..aCfccwGmjiJJJJia.',
    '..attmbKumiJJJJJJa.',
    '..aiucwwLmiJJjJJja.',
    '..ahzcLIMNijJJJJJa.',
    '..ahhzzzzwiiJJJjiza',
    '..aBOPbzzzjiiJJiia.',
    '..aakkuuazzzziiza..',
    '....aaaa..aaaaaa...',
    '.......a...........',
  ],
  colors: {
    a: '#010216',
    b: '#2e1a1c',
    c: '#312c32',
    d: '#202028',
    e: '#56342a',
    f: '#ce9456',
    h: '#4e2e25',
    i: '#764830',
    j: '#362222',
    k: '#4a332e',
    l: '#c68d51',
    m: '#442824',
    n: '#8e5a36',
    p: '#14111c',
    q: '#ac7c48',
    r: '#e2a465',
    s: '#7c4d38',
    t: '#845232',
    u: '#22151a',
    v: '#565255',
    w: '#28272d',
    x: '#dca05e',
    y: '#f6c476',
    z: '#6a3e2c',
    A: '#675e60',
    B: '#b37344',
    C: '#96603a',
    D: '#49484d',
    E: '#6a666c',
    F: '#403636',
    G: '#3d3c42',
    H: '#7a706f',
    I: '#464046',
    J: '#c58747',
    K: '#603c2e',
    L: '#1a1a20',
    M: '#38323e',
    N: '#3c241a',
    O: '#e4af5e',
    P: '#2c2223',
  },
};

/** What each colour of HOPLITE_CHEST is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_CHEST_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'purple' | 'warm'> = {
  '#010216': 'line',
  '#14111c': 'dark',
  '#1a1a20': 'dark',
  '#202028': 'hair',
  '#22151a': 'dark',
  '#28272d': 'hair',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#312c32': 'grey',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#3c241a': 'warm',
  '#3d3c42': 'grey',
  '#403636': 'warm',
  '#442824': 'warm',
  '#464046': 'grey',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#565255': 'grey',
  '#603c2e': 'warm',
  '#675e60': 'grey',
  '#6a3e2c': 'warm',
  '#6a666c': 'grey',
  '#764830': 'warm',
  '#7a706f': 'grey',
  '#7c4d38': 'warm',
  '#845232': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#ac7c48': 'warm',
  '#b37344': 'warm',
  '#c58747': 'warm',
  '#c68d51': 'warm',
  '#ce9456': 'warm',
  '#dca05e': 'warm',
  '#e2a465': 'warm',
  '#e4af5e': 'warm',
  '#f6c476': 'warm',
};

/** The round bronze clasp on his near shoulder, in front of the scarf. */
export const HOPLITE_CLASP: PaintedPiece = {
  pivot: [5, -2],
  angle: -87.46,
  rows: [
    'aaaa',
    'abca',
    'acba',
    'adea',
    '.aa.',
  ],
  colors: {
    a: '#010216',
    b: '#2e1a1c',
    c: '#ecb064',
    d: '#764830',
    e: '#96603a',
  },
};

/** What each colour of HOPLITE_CLASP is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_CLASP_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2e1a1c': 'warm',
  '#764830': 'warm',
  '#96603a': 'warm',
  '#ecb064': 'warm',
};
