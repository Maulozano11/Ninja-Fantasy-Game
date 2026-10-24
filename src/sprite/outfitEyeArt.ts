// The owner's eyes from his three outfits, his pixels at our scale (tools/refs/outfits-eyes-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const OUTFIT_EYE_COLORS: Record<string, string> = {
  a: '#000116',
  c: '#0a000e',
  e: '#bacbd6',
  f: '#083d78',
  g: '#f8fefe',
  h: '#0c5c9e',
  j: '#1c70b5',
  k: '#141a2a',
  m: '#5080ab',
  n: '#00011f',
  p: '#23467a',
  q: '#110319',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const OUTFIT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the lash, his blue iris and its white glint. */
  open: {
    near: {
      letters: ['LLLLb', 'LwddL', 'bwiib'],
      rows: ['acaa.', 'aeffa', '.ghj.'],
    },
    far: {
      letters: ['bLL', 'LiL', 'dLL'],
      rows: ['.aa', 'kmn', 'pqq'],
    },
  },
  /** Reading: the lid down over the top of his iris. */
  lowered: {
    near: {
      letters: ['LLLLb', 'LLLLL', 'bwiib'],
      rows: ['acaa.', 'aaaaa', '.ghj.'],
    },
    far: {
      letters: ['bLL', 'LLL', 'dLL'],
      rows: ['.aa', 'kan', 'pqq'],
    },
  },
  /** Knocked out: his lash line across the shut eye; round it the face's skin. */
  closed: {
    near: {
      letters: ['bbbbb', 'LLLLL', 'bbbbb'],
      rows: ['.....', 'aaaaa', '.....'],
    },
    far: {
      letters: ['bbb', 'LLL', 'bbb'],
      rows: ['...', 'aaa', '...'],
    },
  },
};

/** The colour his iris is drawn in: the player's eye colour moves it as far. */
export const OUTFIT_IRIS = '#0c5c9e';
