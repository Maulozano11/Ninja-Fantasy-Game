// The owner's Lyra's eyes, his pixels and colours (tools/refs/lyra-eyes-from-ref.py from
// docs/reference/lyra-game-scale-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const KEEN_EYE_COLORS: Record<string, string> = {
  a: '#010101',
  b: '#88594e',
  c: '#fefefd',
  e: '#45b476',
  f: '#01573c',
  g: '#7e2e20',
  h: '#0d6849',
  j: '#6f231d',
  k: '#5d221b',
  m: '#852e1a',
  n: '#68251d',
  p: '#76281e',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's own eye cells and rows. */
export const KEEN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His pixels: her black lash over a row of her lash's brown corner, white, green and dark green; the far eye's brown and black lash over its white and dark green, closed by his face line. */
  open: {
    near: {
      letters: ['LLLLs', 'Lwidb', 'sbbbb'],
      rows: ['aaaa.', 'bcef.', '.....'],
    },
    far: {
      letters: ['LLL', 'wdL', 'bso'],
      rows: ['gaa', 'cha', '...'],
    },
  },
  /** Reading: her lash comes down a row, over where the white and iris were; skin above it. */
  lowered: {
    near: {
      letters: ['ssssb', 'LLLLs', 'sbbbb'],
      rows: ['.....', 'aaaa.', '.....'],
    },
    far: {
      letters: ['bbb', 'LLL', 'bso'],
      rows: ['...', 'gaa', '...'],
    },
  },
  /** Knocked out: her lash comes down a row, its brown corner turning down under its outer end. */
  closed: {
    near: {
      letters: ['ssssb', 'LLLLs', 'Lbbbb'],
      rows: ['.....', 'aaaa.', 'b....'],
    },
    far: {
      letters: ['bbb', 'LLL', 'bso'],
      rows: ['...', 'gaa', '...'],
    },
  },
};

/** Her brows, his pixels in her hair's reds: from `at` (columns, rows) off each eye's first cell and the lash row ('.' none). */
export const KEEN_BROWS: Record<'near' | 'far', { at: readonly [number, number]; rows: string[] }> = {
  near: { at: [1, -1], rows: ['jkmn'] },
  far: { at: [1, -1], rows: ['p'] },
};

/** Her green, the colour her iris follows: the player's eye colour moves her iris as far. */
export const KEEN_IRIS = '#45b476';

/** Her hair's mid red, which her brows are drawn in the reds of: the hair colour moves them as far. */
export const KEEN_BROW_HAIR = '#a33e27';
