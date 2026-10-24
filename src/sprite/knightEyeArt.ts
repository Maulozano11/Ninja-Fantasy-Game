// The owner's knights' eyes, his pixels at our scale (tools/refs/knight-eyes-from-ref.py from
// docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py).
// Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const KNIGHT_EYE_COLORS: Record<string, string> = {
  a: '#020206',
  b: '#b8bac7',
  c: '#360e10',
  d: '#fcfdfd',
  e: '#8c403a',
  f: '#9f4f43',
  h: '#d1705b',
  i: '#956860',
  j: '#ced5da',
  k: '#722230',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const KNIGHT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he drew them: the lash line on the anchor row, the glint and the red iris under it. */
  open: {
    near: {
      letters: ['LwLLLL', 'bwdddb'],
      rows: ['abaaac', '.defh.'],
    },
    far: {
      letters: ['LLLL', 'wwdd'],
      rows: ['iaac', 'jjkc'],
    },
  },
  /** Reading: his lash line, the eye under it gone under the lowered lid. */
  lowered: {
    near: {
      letters: ['LLLLLL', 'bbbbbb'],
      rows: ['abaaac', '......'],
    },
    far: {
      letters: ['LLLL', 'bbbb'],
      rows: ['iaac', '....'],
    },
  },
  /** Knocked out: his lash line over the shut eye; under it the face's skin. */
  closed: {
    near: {
      letters: ['LLLLLL', 'bbbbbb'],
      rows: ['abaaac', '......'],
    },
    far: {
      letters: ['LLLL', 'bbbb'],
      rows: ['iaac', '....'],
    },
  },
};

/** The colour his iris is drawn in: the player's eye colour moves it as far. */
export const KNIGHT_IRIS = '#360e10';
