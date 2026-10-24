// The owner's bronze cuirass (armor_hoplite).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-armor-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-armor-from-ref.py src/sprite/items/hopliteArmorArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_ARMOR_BRONZE = '#6a3e2c';
export const HOPLITE_ARMOR_STEEL = '#3d3c42';

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
    '..abccdddeffffchia.',
    '..adeejkkhffedleha.',
    '..aaedmmkhnaaaaaaa.',
    '....apmekka........',
    '...aqlkrrrmaa...aa.',
    '...aherkkbbksa.aa..',
    '....atrkrribuvata..',
    '...aewrkkkxwbjytk..',
    '..azeAjjjnnhbiyka..',
    '.asBca...a.anbeea..',
    'asmccCaaanannibDa..',
    'asEEEwmennFFaaaaBa.',
    '.aGGewwwjFaHcdcHba.',
    '.aiIwwwmFJKKqdLJaa.',
    '.aMMcCNEacNLfffLCa.',
    '..aicCNNOfffkkkkfa.',
    '..aPQwNNCmkkjRjjka.',
    '..aMmmbSDmkjjjRjja.',
    '..aqDcCEzmkjRjRRma.',
    '..aiwczOTskjjjjmma.',
    '..aBBwwwwEwkjjjmkwa',
    '..aiUBbwwwkkkmjkka.',
    '..aahBDDawwwwkkwa..',
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
    h: '#4a332e',
    i: '#4e2e25',
    j: '#764830',
    k: '#362222',
    l: '#563234',
    m: '#442824',
    n: '#8e5a36',
    p: '#14111c',
    q: '#403636',
    r: '#e2a465',
    s: '#3c241a',
    t: '#845232',
    u: '#7c4d38',
    v: '#a66e41',
    w: '#6a3e2c',
    x: '#ac7c48',
    y: '#6c4434',
    z: '#1a1a20',
    A: '#ac743a',
    B: '#3a3030',
    C: '#3d3c42',
    D: '#22151a',
    E: '#28272d',
    F: '#dca05e',
    G: '#d7a866',
    H: '#675e60',
    I: '#9d6738',
    J: '#5c565c',
    K: '#6a666c',
    L: '#565255',
    M: '#8e5e40',
    N: '#49484d',
    O: '#464046',
    P: '#96603a',
    Q: '#9c6842',
    R: '#c58747',
    S: '#603c2e',
    T: '#38323e',
    U: '#b37344',
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
  '#2e1a1c': 'warm',
  '#312c32': 'grey',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#3a3030': 'warm',
  '#3c241a': 'warm',
  '#3d3c42': 'grey',
  '#403636': 'warm',
  '#442824': 'warm',
  '#464046': 'grey',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#4e2e25': 'warm',
  '#563234': 'warm',
  '#56342a': 'warm',
  '#565255': 'grey',
  '#5c565c': 'grey',
  '#603c2e': 'warm',
  '#675e60': 'grey',
  '#6a3e2c': 'warm',
  '#6a666c': 'grey',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#845232': 'warm',
  '#8e5a36': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#ac743a': 'warm',
  '#ac7c48': 'warm',
  '#b37344': 'warm',
  '#c58747': 'warm',
  '#ce9456': 'warm',
  '#d7a866': 'warm',
  '#dca05e': 'warm',
  '#e2a465': 'warm',
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
    e: '#8e5a36',
  },
};

/** What each colour of HOPLITE_CLASP is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_CLASP_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2e1a1c': 'warm',
  '#764830': 'warm',
  '#8e5a36': 'warm',
  '#ecb064': 'warm',
};
