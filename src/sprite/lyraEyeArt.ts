// The owner's Lyra's eyes, her colours (tools/refs/lyra-eyes-from-ref.py from
// docs/reference/lyra-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her colours, one character each. */
export const KEEN_EYE_COLORS: Record<string, string> = {
  a: '#04101c',
  b: '#04010d',
  c: '#badac6',
  d: '#133c3b',
  e: '#fbfdfd',
  f: '#4eb570',
  h: '#7ebe90',
  i: '#844440',
  j: '#489b62',
  k: '#300918',
  l: '#691f24',
  m: '#3b0d21',
  n: '#590f26',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows. */
export const KEEN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes at our scale: the lash black over navy, down the outer corner and turning down at the inner one, her mint-shaded white and white, the iris dark teal over bright and light green; the far eye's fleck of white over its green. */
  open: {
    near: {
      letters: ['LLLLb', 'LhddL', 'swiil'],
      rows: ['abaa.', 'acddb', '.efh.'],
    },
    far: {
      letters: ['LLL', 'wLL', 'iLo'],
      rows: ['ibb', 'eaa', 'ja.'],
    },
  },
  /** Reading: her lash comes down a row over the eye; under it the eye's lower row. */
  lowered: {
    near: {
      letters: ['bbbbb', 'LLLLb', 'swiil'],
      rows: ['.....', 'abaa.', '.efh.'],
    },
    far: {
      letters: ['bbb', 'LLL', 'iLo'],
      rows: ['...', 'ibb', 'ja.'],
    },
  },
  /** Knocked out: her lash comes down a row across the shut eye; skin above and under it. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLb', 'sbbbl'],
      rows: ['.....', 'abaa.', '.....'],
    },
    far: {
      letters: ['bbb', 'LLL', 'bbo'],
      rows: ['...', 'ibb', '...'],
    },
  },
};

/** Her brows, in her hair's reds: from `at` (columns, rows) off each eye's first cell and the lash row, her pixels ('.' none). */
export const KEEN_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {
  near: { at: [0, -2], rows: ['kll..', '...mn'] },
  far: { at: [1, -1], rows: ['ik'] },
};

/** Her lit iris green, the colour her iris follows: the player's eye colour moves her iris as far. */
export const KEEN_IRIS = '#4eb570';

/** Her hair's mid red, which her brows are drawn in the reds of: the hair colour moves them as far. */
export const KEEN_BROW_HAIR = '#a6442d';
