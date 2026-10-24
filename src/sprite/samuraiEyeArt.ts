// The owner's samurai eyes, his pixels at our scale (tools/refs/samurai-eyes-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const SAMURAI_EYE_COLORS: Record<string, string> = {
  a: '#000113',
  b: '#ffffff',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const SAMURAI_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the heavy lash line on the anchor row, his pupil in it, the glint under it. */
  open: {
    near: {
      letters: ['LLdLL', 'bwbbb'],
      rows: ['aaaaa', '.b...'],
    },
    far: {
      letters: ['LdL', 'bbw'],
      rows: ['aaa', '..b'],
    },
  },
  /** Reading: his lash line, the glint gone under the lowered lid. */
  lowered: {
    near: {
      letters: ['LLLLL', 'bbbbb'],
      rows: ['aaaaa', '.....'],
    },
    far: {
      letters: ['LLL', 'bbb'],
      rows: ['aaa', '...'],
    },
  },
  /** Knocked out: his lash line over the shut eye; under it the face's skin. */
  closed: {
    near: {
      letters: ['LLLLL', 'bbbbb'],
      rows: ['aaaaa', '.....'],
    },
    far: {
      letters: ['LLL', 'bbb'],
      rows: ['aaa', '...'],
    },
  },
};

/** The colour his pupil is drawn in: the player's eye colour moves it as far. */
export const SAMURAI_IRIS = '#000113';
