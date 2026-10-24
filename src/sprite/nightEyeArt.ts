// The owner's eyes on his Ren, his pixels (tools/refs/ren-eyes-from-ref.py from
// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NIGHT_EYE_COLORS: Record<string, string> = {
  a: '#010315',
  b: '#02020e',
  c: '#cfd4da',
  d: '#094a92',
  e: '#693536',
  f: '#fefefd',
  h: '#0c6ac1',
  i: '#1787df',
  j: '#231127',
  k: '#2a78ac',
  l: '#080410',
  m: '#125699',
  n: '#c5cdd5',
  p: '#0c0510',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const NIGHT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he painted them: the lash line on the anchor row, the white and blue iris under it. */
  open: {
    near: {
      letters: ['LLLLL', 'LhddD', 'swiis'],
      rows: ['aabba', 'bcdde', '.fhi.'],
    },
    far: {
      letters: ['LLL', 'LiL', 'dhL'],
      rows: ['baa', 'jkl', 'mnp'],
    },
  },
  /** Reading: the lid comes down over the top row of the eye (its cells take his lash colour). */
  lowered: {
    near: {
      letters: ['LLLLL', 'LLLLD', 'swiis'],
      rows: ['aabba', 'bbbbe', '.fhi.'],
    },
    far: {
      letters: ['LLL', 'LLL', 'dhL'],
      rows: ['baa', 'jjl', 'mnp'],
    },
  },
  /** Knocked out: his lash colour runs across the top row too; under it the face's skin. */
  closed: {
    near: {
      letters: ['LLLLL', 'LLLLD', 'sbbbs'],
      rows: ['aabba', 'bbbbe', '.....'],
    },
    far: {
      letters: ['LLL', 'LLL', 'bbL'],
      rows: ['baa', 'jjl', '..p'],
    },
  },
};

/** His bright blue, the eye colour his iris is painted in: the player's eye colour moves his blues as far. */
export const NIGHT_IRIS = '#1787df';
