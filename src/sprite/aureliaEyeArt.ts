// Aurelia's eyes, the owner's pixels at our scale (tools/refs/aurelia-eyes-from-ref.py from
// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const DAWN_EYE_COLORS: Record<string, string> = {
  a: '#070c24',
  b: '#573c31',
  c: '#235384',
  d: '#286794',
  e: '#4e9eca',
  f: '#6bb5d7',
  g: '#dfe2e5',
  h: '#f3eee9',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows. */
export const DAWN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes as he drew them: the navy lash with its brown outer tip; his greyed white and blue; his white and light blues. */
  open: {
    near: {
      letters: ['LLLLb', 'Lhddb', 'swiib'],
      rows: ['baaa.', 'bgcc.', '.hdf.'],
    },
    far: {
      letters: ['LLo', 'dLo', 'iLo'],
      rows: ['aa.', 'ca.', 'ea.'],
    },
  },
  /** Reading: his lash comes down a row over the eye; under it the eye's lower row. */
  lowered: {
    near: {
      letters: ['bbbbb', 'LLLLb', 'swiib'],
      rows: ['.....', 'baaa.', '.hdf.'],
    },
    far: {
      letters: ['bbo', 'LLo', 'iLo'],
      rows: ['...', 'aa.', 'ea.'],
    },
  },
  /** Knocked out: his lash across the shut eye, the face's skin above and under it. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLb', 'sbbbb'],
      rows: ['.....', 'baaa.', '.....'],
    },
    far: {
      letters: ['bbo', 'LLo', 'bbo'],
      rows: ['...', 'aa.', '...'],
    },
  },
};

/** His blue, the colour her iris follows: the player's eye colour moves her iris as far. */
export const DAWN_IRIS = '#235384';
