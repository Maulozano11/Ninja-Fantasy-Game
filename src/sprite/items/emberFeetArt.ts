// The owner's near boot and far sandal, his pixels (tools/refs/akira-feet-from-ref.py from
// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const FOOT_LEATHER = '#392620';
export const FOOT_SKIN = '#f0c4a0';

/** What each of his colours is, as the script sorts them. */
export const FOOT_KIND: Record<string, 'leather' | 'line' | 'skin'> = {
  '#00020d': 'line',
  '#010109': 'line',
  '#01020f': 'line',
  '#010313': 'line',
  '#010413': 'line',
  '#232028': 'leather',
  '#251f22': 'line',
  '#261214': 'line',
  '#27222a': 'leather',
  '#291f20': 'leather',
  '#2d2223': 'leather',
  '#2e1918': 'leather',
  '#301c1c': 'leather',
  '#312221': 'leather',
  '#36221d': 'leather',
  '#362b2a': 'leather',
  '#3a2721': 'leather',
  '#3d2d2d': 'leather',
  '#3f2923': 'leather',
  '#44322d': 'leather',
  '#4b372b': 'leather',
  '#4e3930': 'leather',
  '#50392d': 'leather',
  '#543e32': 'leather',
  '#684c40': 'leather',
  '#6c5041': 'leather',
  '#8e7968': 'leather',
  '#a55d51': 'skin',
  '#a96052': 'skin',
  '#ac6556': 'skin',
  '#b16c5e': 'skin',
  '#b56b5b': 'skin',
  '#d58a6e': 'skin',
  '#df9579': 'skin',
  '#e79d7c': 'skin',
  '#eda380': 'skin',
  '#f0ad88': 'skin',
  '#f2b084': 'skin',
  '#f2b28a': 'skin',
  '#f2b68c': 'skin',
};

/** Where each piece lands in Akira's idle frame 0 (male), where he drew it: the fine pixel of its first row's first cell. */
export const FOOT_REST: Record<string, [number, number]> = {
  FOOT_SANDAL_F: [129, 207],
  FOOT_BOOT_N: [107, 208],
};

/** The far sandal pointing right: straps over the instep and toes, the sole. It stands flat under the far ankle. */
export const FOOT_SANDAL_F: PaintedPiece = {
  pivot: [2, 0],
  angle: 98.56,
  rows: [
    '.a...bbc......',
    '.cdedfhfi.....',
    'cdddjklmna....',
    'cfdfhkpmqri...',
    'afddhdstppna..',
    'cffdudvnwduxi.',
    'cnrnddynnklzAa',
    '.ccaanrnnffBBc',
    '.....accaaaaca',
  ],
  colors: {
    a: '#010413',
    b: '#251f22',
    c: '#01020f',
    d: '#232028',
    e: '#4e3930',
    f: '#a96052',
    h: '#d58a6e',
    i: '#010109',
    j: '#b16c5e',
    k: '#f2b68c',
    l: '#f2b084',
    m: '#362b2a',
    n: '#2d2223',
    p: '#3d2d2d',
    q: '#eda380',
    r: '#291f20',
    s: '#27222a',
    t: '#f2b28a',
    u: '#ac6556',
    v: '#e79d7c',
    w: '#44322d',
    x: '#df9579',
    y: '#b56b5b',
    z: '#a55d51',
    A: '#f0ad88',
    B: '#312221',
  },
};

/** The near boot, seen from the front. It stands flat under the near ankle. */
export const FOOT_BOOT_N: PaintedPiece = {
  pivot: [6, -1],
  angle: 104.09,
  rows: [
    '...a...a..',
    '..bacddab.',
    '.eafhicce.',
    '.bfihhhcfe',
    '.bfffffcfb',
    'bffjiikffb',
    'efhlhiikab',
    'efhihhhmde',
    'bnnnpnnnae',
    'edcddcccdb',
    '.bbbbbbbb.',
  ],
  colors: {
    a: '#261214',
    b: '#00020d',
    c: '#3f2923',
    d: '#3a2721',
    e: '#010313',
    f: '#36221d',
    h: '#684c40',
    i: '#6c5041',
    j: '#543e32',
    k: '#50392d',
    l: '#8e7968',
    m: '#4b372b',
    n: '#2e1918',
    p: '#301c1c',
  },
};
