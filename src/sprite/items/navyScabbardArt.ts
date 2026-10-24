// The owner's scabbard on his navy officer, the owner's pixels at our scale (tools/refs/navy-scabbard-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_SCABBARD_CLOTH = '#232d48';
export const NAVY_SCABBARD_GOLD = '#e2aa52';
export const NAVY_SCABBARD_STONE = '#6c1d22';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_SCABBARD_KIND: Record<string, 'cloth' | 'gold' | 'line' | 'skin' | 'stone'> = {
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#11162c': 'cloth',
  '#14141e': 'cloth',
  '#1c223a': 'cloth',
  '#232d48': 'cloth',
  '#252e55': 'cloth',
  '#313a58': 'cloth',
  '#360c18': 'stone',
  '#583229': 'gold',
  '#5c3529': 'skin',
  '#653528': 'skin',
  '#6b513a': 'skin',
  '#6c1d22': 'stone',
  '#6d4830': 'skin',
  '#79502a': 'gold',
  '#7e6040': 'skin',
  '#925e32': 'gold',
  '#a47040': 'gold',
  '#ad7642': 'gold',
  '#c38f50': 'skin',
  '#c8904b': 'gold',
  '#cc945a': 'skin',
  '#daa656': 'gold',
  '#deae5a': 'gold',
  '#e2aa52': 'gold',
  '#eab45c': 'gold',
  '#f8d584': 'gold',
  '#fbd062': 'gold',
  '#fbe990': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_SCABBARD_REST: Record<string, [number, number]> = {
  NAVY_SCABBARD: [97, 168],
};

/** The scabbard, its throat, gold fittings and chape. Its pivot is the cell at its throat, at the scabbard's angle (from the throat to the chape). */
export const NAVY_SCABBARD: PaintedPiece = {
  pivot: [22, 1],
  angle: 126.94,
  rows: [
    '.......................a.',
    '......................aab',
    '.....................acde',
    '.....................afca',
    '....................ahija',
    '.................a.aklmab',
    '.................a.anpaqr',
    '................astsuqbrr',
    '...............arta..artv',
    '..............arrra...r..',
    '..............atwa.......',
    '.............arta........',
    '.............rta.........',
    '..............ra.........',
    '.............ax..........',
    '............ar...........',
    '............a............',
    '...........aw............',
    '..........au.............',
    '..........a..............',
    '.........at..............',
    '........aw...............',
    '.......aw................',
    '......awt................',
    '.....awta................',
    '....atta.................',
    '...atya..................',
    '...aza...................',
    '..aABa...................',
    '.aCDa....................',
    'aEFa.....................',
    'aaa......................',
  ],
  colors: {
    a: '#000316',
    b: '#0c1124',
    c: '#fbe990',
    d: '#7e6040',
    e: '#6b513a',
    f: '#fbd062',
    h: '#79502a',
    i: '#5c3529',
    j: '#583229',
    k: '#6c1d22',
    l: '#c8904b',
    m: '#360c18',
    n: '#daa656',
    p: '#653528',
    q: '#11162c',
    r: '#232d48',
    s: '#ad7642',
    t: '#1c223a',
    u: '#252e55',
    v: '#e2aa52',
    w: '#313a58',
    x: '#c38f50',
    y: '#deae5a',
    z: '#eab45c',
    A: '#cc945a',
    B: '#14141e',
    C: '#f8d584',
    D: '#a47040',
    E: '#925e32',
    F: '#6d4830',
  },
};
