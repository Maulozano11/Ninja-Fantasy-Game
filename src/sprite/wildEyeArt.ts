// The owner's Joven salvaje eyes, his pixels (tools/refs/youth-eyes-from-ref.py from
// docs/reference/joven-salvaje-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/**
 * One of his eyes whose pixels reach past the face template's eye cells: `rows` (his pixels) and `marks`
 * (what each is: B brow, L lash, h/w white, d/i iris, o D s b l the face's skin) start `at` columns and
 * rows from the template's eye cells; `letters` are the template's own cells, as on PaintedEye.
 */
export interface WideEye extends PaintedEye {
  at: [number, number];
  marks: string[];
}

/** His colours, one character each. */
export const WILD_EYE_COLORS: Record<string, string> = {
  a: '#1c1926',
  b: '#1e1d29',
  c: '#2d0f18',
  d: '#280f18',
  e: '#211723',
  f: '#cbcbcb',
  h: '#c8c6c5',
  i: '#fe8e80',
  j: '#6c0d21',
  k: '#fefef7',
  l: '#b71b32',
  m: '#fffcf3',
  n: '#030203',
  p: '#790e24',
  q: '#ac172f',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const WILD_EYES: Record<'open' | 'lowered' | 'closed', { near: WideEye; far: WideEye }> = {
  /** His eyes as he painted them: the brow over the anchor's row, the lash line under it, two rows of white and iris. */
  open: {
    near: {
      letters: ['sDBBB', 'LLLLL', 'hhidL', 'Dwiiw'],
      at: [-1, -1],
      marks: ['BBBBsls', 'lsDBBBl', 'LLLLLLL', 'LhhidLs', 'lDwiiwl'],
      rows: ['aaaa...', '...baa.', 'accddab', 'efhijc.', '..kllm.'],
    },
    far: {
      letters: ['BBo', 'LLo', 'dho', 'iso'],
      at: [-1, -1],
      marks: ['ssbo', 'sBBo', 'LLLo', 'Ldho', 'liso'],
      rows: ['....', '.ba.', 'acn.', 'cpf.', '.q..'],
    },
  },
  /** Reading: the lid over the eye's top row (his lash's colours); the bottom row shows under it. */
  lowered: {
    near: {
      letters: ['sDBBB', 'LLLLL', 'LLLLL', 'Dwiiw'],
      at: [-1, -1],
      marks: ['BBBBsls', 'lsDBBBl', 'LLLLLLL', 'LLLLLLs', 'lDwiiwl'],
      rows: ['aaaa...', '...baa.', 'accddab', 'eccddc.', '..kllm.'],
    },
    far: {
      letters: ['BBo', 'LLo', 'LLo', 'iso'],
      at: [-1, -1],
      marks: ['ssbo', 'sBBo', 'LLLo', 'LLLo', 'liso'],
      rows: ['....', '.ba.', 'acn.', 'ccn.', '.q..'],
    },
  },
  /** Knocked out: his lash line over the shut eye; under it the face's skin. */
  closed: {
    near: {
      letters: ['sDBBB', 'LLLLL', 'bbbbL', 'Dllll'],
      at: [-1, -1],
      marks: ['BBBBsls', 'lsDBBBl', 'LLLLLLL', 'LbbbbLs', 'lDlllll'],
      rows: ['aaaa...', '...baa.', 'accddab', 'e....c.', '.......'],
    },
    far: {
      letters: ['BBo', 'LLo', 'bbo', 'lso'],
      at: [-1, -1],
      marks: ['ssbo', 'sBBo', 'LLLo', 'Lbbo', 'llso'],
      rows: ['....', '.ba.', 'acn.', 'c...', '....'],
    },
  },
};

/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */
export const WILD_IRIS = '#d81b2a';
