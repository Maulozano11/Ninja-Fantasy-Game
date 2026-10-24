// The owner's eyes on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-eyes-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NOBLE_EYE_COLORS: Record<string, string> = {
  a: '#000008',
  b: '#cac6ce',
  c: '#901020',
  d: '#17030e',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const NOBLE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as the reduction gives them: his lash line on the anchor row, his white and red iris under it. */
  open: {
    near: {
      letters: ['LLLLL', 'swiLd'],
      rows: ['aaaaa', '.bcad'],
    },
    far: {
      letters: ['LLL', 'siL'],
      rows: ['aaa', '.ca'],
    },
  },
  /** Reading: the lid comes down over the eye's row (its cells take his lash colour). */
  lowered: {
    near: {
      letters: ['LLLLL', 'sLLLL'],
      rows: ['aaaaa', '.aaaa'],
    },
    far: {
      letters: ['LLL', 'sLL'],
      rows: ['aaa', '.aa'],
    },
  },
  /** Knocked out: the eye shut under his lash colour. */
  closed: {
    near: {
      letters: ['LLLLL', 'sLLLL'],
      rows: ['aaaaa', '.aaaa'],
    },
    far: {
      letters: ['LLL', 'sLL'],
      rows: ['aaa', '.aa'],
    },
  },
};

/** His bright red, the eye colour his iris is painted in: the player's eye colour moves his reds as far. */
export const NOBLE_IRIS = '#901020';
