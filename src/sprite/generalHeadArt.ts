// The owner's Roman general's face and eyes (face and eye shape 'general').
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-face-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-face-from-ref.py src/sprite/generalHeadArt.ts

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_SKIN = '#d2835c';

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
    '....abbbbbccaa....',
    '...adbbbbbccccaa..',
    '..addbbbbbcccceea.',
    '.afddbbbbbcccceeea',
    '.afddhbijklmnjiea.',
    'affddhpqirsssstua.',
    'affddhhqvfssssswa.',
    'affddhrdxxyzAAwBia',
    'affddhChaayjvaaaja',
    '.afDcjssEwFmsGiaja',
    '.afzDHfssssssdIaa.',
    '.afaJmffsssssdKa..',
    '..atwqffssssLDKa..',
    '...arMCffsssMfa...',
    '....awDffssszfa...',
    '....qIdMfsszza....',
    '....asqwNOfIIa....',
    '....amsqDwwJa.....',
    '.....afzCCwOa.....',
    '......aaarrOa.....',
    '.........aaa......',
  ],
  colors: {
    a: '#02021c',
    b: '#a57952',
    c: '#a25f57',
    d: '#783c3a',
    e: '#643e32',
    f: '#c77756',
    h: '#85443c',
    i: '#26121d',
    j: '#4e2d26',
    k: '#3a2024',
    l: '#42241e',
    m: '#b66450',
    n: '#2a1e1c',
    p: '#885336',
    q: '#a05647',
    r: '#aa5b48',
    s: '#e09868',
    t: '#341a1e',
    u: '#10001a',
    v: '#b47057',
    w: '#70343b',
    x: '#1a0a16',
    y: '#b2675c',
    z: '#e79e6c',
    A: '#de8d62',
    B: '#000226',
    C: '#c37050',
    D: '#8e4c40',
    E: '#bcaa9d',
    F: '#b59e88',
    G: '#441b27',
    H: '#b45c4a',
    I: '#d0795a',
    J: '#65383e',
    K: '#d2835c',
    L: '#984a44',
    M: '#623236',
    N: '#452c30',
    O: '#592c2e',
  },
};

/** What each colour of GENERAL_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HEAD_KIND: Record<string, 'dark' | 'line' | 'skin' | 'warm'> = {
  '#000226': 'dark',
  '#02021c': 'line',
  '#10001a': 'dark',
  '#1a0a16': 'dark',
  '#26121d': 'dark',
  '#2a1e1c': 'warm',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#42241e': 'warm',
  '#441b27': 'warm',
  '#452c30': 'warm',
  '#4e2d26': 'warm',
  '#592c2e': 'warm',
  '#623236': 'skin',
  '#643e32': 'skin',
  '#65383e': 'skin',
  '#70343b': 'skin',
  '#783c3a': 'skin',
  '#85443c': 'skin',
  '#885336': 'warm',
  '#8e4c40': 'skin',
  '#984a44': 'skin',
  '#a05647': 'skin',
  '#a25f57': 'skin',
  '#a57952': 'skin',
  '#aa5b48': 'skin',
  '#b2675c': 'skin',
  '#b45c4a': 'warm',
  '#b47057': 'skin',
  '#b59e88': 'skin',
  '#b66450': 'skin',
  '#bcaa9d': 'skin',
  '#c37050': 'warm',
  '#c77756': 'skin',
  '#d0795a': 'skin',
  '#d2835c': 'skin',
  '#de8d62': 'skin',
  '#e09868': 'skin',
  '#e79e6c': 'skin',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const GENERAL_EYE_COLORS: Record<string, string> = {
  a: '#02021c',
  b: '#bcaa9d',
  c: '#70343b',
  d: '#e09868',
  e: '#441b27',
  f: '#26121d',
  h: '#783c3a',
  i: '#d0795a',
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
      rows: ['aa', 'hi'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const GENERAL_EYE_AT = { ex: 2, fx: 7 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const GENERAL_IRIS = '#70343b';

/** How many rows over ours his head stands on a male body (src/sprite/generalHead.ts). */
export const GENERAL_HEAD_UP = 3;
