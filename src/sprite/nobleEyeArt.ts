// The owner's Scarlet's eyes, his colours (tools/refs/scarlet-eyes-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NOBLE_EYE_COLORS: Record<string, string> = {
  a: '#512619',
  b: '#040405',
  c: '#be8867',
  d: '#ebe6e4',
  e: '#c88038',
  f: '#9c5e1a',
  h: '#9e654b',
  i: '#6f442a',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). The near eye is six cells wide and four rows tall, the far one three and three. */
export const NOBLE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the line over the lash, the lash, his white and amber iris, the near one over his lower line and glint. */
  open: {
    near: {
      letters: ['ssBBBs', 'LLLLLB', 'shiidb', 'ssBdds'],
      rows: ['..aaa.', 'bbbbbc', '.deef.', '..hii.'],
    },
    far: {
      letters: ['sBs', 'LLL', 'idL'],
      rows: ['.a.', 'bbb', 'efb'],
    },
  },
  /** Reading: the lash comes down a row (the lid's skin above it) over his white and iris, without the glint. */
  lowered: {
    near: {
      letters: ['ssBBBs', 'bbbbbb', 'LLLLLB', 'shiids'],
      rows: ['..aaa.', '......', 'bbbbbc', '.deef.'],
    },
    far: {
      letters: ['sBs', 'bbL', 'LLL'],
      rows: ['.a.', '..b', 'bbb'],
    },
  },
  /** Knocked out: under the lash line the eye is shut (skin); the far eye keeps its lash's dark outer end. */
  closed: {
    near: {
      letters: ['ssBBBs', 'LLLLLB', 'sbbbbb', 'ssbbbs'],
      rows: ['..aaa.', 'bbbbbc', '......', '......'],
    },
    far: {
      letters: ['sBs', 'LLL', 'bbL'],
      rows: ['.a.', 'bbb', '..b'],
    },
  },
};

/** His amber, the lit iris: the player's eye colour moves his iris as far. */
export const NOBLE_IRIS = '#c88038';
