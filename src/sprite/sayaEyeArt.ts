// The owner's Saya's eyes in her pixels and colours (tools/refs/saya-eyes-from-ref.py from
// docs/reference/saya-game-scale-owner-reference.jpg, his picture at our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her colours, one character each. */
export const SAYA_EYE_COLORS: Record<string, string> = {
  a: '#020103',
  b: '#dddad5',
  c: '#1b487b',
  d: '#fcf7f3',
  e: '#3778a4',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), on the template's eye cells: the near eye five cells wide, the far three, both three rows tall ('.' where her skin shows). */
export const SAYA_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes as he drew them: the black lash turning down the outer corner, her whites and blues; the far eye at the face's black line. */
  open: {
    near: {
      letters: ['bLLLL', 'bLwdd', 'sswii'],
      rows: ['.aaaa', '.abcc', '..dee'],
    },
    far: {
      letters: ['sLL', 'sdL', 'lio'],
      rows: ['.aa', '.ca', '.e.'],
    },
  },
  /** Reading: her lash comes down a row over the lower row of her eye. */
  lowered: {
    near: {
      letters: ['bbbbb', 'bLLLL', 'sswii'],
      rows: ['.....', '.aaaa', '..dee'],
    },
    far: {
      letters: ['sbL', 'sLL', 'lio'],
      rows: ['..a', '.aa', '.e.'],
    },
  },
  /** Knocked out: her lash closes down a row across the shut eye; skin over and under it. */
  closed: {
    near: {
      letters: ['bbbbb', 'bLLLL', 'ssbbb'],
      rows: ['.....', '.aaaa', '.....'],
    },
    far: {
      letters: ['sbL', 'sLL', 'lbo'],
      rows: ['..a', '.aa', '...'],
    },
  },
};

/** Her eyes' letters on the template's eye cells, in each lid state. */
export const SAYA_EYE_CELLS: Record<'open' | 'lowered' | 'closed', { near: string[]; far: string[] }> = {
  open: { near: ['bLLLL', 'bLwdd', 'sswii'], far: ['sLL', 'sdL', 'lio'] },
  lowered: { near: ['bbbbb', 'bLLLL', 'sswii'], far: ['sbL', 'sLL', 'lio'] },
  closed: { near: ['bbbbb', 'bLLLL', 'ssbbb'], far: ['sbL', 'sLL', 'lbo'] },
};

/** Her blue: the player's eye colour moves her iris as far. */
export const SAYA_IRIS = '#3778a4';
