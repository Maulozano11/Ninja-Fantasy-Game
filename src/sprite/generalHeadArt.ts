// The owner's Roman general's face and eyes (face and eye shape 'general').
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
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
    '.......aaa........',
    '.....aabbbaa......',
    '....abbbbbbbaa....',
    '...abbbbbbbbbbaa..',
    '..abbbbbbbbbbbbba.',
    '.abbbbbbbbbbbbbcba',
    '.abbbbbbbbbbccbca.',
    'abbbbbbbbbbbbccca.',
    'abbbbbbbbbbbbbcca.',
    'abbbbbbbbbbbcbccca',
    'abbbbbbdaaebfaaaba',
    '.abbbbbbhijbbklaba',
    '.abbbbbbbbbbmccaa.',
    '.ababbbbbbbbmcca..',
    '..abbbbbbbbbmcca..',
    '...abbbbbbbbcca...',
    '....abbbbnnnnca...',
    '....bbbbbbbbca....',
    '....abbbbbbbca....',
    '....abbbbbbba.....',
    '.....abbbbbba.....',
    '......aaabbba.....',
    '.........aaa......',
  ],
  colors: {
    a: '#02021c',
    b: '#e09868',
    c: '#c77756',
    d: '#85443c',
    e: '#b2675c',
    f: '#b47057',
    h: '#bcaa9d',
    i: '#70343b',
    j: '#b59e88',
    k: '#441b27',
    l: '#26121d',
    m: '#984a44',
    n: '#623236',
  },
};

/** What each colour of GENERAL_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HEAD_KIND: Record<string, 'dark' | 'line' | 'skin' | 'warm'> = {
  '#02021c': 'line',
  '#26121d': 'dark',
  '#441b27': 'warm',
  '#623236': 'skin',
  '#70343b': 'skin',
  '#85443c': 'skin',
  '#984a44': 'skin',
  '#b2675c': 'skin',
  '#b47057': 'skin',
  '#b59e88': 'skin',
  '#bcaa9d': 'skin',
  '#c77756': 'skin',
  '#e09868': 'skin',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const GENERAL_EYE_COLORS: Record<string, string> = {
  a: '#02021c',
  b: '#bcaa9d',
  c: '#70343b',
  d: '#e09868',
  e: '#441b27',
  f: '#26121d',
  h: '#c77756',
};

/** His eyes in each lid state, stamped on the template's eye cells from the anchor's row (body.ts drawFace). */
export const GENERAL_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  open: {
    near: {
      letters: ['LL', 'wi'],
      rows: ['aa', 'bc'],
    },
    far: {
      letters: ['LL', 'dd'],
      rows: ['aa', 'ef'],
    },
  },
  lowered: {
    near: {
      letters: ['LL', 'LL'],
      rows: ['aa', 'aa'],
    },
    far: {
      letters: ['LL', 'LL'],
      rows: ['aa', 'aa'],
    },
  },
  closed: {
    near: {
      letters: ['LL', 'ss'],
      rows: ['aa', 'dd'],
    },
    far: {
      letters: ['LL', 'ss'],
      rows: ['aa', 'hh'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const GENERAL_EYE_AT = { ex: 2, fx: 7 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const GENERAL_IRIS = '#70343b';

/** How many rows over ours his head stands on a male body (src/sprite/generalHead.ts). */
export const GENERAL_HEAD_UP = 3;
