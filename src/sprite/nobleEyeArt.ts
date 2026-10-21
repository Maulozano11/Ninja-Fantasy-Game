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
  m: '#332a1e',
  n: '#512619',
  p: '#040405',
  q: '#dcd6d4',
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
      letters: ['bBL', 'LLL', 'dwL'],
      rows: ['.am', 'npp', 'jqe'],
    },
  },
  /** Reading: the lash comes down a row (the lid's skin above it) over his white and iris, without the glint. */
  lowered: {
    near: {
      letters: ['sbBBBB', 'sbbbbb', 'sLLLLB', 'sBhidb'],
      rows: ['..abac', '......', '.deeef', '.ahij.'],
    },
    far: {
      letters: ['bBL', 'bbL', 'LLL'],
      rows: ['.am', '..p', 'npe'],
    },
  },
  /** Knocked out: under the lash line the eye is shut (skin); the far eye keeps the face's edge. */
  closed: {
    near: {
      letters: ['sbBBBB', 'sLLLLB', 'ssbbbb', 'sbbbbb'],
      rows: ['..abac', '.deeef', '......', '......'],
    },
    far: {
      letters: ['bBL', 'LLL', 'bbL'],
      rows: ['.am', 'npp', '..e'],
    },
  },
};

/** His amber, the lit iris: the player's eye colour moves his iris as far. */
export const NOBLE_IRIS = '#c88038';

/** His skin, the lit face: the line over his lashes is in its browns, so the skin tone moves it as far. */
export const NOBLE_SKIN = '#f8d4b8';
