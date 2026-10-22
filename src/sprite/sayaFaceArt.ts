// The owner's Saya's face in her pixels and colours (tools/refs/saya-face-from-ref.py from
// docs/reference/saya-game-scale-owner-reference.jpg, his picture at our scale). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** Her skin's flat tone: a player's skin moves every skin colour of her face as far (her black line stays). */
export const SAYA_FACE_SKIN = '#f3be9c';

/** Her black line. */
export const SAYA_FACE_LINE = 'k';

/** Her eye cells' column offsets from the anchor: the near eye's first and the far eye's first (her x 48 and x 56). */
export const SAYA_FACE_EYES = { near: 0, far: 8 };

/** The owner's Saya's face (the 'shade' face shape), her pixels: the ear, her cheeks, nose, mouth, jaw and chin, her skin shading and black line, from the forehead between her bangs to the chin ('.' where her hair covers it). Its pivot is the cell on the face anchor (her near eye's lash row). */
export const SAYA_FACE: PaintedPiece = {
  pivot: [4, 2],
  angle: 0,
  rows: [
    '.........s....s',
    '........ss...s.',
    'l...bbbbb...sbk',
    'b...bbbbb..snbk',
    'b...bsbbbbbblbk',
    '.....bbbbbbbbbk',
    '.....bbbbbbbnbk',
    '.....bbbbbbbbbk',
    '.....sbbbnnnbk.',
    '.....ksbbbbbnk.',
    '......kzbbbsk..',
    '.......skkkk...',
  ],
  colors: {
    b: '#f3be9c',
    l: '#f6ccab',
    s: '#d58c76',
    n: '#cc7e69',
    z: '#6d3635',
    k: '#030101',
  },
};
