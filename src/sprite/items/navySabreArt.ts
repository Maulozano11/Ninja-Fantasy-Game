// The owner's sabre on his navy officer, the owner's pixels at our scale (tools/refs/navy-sabre-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_SABRE_GOLD = '#ad7642';
export const NAVY_SABRE_GRIP = '#2e2634';
export const NAVY_SABRE_JEWEL = '#325082';
export const NAVY_SABRE_STEEL = '#c0b5c3';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_SABRE_KIND: Record<string, 'gold' | 'grip' | 'jewel' | 'line' | 'skin' | 'steel'> = {
  '#000316': 'line',
  '#0c1124': 'grip',
  '#11162c': 'grip',
  '#201d2e': 'grip',
  '#232d48': 'grip',
  '#2e2634': 'grip',
  '#325082': 'jewel',
  '#344b6a': 'jewel',
  '#393c49': 'grip',
  '#3a3e59': 'grip',
  '#3b4260': 'jewel',
  '#683e2e': 'skin',
  '#6d4830': 'skin',
  '#88562f': 'gold',
  '#925e32': 'gold',
  '#9a6534': 'gold',
  '#9a683e': 'gold',
  '#a47040': 'gold',
  '#ad7642': 'gold',
  '#bde1f4': 'jewel',
  '#c0b5c3': 'grip',
  '#ce984e': 'gold',
  '#e8b564': 'gold',
  '#eab45c': 'gold',
  '#eae5ef': 'steel',
  '#f2c46e': 'gold',
  '#f2c55e': 'gold',
  '#f8d584': 'gold',
  '#fce280': 'gold',
  '#fede76': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_SABRE_REST: Record<string, [number, number]> = {
  NAVY_SABRE_HILT: [137, 167],
  NAVY_SABRE_BLADE: [119, 175],
};

/** The hilt: his gold quillons and knuckle bow, the blue jewel, the dark grip. Its pivot is the cell in his far fist, at the blade's angle. */
export const NAVY_SABRE_HILT: PaintedPiece = {
  pivot: [8, 0],
  angle: 128.66,
  rows: [
    '.......a.bc..',
    '.......bdebf.',
    '.......bhbbbb',
    'ij....kbb.l..',
    'bmb..nbb..p..',
    '.bqbrbb..sb..',
    '.bbtdb..sbb..',
    'bubqvjwjbb...',
    'xyzjbjAbb....',
    'vBzxbjb......',
    '.AC..bD......',
    '.b....b......',
  ],
  colors: {
    a: '#11162c',
    b: '#000316',
    c: '#6d4830',
    d: '#0c1124',
    e: '#2e2634',
    f: '#201d2e',
    h: '#3b4260',
    i: '#fce280',
    j: '#a47040',
    k: '#232d48',
    l: '#ce984e',
    m: '#eab45c',
    n: '#3a3e59',
    p: '#f8d584',
    q: '#f2c55e',
    r: '#393c49',
    s: '#f2c46e',
    t: '#fede76',
    u: '#9a6534',
    v: '#ad7642',
    w: '#683e2e',
    x: '#88562f',
    y: '#325082',
    z: '#bde1f4',
    A: '#925e32',
    B: '#344b6a',
    C: '#9a683e',
    D: '#e8b564',
  },
};

/** The blade he did not draw, made of his colours (hidden at rest, as in his picture). Its pivot is the cell in his far fist. */
export const NAVY_SABRE_BLADE: PaintedPiece = {
  pivot: [26, -8],
  angle: 128.66,
  rows: [
    '.................a.',
    '.................a.',
    '................abc',
    '...............abcc',
    '..............abbca',
    '.............abbca.',
    '.............abca..',
    '............abcca..',
    '...........abcca...',
    '..........abbca....',
    '.........abbca.....',
    '.........abca......',
    '........abcca......',
    '.......abcca.......',
    '......abbca........',
    '.....abbca.........',
    '.....abca..........',
    '....abcca..........',
    '...abcca...........',
    '..abbca............',
    '.abbca.............',
    '.abca..............',
    'abcca..............',
    'aaaa...............',
    'aaa................',
  ],
  colors: {
    a: '#000316',
    b: '#c0b5c3',
    c: '#eae5ef',
  },
};
