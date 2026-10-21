// The owner's Saya's eyes, her colours (tools/refs/saya-eyes-from-ref.py from
// docs/reference/saya-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** Her colours, one character each. */
export const SAYA_EYE_COLORS: Record<string, string> = {
  a: '#7d4c37',
  b: '#14101f',
  c: '#302525',
  d: '#fefefc',
  e: '#0a79c0',
  f: '#1d1d32',
  h: '#088cce',
  i: '#cacdd5',
  j: '#050416',
  k: '#f2f1f1',
};

/** Where each eye's first cell is from the template's eye cells (columns, rows): the near eye's lash tip is a column out and a row up, the far eye's a row up. */
export const SAYA_EYE_AT: Record<'near' | 'far', readonly [number, number]> = { near: [-1, -1], far: [0, -1] };

/** Her eyes in each lid state: open, lowered (reading) and closed (knocked out), from SAYA_EYE_AT: the near eye six cells wide, the far three, both four rows tall. */
export const SAYA_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** Her eyes as he drew them: the thick lash out past the outer corner, her white, blues, pupil and pale grey; the far eye's glint at the face's edge. */
  open: {
    near: {
      letters: ['......', 'LLLLLL', '.Lwidi', '.swiih'],
      rows: ['......', 'abbbbc', '.bdefh', '..dhhi'],
    },
    far: {
      letters: ['..L', 'LLL', 'wLL', 'iLo'],
      rows: ['..j', 'jbb', 'kbb', 'eb.'],
    },
  },
  /** Reading: her lash comes down a row with its tip, over the lower row of her eye. */
  lowered: {
    near: {
      letters: ['......', '.bbbbb', 'LLLLLL', '.swiih'],
      rows: ['......', '......', 'abbbbc', '..dhhi'],
    },
    far: {
      letters: ['...', 'bbo', 'LLL', 'iLo'],
      rows: ['...', '...', 'jbb', 'eb.'],
    },
  },
  /** Knocked out: her lash closes down a row across the shut eye; skin over and under it. */
  closed: {
    near: {
      letters: ['......', '.bbbbb', 'LLLLLL', '.sbbbl'],
      rows: ['......', '......', 'abbbbc', '......'],
    },
    far: {
      letters: ['...', 'bbo', 'LLL', 'bbo'],
      rows: ['...', '...', 'bbb', '...'],
    },
  },
};

/** Her eyes' letters on the template's eye cells alone (the near eye five columns, the far three, three rows from the lash row), in each lid state. */
export const SAYA_EYE_CELLS: Record<'open' | 'lowered' | 'closed', { near: string[]; far: string[] }> = {
  open: { near: ['LLLLL', 'Lwidi', 'swiih'], far: ['LLL', 'wLL', 'iLo'] },
  lowered: { near: ['bbbbb', 'LLLLL', 'swiih'], far: ['bbo', 'LLL', 'iLo'] },
  closed: { near: ['bbbbb', 'LLLLL', 'sbbbl'], far: ['bbo', 'LLL', 'bbo'] },
};

/** Her bright blue, the lit iris: the player's eye colour moves her iris as far. */
export const SAYA_IRIS = '#088cce';
