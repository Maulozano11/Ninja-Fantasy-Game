// The owner's Cazador 2 eyes, his pixels (tools/refs/cazador2-eyes-from-ref.py from
// docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her colours, one character each. */
export const HUNTRESS_EYE_COLORS: Record<string, string> = {
  a: '#060614',
  b: '#2b0d16',
  c: '#350e16',
  d: '#f9efe6',
  e: '#322536',
  f: '#2e303e',
  h: '#749084',
  i: '#7ca396',
  j: '#703536',
  k: '#1f2d3c',
  l: '#8c7f7e',
  m: '#718976',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const HUNTRESS_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes as he painted them: the lash line on the anchor row, the white and dark iris under it, her light iris under that. */
  open: {
    near: {
      letters: ['LLLLL', 'sLwdd', 'sbbii'],
      rows: ['abaaa', '.cdef', '...hi'],
    },
    far: {
      letters: ['sLL', 'Ldh', 'sio'],
      rows: ['.aa', 'jkl', '.m.'],
    },
  },
  /** Reading: the lid comes down a row, her lash line over the white and the dark iris. */
  lowered: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'sbbii'],
      rows: ['.....', 'acaaa', '...hi'],
    },
    far: {
      letters: ['sbb', 'LLL', 'sio'],
      rows: ['...', 'jaa', '.m.'],
    },
  },
  /** Knocked out: the lid down a row as when reading, the face's skin over and under it. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'sbbbb'],
      rows: ['.....', 'acaaa', '.....'],
    },
    far: {
      letters: ['sbb', 'LLL', 'sbo'],
      rows: ['...', 'jaa', '...'],
    },
  },
};

/** Her light iris, the eye colour her iris is painted in: the player's eye colour moves her iris as far. */
export const HUNTRESS_IRIS = '#7ca396';
