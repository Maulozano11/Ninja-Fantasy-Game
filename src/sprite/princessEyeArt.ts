// The owner's princess's eyes, his pixels and colours (tools/refs/princess-eyes-from-ref.py from
// docs/reference/princess-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NOBLE_EYE_COLORS: Record<string, string> = {
  a: '#060317',
  b: '#9e5c9b',
  c: '#dbc8ec',
  e: '#87529e',
  f: '#422062',
  g: '#fdfdfd',
  h: '#24103f',
  j: '#935daf',
  k: '#9054a0',
  m: '#e3d4f0',
  n: '#673a4d',
  p: '#d28676',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows,
and her lash's outer flick at (columns, rows) off the near eye's first cell and the lash row. */
export const NOBLE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye; flick: { at: readonly [number, number]; ch: string } }> = {
  /** His pixels: her black lash with its violet inner end over her pale lilac light, violet, dark violet and the lash coming down at both corners; under them her white and violet. The far eye: its violet and black lash, dark violet and violet, violet and pale lilac light, closed by her face line. */
  open: {
    near: {
      letters: ['LLLLL', 'LhidL', 'swiib'],
      rows: ['aaaab', 'acefa', '.gee.'],
    },
    far: {
      letters: ['LLL', 'diL', 'iho'],
      rows: ['baa', 'hja', 'km.'],
    },
    flick: { at: [-1, 0], ch: 'n' },
  },
  /** Reading: her lash comes down a row, over her lights and dark violet; under it the bottom row of her eye, the gaze down. */
  lowered: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'swiib'],
      rows: ['.....', 'aaaab', '.gee.'],
    },
    far: {
      letters: ['bbb', 'LLL', 'iho'],
      rows: ['...', 'baa', 'km.'],
    },
    flick: { at: [-1, 1], ch: 'n' },
  },
  /** Knocked out: her lash comes down a row; under it the face's skin. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'sbbbb'],
      rows: ['.....', 'aaaab', '.....'],
    },
    far: {
      letters: ['bbb', 'LLL', 'bbo'],
      rows: ['...', 'baa', '...'],
    },
    flick: { at: [-1, 1], ch: 'n' },
  },
};

/** Her brows, his pixels in a soft rose: from `at` (columns, rows) off each eye's first cell and the lash row ('.' none). */
export const NOBLE_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {
  near: { at: [3, -1], rows: ['ppp'] },
  far: { at: [0, -1], rows: ['pp'] },
};

/** Her violet, the colour her iris follows: the player's eye colour moves her iris as far. */
export const NOBLE_IRIS = '#87529e';

/** Her colours that move with the eye colour: her violets, her lights and her lash's violet ends. */
export const NOBLE_IRIS_TINTED = 'bcefhjkm';
