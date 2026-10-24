// The owner's knights' face, his pixels at our scale (tools/refs/knight-head-from-ref.py from
// docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const KNIGHT_SKIN = '#f2b28c';

/** What each of his colours is, as the script sorts them (tools/refs/knights_ref.py kind). */
export const KNIGHT_HEAD_KIND: Record<string, 'brown' | 'dark' | 'flame' | 'gold' | 'line' | 'red' | 'skin'> = {
  '#020206': 'line',
  '#141318': 'dark',
  '#1e090e': 'red',
  '#210d18': 'red',
  '#3a0e07': 'red',
  '#501e14': 'red',
  '#562423': 'red',
  '#905248': 'red',
  '#9c4f4c': 'red',
  '#9f4f43': 'flame',
  '#a75757': 'red',
  '#aa544b': 'flame',
  '#b06452': 'brown',
  '#b66a5c': 'skin',
  '#bc6965': 'red',
  '#bd8275': 'skin',
  '#c0685c': 'skin',
  '#ca9243': 'gold',
  '#d08666': 'skin',
  '#d1705b': 'flame',
  '#d18870': 'skin',
  '#d6795f': 'flame',
  '#da8468': 'skin',
  '#e18672': 'skin',
  '#e29474': 'skin',
  '#e2987e': 'skin',
  '#eeaa82': 'skin',
  '#f19c81': 'skin',
  '#f2b28c': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const KNIGHT_HEAD_REST: Record<string, [number, number]> = {
  KNIGHT_HEAD: [119, 125],
};

/** The owner's knights' face (the 'knight' face shape): his skin, nose, mouth and jaw; his forehead continued to a skull under his hair; the skin under his eyes. */
export const KNIGHT_HEAD: PaintedPiece = {
  pivot: [4, 14],
  angle: 0.00,
  rows: [
    '....aaaaaaaa.....',
    '...abbbbbbbba....',
    '..abbbbbbbbbba...',
    '.abbbbbbbbbbbba..',
    '.abbbbbbbbbbbba..',
    'abbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbba.',
    'abbbbbbbbbbbbbba.',
    'abbbbbbbccdbbbba.',
    'abbbbbbebbdbbbba.',
    'abbbbbbbbbfbbbba.',
    '.hbbbbbibbjbbba..',
    '.kl.mnbbbbbbpenqq',
    '.bl.rssbbbbbbenqq',
    '.q..tubbbbbbbenq.',
    '.v.wxkbbbbbbbesq.',
    '.yaazpbbbbbbsssq.',
    '....qAbbbbsspsB..',
    '.....CDEbbbbpB...',
    '........EcbhE....',
    '........aivv.....',
    '.........a.......',
  ],
  colors: {
    a: '#020206',
    b: '#f2b28c',
    c: '#d08666',
    d: '#d6795f',
    e: '#e2987e',
    f: '#d1705b',
    h: '#eeaa82',
    i: '#b66a5c',
    j: '#f19c81',
    k: '#e18672',
    l: '#b06452',
    m: '#501e14',
    n: '#c0685c',
    p: '#da8468',
    q: '#1e090e',
    r: '#3a0e07',
    s: '#e29474',
    t: '#905248',
    u: '#d18870',
    v: '#210d18',
    w: '#562423',
    x: '#bd8275',
    y: '#ca9243',
    z: '#9f4f43',
    A: '#aa544b',
    B: '#a75757',
    C: '#141318',
    D: '#9c4f4c',
    E: '#bc6965',
  },
};

/** How much higher than ours he drew the head (fine pixels): on the male bodies the game raises the head that far under his face. */
export const KNIGHT_HEAD_UP = 0;

/** Where his eyes start from the face anchor's column: the near eye, the far eye. */
export const KNIGHT_EYE_COLS: [number, number] = [2, 9];
