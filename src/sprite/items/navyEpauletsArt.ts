// The owner's shoulder pieces on his navy officer, the owner's pixels at our scale (tools/refs/navy-epaulets-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const EPAULET_CLOTH = '#1c223a';
export const EPAULET_GOLD = '#b27e45';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const EPAULET_KIND: Record<string, 'cloth' | 'gold' | 'line' | 'skin'> = {
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#11162c': 'cloth',
  '#1c223a': 'cloth',
  '#232d48': 'cloth',
  '#5c3529': 'skin',
  '#75462a': 'skin',
  '#754833': 'skin',
  '#7a5136': 'skin',
  '#925e32': 'gold',
  '#926140': 'gold',
  '#986540': 'skin',
  '#9a683e': 'gold',
  '#a26e41': 'skin',
  '#a47040': 'gold',
  '#ad7642': 'gold',
  '#b27e45': 'gold',
  '#b47f49': 'skin',
  '#c18849': 'gold',
  '#c8904b': 'gold',
  '#ce984e': 'gold',
  '#daa656': 'gold',
  '#deae5a': 'gold',
  '#e0b467': 'gold',
  '#e2aa52': 'gold',
  '#fbe990': 'gold',
  '#fce088': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const EPAULET_REST: Record<string, [number, number]> = {
  EPAULET_N: [110, 146],
  EPAULET_F: [132, 147],
};

/** The near shoulder piece, pivoted on his near shoulder. */
export const EPAULET_N: PaintedPiece = {
  pivot: [3, 6],
  angle: 90.00,
  rows: [
    '....aa........',
    '..aabcdddd....',
    '..aefahdddii..',
    '.afedfaciiiiaj',
    '.aeiidfaiieklm',
    '.aeddinapecqlm',
    '.aiiiibarlasii',
    'aftildnfaael..',
    'atduiqireai...',
    'alvwxaaee.....',
    '...a..........',
  ],
  colors: {
    a: '#000316',
    b: '#ce984e',
    c: '#daa656',
    d: '#232d48',
    e: '#0c1124',
    f: '#11162c',
    h: '#deae5a',
    i: '#1c223a',
    j: '#fbe990',
    k: '#754833',
    l: '#a47040',
    m: '#5c3529',
    n: '#c18849',
    p: '#926140',
    q: '#925e32',
    r: '#b27e45',
    s: '#7a5136',
    t: '#986540',
    u: '#b47f49',
    v: '#ad7642',
    w: '#e0b467',
    x: '#e2aa52',
  },
};

/** The far shoulder piece, pivoted on his far shoulder. */
export const EPAULET_F: PaintedPiece = {
  pivot: [2, 4],
  angle: 90.00,
  rows: [
    'abcc....',
    '.cddc...',
    '.ecdfc..',
    '.hcicc..',
    '.hjklbc.',
    '.ibcmjc.',
    '..mccnc.',
    '..bccnc.',
    '...cpcjc',
    '....bbc.',
  ],
  colors: {
    a: '#c8904b',
    b: '#0c1124',
    c: '#000316',
    d: '#232d48',
    e: '#fce088',
    f: '#e0b467',
    h: '#5c3529',
    i: '#1c223a',
    j: '#9a683e',
    k: '#b47f49',
    l: '#75462a',
    m: '#a47040',
    n: '#a26e41',
    p: '#11162c',
  },
};
