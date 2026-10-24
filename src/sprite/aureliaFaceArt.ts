// Aurelia's face, the owner's pixels at our scale (tools/refs/aurelia-face-from-ref.py from
// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './items/capeArt';

/**
 * Her face (face shape 'aurelia'): his ear, cheeks, blush, mouth, jaw and chin with his black line, from
 * the lash row down; under her eyes his skin (the eye shapes draw them). Its pivot is her near eye's lash
 * start, on the face anchor.
 */
export const AURELIA_FACE: PaintedPart = {
  pivot: [7, 0],
  rows: [
    '.bdddddcddddccda.',
    '.bcddddcddddddda.',
    '.bdddddcddddddda.',
    '.aaddddddddddfda.',
    '..addddddddddcda.',
    '..adddddddddddca.',
    '...adddcdddeeda..',
    '...aaaaaecddda...',
    '........aaaaa....',
  ],
  colors: {
    a: '#030519',
    b: '#241a23',
    c: '#e4967d',
    d: '#f5c7a6',
    e: '#c07265',
    f: '#fbdac4',
  },
};

/** His lit skin: the player's skin replaces it, his shades, blush and mouth keep their distance from it. */
export const AURELIA_FACE_SKIN = '#f5c7a6';

/** His lines (his black and his ear's dark line): never tinted. */
export const AURELIA_FACE_LINE = 'ab';

/** His far eye's lash starts this many columns after the near one's (ours: 9). */
export const AURELIA_FACE_FAR_EYE = 7;

/** The first column past his face's far line above the lash row, counted from the near eye's (the skull stops before it). */
export const AURELIA_FACE_FAR_LINE = 9;
