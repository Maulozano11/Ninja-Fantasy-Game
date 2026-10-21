// Aurelia's eyes, the owner's pixels brought down to our scale (tools/refs/aurelia-eyes-from-ref.py
// from docs/reference/aurelia-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her colours, one character each. */
export const DAWN_EYE_COLORS: Record<string, string> = {
  a: '#130f17',
  b: '#06285b',
  c: '#36221f',
  d: '#226ba3',
  e: '#329cbd',
  f: '#5897c6',
  g: '#a9968b',
  h: '#eadeca',
  i: '#ffffff',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows. */
export const DAWN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes at our scale: the lash row with its brown inner tip; her white, blue, pupil and light blue; her shaded white, cyan and cream. */
  open: {
    near: {
      letters: ['LLLLL', 'Lwddi', 'shiih'],
      rows: ['aaaac', 'aidbf', '.geeh'],
    },
    far: {
      letters: ['LLo', 'iLo', 'dLo'],
      rows: ['aa.', 'fa.', 'da.'],
    },
  },
  /** Reading: her lash comes down a row over the eye; under it the eye's lower row. */
  lowered: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'shiih'],
      rows: ['.....', 'aaaac', '.geeh'],
    },
    far: {
      letters: ['bbo', 'LLo', 'dLo'],
      rows: ['...', 'aa.', 'da.'],
    },
  },
  /** Knocked out: her lash across the shut eye, the face's skin above and under it. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'sbbbl'],
      rows: ['.....', 'aaaac', '.....'],
    },
    far: {
      letters: ['bbo', 'LLo', 'bbo'],
      rows: ['...', 'aa.', '...'],
    },
  },
};

/** Her mid blue, the colour her iris follows: the player's eye colour moves her iris as far. */
export const DAWN_IRIS = '#226ba3';
