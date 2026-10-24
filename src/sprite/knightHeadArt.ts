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
  '#2d0c17': 'red',
  '#3a0e07': 'red',
  '#501e14': 'red',
  '#562423': 'red',
  '#592730': 'red',
  '#693e42': 'dark',
  '#905248': 'red',
  '#9c4f4c': 'red',
  '#9f4f43': 'flame',
  '#aa544b': 'flame',
  '#b06452': 'brown',
  '#b66a5c': 'skin',
  '#bc6965': 'red',
  '#c0685c': 'skin',
  '#c0786c': 'skin',
  '#ca9243': 'gold',
  '#cf7a69': 'skin',
  '#d08666': 'skin',
  '#d18870': 'skin',
  '#d6795f': 'flame',
  '#da8468': 'skin',
  '#e18672': 'skin',
  '#e29474': 'skin',
  '#e2987e': 'skin',
  '#e5b196': 'skin',
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
    'abbbbbbbbcdbbbba.',
    'abbbbbbebbdbbbba.',
    'abbbbbbbbbfbbbba.',
    '.hbbbbbibbjbbbk..',
    '.limnpbbbbbbqerss',
    '.bt.urrbbbbbberss',
    '.shvvrbbbbbbbers.',
    '.wxxylbbbbbbbers.',
    '.zaaAqbbbbbbrrrs.',
    '....sBbbbbrrqrra.',
    '.....CDqbbbbqqa..',
    '.......EFcbhGH...',
    '........aiwwH....',
    '.........a.......',
  ],
  colors: {
    a: '#020206',
    b: '#f2b28c',
    c: '#d08666',
    d: '#d6795f',
    e: '#e2987e',
    f: '#f19c81',
    h: '#eeaa82',
    i: '#b66a5c',
    j: '#e5b196',
    k: '#c0786c',
    l: '#e18672',
    m: '#2d0c17',
    n: '#501e14',
    p: '#c0685c',
    q: '#da8468',
    r: '#e29474',
    s: '#1e090e',
    t: '#b06452',
    u: '#3a0e07',
    v: '#905248',
    w: '#210d18',
    x: '#562423',
    y: '#d18870',
    z: '#ca9243',
    A: '#9f4f43',
    B: '#aa544b',
    C: '#141318',
    D: '#9c4f4c',
    E: '#592730',
    F: '#bc6965',
    G: '#cf7a69',
    H: '#693e42',
  },
};

/** How much higher than ours he drew the head (fine pixels): on the male bodies the game raises the head that far under his face. */
export const KNIGHT_HEAD_UP = 0;

/** Where his eyes start from the face anchor's column: the near eye, the far eye. */
export const KNIGHT_EYE_COLS: [number, number] = [2, 9];
