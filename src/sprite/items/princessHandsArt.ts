// The princess's hands, the owner's pixels at our game's scale (tools/refs/princess-hands-from-ref.py from
// docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His commonest skin tone: the player's skin moves his skin tones from it. */
export const PRINCESS_HAND_SKIN_BASE = '#f6c8aa';

/**
 * Her near hand, open on her skirt, the fingers down and back, with his line round it. It rides the near
 * cuff (PRINCESS_CUFF_N's pivot and angle: our near elbow, our forearm), so where the cuff is as he drew it
 * the hand is too.
 * Its cell (0, 0) is his pixel (29, 53).
 */
export const PRINCESS_HAND_N: PaintedPiece = {
  pivot: [9, -9],
  angle: 103.11,
  rows: [
    '...k.....',
    '..kabbcfk',
    '.kkbcbbba',
    'akebgcabk',
    'kkdgbgaca',
    '..kgck.a.',
    '...kbk...',
    '...kak...',
  ],
  colors: {
    k: '#07051b',
    a: '#060317',
    b: '#f7caad',
    c: '#f6c8aa',
    d: '#e09d84',
    e: '#de9680',
    f: '#d28676',
    g: '#ce8071',
  },
};

/** The characters of PRINCESS_HAND_N's skin tones (the rest is his line). */
export const PRINCESS_HAND_N_SKIN = 'bcdefg';

/**
 * Her far fist round the sceptre's shaft, with the bits of the shaft he shows between and under the
 * fingers: pivot on the sceptre's grip, at the sceptre's angle, drawn over it.
 * Its cell (0, 0) is his pixel (70, 42).
 */
export const PRINCESS_FIST_F: PaintedPiece = {
  pivot: [2, 4],
  angle: -72.47,
  rows: [
    '..a....',
    '.kccak.',
    '.dfbnck',
    '.dlknga',
    '.jambba',
    '.ikehk.',
    'akinca.',
    '....a..',
  ],
  colors: {
    k: '#07051b',
    a: '#060317',
    b: '#f7caad',
    c: '#f6c8aa',
    d: '#e09d84',
    e: '#de9680',
    f: '#d28676',
    g: '#ba6577',
    h: '#b66173',
    i: '#a36a4e',
    j: '#905a41',
    l: '#814644',
    m: '#7c4244',
    n: '#673a4d',
  },
};

/** The characters of PRINCESS_FIST_F's skin tones, and of the shaft's golds and browns in it. */
export const PRINCESS_FIST_F_SKIN = 'bcdefgh';
export const PRINCESS_FIST_F_GOLD = 'ijlmn';
