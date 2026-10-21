// The owner's Scarlet's eyes, his colours (tools/refs/scarlet-eyes-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const NOBLE_EYE_COLORS: Record<string, string> = {
  a: '#9e654b',
  b: '#846542',
  c: '#be8867',
  d: '#26060d',
  e: '#0f0407',
  f: '#b27758',
  h: '#cfc9c8',
  i: '#c88038',
  j: '#9c5e1a',
  k: '#6f442a',
  l: '#ebe6e4',
  m: '#512619',
  n: '#040405',
  p: '#dcd6d4',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). The near eye is six cells wide and four rows tall, the far one three and three. */
export const NOBLE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the line over the lash, the lash, his white and amber iris, the near one over his lower line and glint. */
  open: {
    near: {
      letters: ['sbBBBB', 'sLLLLB', 'sshidb', 'sBbdwb'],
      rows: ['..abac', '.deeef', '..hij.', '.a.kl.'],
    },
    far: {
      letters: ['bbB', 'LLL', 'dwL'],
      rows: ['..a', 'mnn', 'jpe'],
    },
  },
  /** Reading: the lash comes down a row (the lid's skin above it) over his white and iris, without the glint. */
  lowered: {
    near: {
      letters: ['sbBBBB', 'sbbbbb', 'sLLLLB', 'sBhidb'],
      rows: ['..abac', '......', '.deeef', '.ahij.'],
    },
    far: {
      letters: ['bbB', 'bbL', 'LLL'],
      rows: ['..a', '..n', 'mne'],
    },
  },
  /** Knocked out: under the lash line the eye is shut (skin); the far eye keeps its lash's dark outer end. */
  closed: {
    near: {
      letters: ['sbBBBB', 'sLLLLB', 'ssbbbb', 'sbbbbb'],
      rows: ['..abac', '.deeef', '......', '......'],
    },
    far: {
      letters: ['bbB', 'LLL', 'bbL'],
      rows: ['..a', 'mnn', '..e'],
    },
  },
};

/** His amber, the lit iris: the player's eye colour moves his iris as far. */
export const NOBLE_IRIS = '#c88038';
