// The owner's tactical figure's eyes, his pixels at our scale (tools/refs/vanguard-eyes-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const VANGUARD_EYE_COLORS: Record<string, string> = {
  a: '#000116',
  c: '#110319',
  e: '#f8fefe',
  f: '#0c5c9e',
  g: '#165ea0',
  h: '#00011f',
  j: '#093069',
  k: '#0a000e',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const VANGUARD_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the lash, his blue iris and its white glint. */
  open: {
    near: {
      letters: ['bbbb', 'LLLL', 'Lwib', 'bwib'],
      rows: ['....', 'aaaa', 'cef.', '.eg.'],
    },
    far: {
      letters: ['bbb', 'LLL', 'LdL', 'biL'],
      rows: ['...', 'aaa', 'hja', '.gk'],
    },
  },
  /** Reading: the lid down over the top of his iris. */
  lowered: {
    near: {
      letters: ['bbbb', 'LLLL', 'LLLb', 'bwib'],
      rows: ['....', 'aaaa', 'caa.', '.eg.'],
    },
    far: {
      letters: ['bbb', 'LLL', 'LLL', 'biL'],
      rows: ['...', 'aaa', 'haa', '.gk'],
    },
  },
  /** Knocked out: his lash line across the shut eye; round it the face's skin. */
  closed: {
    near: {
      letters: ['bbbb', 'bbbb', 'LLLL', 'bbbb'],
      rows: ['....', '....', 'aaaa', '....'],
    },
    far: {
      letters: ['bbb', 'bbb', 'LLL', 'bbb'],
      rows: ['...', '...', 'aaa', '...'],
    },
  },
};

/** The colour his iris is drawn in: the player's eye colour moves it as far. */
export const VANGUARD_IRIS = '#165ea0';
