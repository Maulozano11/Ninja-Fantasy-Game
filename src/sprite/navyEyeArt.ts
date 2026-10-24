// The owner's eyes on his navy officer, the owner's pixels at our scale (tools/refs/navy-eyes-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NAVY_EYE_COLORS: Record<string, string> = {
  a: '#000316',
  b: '#c0b5c3',
  c: '#961d21',
  d: '#841014',
  e: '#eae5ef',
  f: '#a21a1c',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const NAVY_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as the reduction gives them: his lash line on the anchor row, his white and red iris under it. */
  open: {
    near: {
      letters: ['LLLLL', 'swiis'],
      rows: ['aaaaa', '.bcd.'],
    },
    far: {
      letters: ['sLL', 'swi'],
      rows: ['.aa', '.ef'],
    },
  },
  /** Reading: the lid comes down over the eye's row (its cells take his lash colour). */
  lowered: {
    near: {
      letters: ['LLLLL', 'sLLLs'],
      rows: ['aaaaa', '.aaa.'],
    },
    far: {
      letters: ['sLL', 'sLL'],
      rows: ['.aa', '.aa'],
    },
  },
  /** Knocked out: the eye shut under his lash colour. */
  closed: {
    near: {
      letters: ['LLLLL', 'sLLLs'],
      rows: ['aaaaa', '.aaa.'],
    },
    far: {
      letters: ['sLL', 'sLL'],
      rows: ['.aa', '.aa'],
    },
  },
};

/** His bright red, the eye colour his iris is painted in: the player's eye colour moves his reds as far. */
export const NAVY_IRIS = '#a21a1c';
