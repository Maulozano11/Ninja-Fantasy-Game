// Lyra's face, the owner's picture of her at our game scale, his pixels (tools/refs/lyra-face-from-ref.py
// from docs/reference/lyra-game-scale-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPart } from './items/capeArt';

/**
 * Her face (face shape 'fine'): forehead, cheeks, nose shade, mouth, chin and his line round the far
 * side and under the chin, with the skin under her eyes and brows (the eye shapes draw those). Its pivot
 * is her near eye's lash start, on our face anchor.
 */
export const LYRA_FACE: PaintedPart = {
  pivot: [2, 5],
  rows: [
    '.....chhd..',
    '....bhiiif.',
    '....fiiiii.',
    '...giiiiii.',
    '..giiigiigk',
    '..iiiigiigk',
    '..iiiiiiigk',
    '.giiiiiiigk',
    'hiiiiiiieik',
    'hiiiiiiiigk',
    '.fiiiideik.',
    '.ahiiiiifk.',
    '.daagiifkk.',
    '..ddkkkkk..',
  ],
  colors: {
    k: '#010101',
    a: '#75302b',
    b: '#a35449',
    c: '#c26955',
    d: '#d67c6a',
    e: '#d58771',
    f: '#e0896e',
    g: '#de9379',
    h: '#ea987f',
    i: '#fec8a6',
  },
};

/** His skin, the colour the player's skin replaces (his shades and line keep their distance from it). */
export const LYRA_FACE_SKIN = '#fec8a6';
/** His far eye's lash starts this many columns after the near one's (ours: 9). */
export const LYRA_FACE_FAR_EYE = 6;
