// The owner's eyes, his pixels (tools/refs/aiden-eyes-from-ref.py from
// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.

/** One of his eyes over our face template's eye cells (5 columns near, 3 far; rows from the face anchor's row). */
export interface PaintedEye {
  /** The template's letters: B brow, L lash, h/w white, d/i iris; o D s b l the face's own skin. */
  letters: string[];
  /** His pixels: one character per colour of his (VALIANT_EYE_COLORS); '.' where the face's skin shows. */
  rows: string[];
}

/** His colours, one character each. */
export const VALIANT_EYE_COLORS: Record<string, string> = {
  a: '#864034',
  b: '#421412',
  c: '#693420',
  d: '#0c0e1e',
  e: '#b0b0bb',
  f: '#0b0b16',
  h: '#fcfffe',
  i: '#8d1325',
  j: '#ba494a',
  k: '#350e0f',
  l: '#0b0912',
  m: '#cfd2d6',
  n: '#64152a',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const VALIANT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he painted them: the brow on the row above the lash line, the white and red iris under it. */
  open: {
    near: {
      letters: ['sBBBb', 'LhLLL', 'swdis'],
      rows: ['.abc.', 'defff', '.hij.'],
    },
    far: {
      letters: ['sBo', 'LLL', 'hdL'],
      rows: ['.k.', 'ffl', 'mnf'],
    },
  },
  /** Reading: the lid comes down over the top of the eye (his fleck of white under the lash takes the lash's colour). */
  lowered: {
    near: {
      letters: ['sBBBb', 'LLLLL', 'swdis'],
      rows: ['.abc.', 'ddfff', '.hij.'],
    },
    far: {
      letters: ['sBo', 'LLL', 'hdL'],
      rows: ['.k.', 'ffl', 'mnf'],
    },
  },
  /** Knocked out: the lash line runs on across the shut eye in his lash colours; under it the face's skin. */
  closed: {
    near: {
      letters: ['sBBBb', 'LLLLL', 'sbbbs'],
      rows: ['.abc.', 'ddfff', '.....'],
    },
    far: {
      letters: ['sBo', 'LLL', 'bbL'],
      rows: ['.k.', 'ffl', '..f'],
    },
  },
};

/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */
export const VALIANT_IRIS = '#d81b2a';

/** His hair's mid brown, which his brows are painted in the browns of: the hair colour moves them as far. */
export const VALIANT_BROW_HAIR = '#76391b';
