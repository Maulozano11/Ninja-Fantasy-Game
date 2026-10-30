// The owner's Roman general's face and eyes (face and eye shape 'general').
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-face-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-face-from-ref.py src/sprite/generalHeadArt.ts

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_SKIN = '#c77756';

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
    '.....aabcdaa......',
    '....aedbcdfeaa....',
    '...ahidbcdeeijaa..',
    '..akkldbcdeeijmna.',
    '.alhmlieiefeihmnna',
    '.aejmhjjlppppppqa.',
    'arfjmmpppprsscjta.',
    'arfjmmpppfruurlta.',
    'arfjmmhppedvtsfppa',
    'arflhwetaaittaaapa',
    '.abfppbvxwttvypaza',
    '.arcfwruAuutuusaa.',
    '.avaefrsuAAttwva..',
    '..ailebsuAAttwva..',
    '...alwtrsuttwta...',
    '....awftsuttwsa...',
    '....Bffwtvuuua....',
    '....aBcwwwdBra....',
    '....asrwiljja.....',
    '.....avttlmta.....',
    '......aaaekta.....',
    '.........aaa......',
  ],
  colors: {
    a: '#02021c',
    b: '#a57952',
    c: '#b47057',
    d: '#b2675c',
    e: '#a25f57',
    f: '#b66450',
    h: '#984a44',
    i: '#aa5b48',
    j: '#92524a',
    k: '#8e4c40',
    l: '#a05647',
    m: '#85443c',
    n: '#643e32',
    p: '#26121d',
    q: '#623828',
    r: '#c77756',
    s: '#d2835c',
    t: '#783c3a',
    u: '#de8d62',
    v: '#d0795a',
    w: '#70343b',
    x: '#bcaa9d',
    y: '#441b27',
    z: '#4e2d26',
    A: '#e09868',
    B: '#c37050',
  },
};

/** What each colour of GENERAL_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HEAD_KIND: Record<string, 'dark' | 'line' | 'skin' | 'warm'> = {
  '#02021c': 'line',
  '#26121d': 'dark',
  '#441b27': 'warm',
  '#4e2d26': 'warm',
  '#623828': 'warm',
  '#643e32': 'skin',
  '#70343b': 'skin',
  '#783c3a': 'skin',
  '#85443c': 'skin',
  '#8e4c40': 'skin',
  '#92524a': 'skin',
  '#984a44': 'skin',
  '#a05647': 'skin',
  '#a25f57': 'skin',
  '#a57952': 'skin',
  '#aa5b48': 'skin',
  '#b2675c': 'skin',
  '#b47057': 'skin',
  '#b66450': 'skin',
  '#bcaa9d': 'skin',
  '#c37050': 'warm',
  '#c77756': 'skin',
  '#d0795a': 'skin',
  '#d2835c': 'skin',
  '#de8d62': 'skin',
  '#e09868': 'skin',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const GENERAL_EYE_COLORS: Record<string, string> = {
  a: '#02021c',
  b: '#bcaa9d',
  c: '#70343b',
  d: '#e09868',
  e: '#de8d62',
  f: '#441b27',
  h: '#26121d',
  i: '#d2835c',
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
      rows: ['aa', 'fh'],
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
      rows: ['aa', 'de'],
    },
    far: {
      letters: ['LL', 'ss'],
      rows: ['aa', 'ei'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const GENERAL_EYE_AT = { ex: 2, fx: 7 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const GENERAL_IRIS = '#70343b';

/** How many rows over ours his head stands on a male body (src/sprite/generalHead.ts). */
export const GENERAL_HEAD_UP = 3;
