// The owner's Roman general's face and eyes (face and eye shape 'general').
// Lifted from the owner's Roman general (docs/reference/general-head-v2-owner-reference.png) and
// brought down to our scale by tools/refs/general-face-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-face-from-ref.py src/sprite/generalHeadArt.ts

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_SKIN = '#e09868';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_HEAD_REST: Record<string, [number, number]> = {
  GENERAL_HEAD: [117, 126],
};

/** His head, skull to neck: stamped on the face anchor. */
export const GENERAL_HEAD: PaintedPiece = {
  pivot: [6, 10],
  angle: -90.00,
  rows: [
    '.....aaaaa......',
    '...aabbbbbaa....',
    '..cbbbbbbbbba...',
    '..abbbbbbbbba...',
    '.abbbbbbbbbbba..',
    '.abbbbbbbbbbba..',
    '.abbbbbbbbbbda..',
    'abbbbecbfhbbbba.',
    '.abiejkhbbbbbbhi',
    '.ekeehjddddbbhi.',
    '.bieeheaaalibla.',
    '.bejebbmdmebbne.',
    '.bkjhbbbbbbbbeh.',
    '...jhhbbbbbbbjh.',
    '...jkhhbbbbbejh.',
    '...fehhhbbbbhha.',
    '..eaefhhbbfeiha.',
    '..eahijhbbbbka..',
    '..aaakeehbbbba..',
    '....akeehbbbba..',
    '....akeehbbbba..',
    '....akeehbbbba..',
    '....akeehbbbba..',
  ],
  colors: {
    a: '#02021c',
    b: '#e09868',
    c: '#8d5842',
    d: '#341a1e',
    e: '#85443c',
    f: '#b2675c',
    h: '#c77756',
    i: '#70343b',
    j: '#984a44',
    k: '#b47057',
    l: '#26121d',
    m: '#e6e5e1',
    n: '#4e2d26',
  },
};

/** What each colour of GENERAL_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HEAD_KIND: Record<string, 'dark' | 'line' | 'skin' | 'warm' | 'white'> = {
  '#02021c': 'line',
  '#26121d': 'dark',
  '#341a1e': 'warm',
  '#4e2d26': 'warm',
  '#70343b': 'skin',
  '#85443c': 'skin',
  '#8d5842': 'skin',
  '#984a44': 'skin',
  '#b2675c': 'skin',
  '#b47057': 'skin',
  '#c77756': 'skin',
  '#e09868': 'skin',
  '#e6e5e1': 'white',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const GENERAL_EYE_COLORS: Record<string, string> = {
  a: '#02021c',
  b: '#e6e5e1',
  c: '#341a1e',
  d: '#e09868',
  e: '#26121d',
  f: '#4e2d26',
  h: '#85443c',
};

/** His eyes in each lid state, stamped on the template's eye cells from the anchor's row (body.ts drawFace). */
export const GENERAL_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  open: {
    near: {
      letters: ['LLL', 'wdw'],
      rows: ['aaa', 'bcb'],
    },
    far: {
      letters: ['L', 'i'],
      rows: ['e', 'f'],
    },
  },
  lowered: {
    near: {
      letters: ['LLL', 'LLL'],
      rows: ['aaa', 'aaa'],
    },
    far: {
      letters: ['L', 'L'],
      rows: ['e', 'e'],
    },
  },
  closed: {
    near: {
      letters: ['LLL', 'sss'],
      rows: ['aaa', 'ddd'],
    },
    far: {
      letters: ['L', 's'],
      rows: ['e', 'h'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const GENERAL_EYE_AT = { ex: 1, fx: 7 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const GENERAL_IRIS = '#4e2d26';

/** How many rows over ours his head stands on a male body (src/sprite/generalHead.ts). */
export const GENERAL_HEAD_UP = 3;
