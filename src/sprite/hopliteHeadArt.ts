// The owner's bronze warrior's face and eyes (face and eye shape 'hoplite').
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-face-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-face-from-ref.py src/sprite/hopliteHeadArt.ts

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_SKIN = '#c4785e';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_HEAD_REST: Record<string, [number, number]> = {
  HOPLITE_HEAD: [117, 127],
};

/** His head, skull to neck: stamped on the face anchor. */
export const HOPLITE_HEAD: PaintedPiece = {
  pivot: [6, 12],
  angle: -90.00,
  rows: [
    '........aaaaa..........',
    '......aabbbbbaa........',
    '.....abbbbbbbcca.......',
    '....abbbbbbbbccda..a...',
    '...aebbbbbbbbccddaaba..',
    '...aebbbbbbbbccdddbbba.',
    '..aeebbbbbbbbcddddbbbfa',
    '..aeeebccccchiddddfbffa',
    '..aeeeccccccccfffffffa.',
    '.aeeeeejjjjckllbifkmma.',
    'aeeeeeejjnnpkllqqkkmaa.',
    'aeellaeenaaamlkkkllaa..',
    '.aanraeansaaaaatlaaaa..',
    '..alraeeeuvwxylllzAaa..',
    '..alBaeellleCCllDqEEa..',
    '...aFaaaalllllllGrlEaa.',
    '....aaHHallllllECIlaaa.',
    '....aJHuaClllllKqLMaaa.',
    '....aJuCCCklllllNLa....',
    '....aJECCHkllOrrrLa....',
    '...aJHkOOHClkkeBLa.....',
    '...aPHkuPajlklklLa.....',
    '....BCklJJOaEllkPa.....',
    '.....HClOJOOaaaPPa.....',
    '......CkkJJJJPaFFa.....',
    '......aBkJJJJJaqFa.....',
    '......aBultHJJmJFa.....',
    '......aaaaaaaaaaaa.....',
  ],
  colors: {
    a: '#010216',
    b: '#6c4434',
    c: '#7c4d38',
    d: '#e0b66e',
    e: '#d4906e',
    f: '#603c2e',
    h: '#1a1a20',
    i: '#22151a',
    j: '#ae6954',
    k: '#eaaa84',
    l: '#ecb08c',
    m: '#9e5b52',
    n: '#a65a4a',
    p: '#a66356',
    q: '#6c3632',
    r: '#743e37',
    s: '#90574c',
    t: '#9f5249',
    u: '#ca7f63',
    v: '#cec3c0',
    w: '#dbdbd9',
    x: '#d61412',
    y: '#b5aeab',
    z: '#bab8b6',
    A: '#870210',
    B: '#c4785e',
    C: '#d98868',
    D: '#f2d6ae',
    E: '#bb6d56',
    F: '#6f4141',
    G: '#f6cea4',
    H: '#d58063',
    I: '#4e2e25',
    J: '#954e46',
    K: '#ad5d51',
    L: '#e49672',
    M: '#c17e68',
    N: '#e3a275',
    O: '#88463e',
    P: '#8a4e46',
  },
};

/** What each colour of HOPLITE_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_HEAD_KIND: Record<string, 'dark' | 'line' | 'red' | 'skin' | 'warm' | 'white'> = {
  '#010216': 'line',
  '#1a1a20': 'dark',
  '#22151a': 'dark',
  '#4e2e25': 'warm',
  '#603c2e': 'skin',
  '#6c3632': 'skin',
  '#6c4434': 'skin',
  '#6f4141': 'skin',
  '#743e37': 'skin',
  '#7c4d38': 'skin',
  '#870210': 'red',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#a66356': 'skin',
  '#ad5d51': 'skin',
  '#ae6954': 'skin',
  '#b5aeab': 'white',
  '#bab8b6': 'white',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
  '#cec3c0': 'white',
  '#d4906e': 'skin',
  '#d58063': 'skin',
  '#d61412': 'red',
  '#d98868': 'skin',
  '#dbdbd9': 'white',
  '#e0b66e': 'skin',
  '#e3a275': 'skin',
  '#e49672': 'skin',
  '#eaaa84': 'skin',
  '#ecb08c': 'skin',
  '#f2d6ae': 'skin',
  '#f6cea4': 'skin',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const HOPLITE_EYE_COLORS: Record<string, string> = {
  a: '#010216',
  b: '#cec3c0',
  c: '#dbdbd9',
  d: '#d61412',
  e: '#b5aeab',
  f: '#ecb08c',
  h: '#d4906e',
  i: '#d98868',
  j: '#bab8b6',
  k: '#870210',
  l: '#6c3632',
  m: '#bb6d56',
};

/** His eyes in each lid state, stamped on the template's eye cells from the anchor's row (body.ts drawFace). */
export const HOPLITE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  open: {
    near: {
      letters: ['LLLL', 'wwiw'],
      rows: ['aaaa', 'bcde'],
    },
    far: {
      letters: ['LL', 'wd'],
      rows: ['aa', 'jk'],
    },
  },
  lowered: {
    near: {
      letters: ['LLLL', 'LLLL'],
      rows: ['aaaa', 'aaaa'],
    },
    far: {
      letters: ['LL', 'LL'],
      rows: ['aa', 'aa'],
    },
  },
  closed: {
    near: {
      letters: ['LLLL', 'ssss'],
      rows: ['aaaa', 'fhii'],
    },
    far: {
      letters: ['LL', 'ss'],
      rows: ['aa', 'lm'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const HOPLITE_EYE_AT = { ex: 4, fx: 11 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const HOPLITE_IRIS = '#d61412';
