// Aurelia's small hands (the female bodies' hands: 'small'), the owner's pixels from his picture of her
// at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg), by
// tools/refs/aurelia-hands-from-ref.py. Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** His lit skin on her hands: a body's skin recolours them from it (at it they stay his). */
export const DAWN_HAND_SKIN = '#f7c8a5';
/** His line (never recoloured). */
export const DAWN_HAND_LINE = '#030518';

/** Her open near hand below her cuff (pivot: the near wrist; angle: the near forearm at idle). */
export const DAWN_HAND_NEAR: PaintedPiece = {
  pivot: [5, 2],
  angle: 102.53,
  rows: [
    '....kk.',
    '..kkckk',
    'kkbaack',
    'kbaacak',
    'kdackak',
    'kddckkk',
    '.kdc...',
    '..kk...',
  ],
  colors: { a: '#f7c8a5', b: '#e29b82', c: '#df947d', d: '#c47d6e', k: '#030518' },
};

/** Her far fist as he drew it round the staff, the shaft left out (pivot: the far wrist; angle: the far forearm at idle): the small fist on either arm. */
export const DAWN_HAND_FIST: PaintedPiece = {
  pivot: [3, 3],
  angle: 70.71,
  rows: [
    '.kkkk.',
    'kdcbk.',
    'kecack',
    '.kbkck',
    '.kbkkk',
    '.kkk..',
  ],
  colors: { a: '#f7c8a5', b: '#e29b82', c: '#df947d', d: '#c47d6e', e: '#c17568', k: '#030518' },
};
