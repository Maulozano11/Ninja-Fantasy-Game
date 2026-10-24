// The owner's heroine knights' eyes, his pixels at our scale (tools/refs/hk-eyes-from-ref.py from
// docs/reference/heroine-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/heroine_knights_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const HK_EYE_COLORS: Record<string, string> = {
  a: '#000100',
  b: '#c88f7c',
  c: '#e6d1c9',
  d: '#f6fdf7',
  e: '#30ab7b',
  f: '#085a43',
  h: '#d3c4a8',
  i: '#80372f',
  j: '#42191f',
  k: '#88b6ab',
  m: '#106650',
};

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const HK_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes as he drew them: his lash line on the anchor row, his whites and green iris under it. */
  open: {
    near: {
      letters: ['LLLLb', 'hwidh'],
      rows: ['aaaab', 'cdefh'],
    },
    far: {
      letters: ['bbL', 'whi'],
      rows: ['ija', 'dkm'],
    },
  },
  /** Reading: his lash line, the eye under the lowered lid the face's skin. */
  lowered: {
    near: {
      letters: ['LLLLb', 'bbbbb'],
      rows: ['aaaab', '.....'],
    },
    far: {
      letters: ['bbL', 'bbb'],
      rows: ['ija', '...'],
    },
  },
  /** Knocked out: his lash line over the shut eye; under it the face's skin. */
  closed: {
    near: {
      letters: ['LLLLb', 'bbbbb'],
      rows: ['aaaab', '.....'],
    },
    far: {
      letters: ['bbL', 'bbb'],
      rows: ['ija', '...'],
    },
  },
};

/** The colour his iris is painted in: the player's eye colour moves it as far. */
export const HK_IRIS = '#30ab7b';
