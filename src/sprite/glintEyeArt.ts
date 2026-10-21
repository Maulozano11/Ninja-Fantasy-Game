// The owner's eyes from his Trunks 3 picture, his pixels (tools/refs/trunks-eyes-from-ref.py from
// docs/reference/trunks3-owner-reference.jpg). Generated: rerun the script to change it.
import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const GLINT_EYE_COLORS: Record<string, string> = {
  a: '#5a2225',
  b: '#1a1521',
  c: '#1d1826',
  d: '#211823',
  e: '#cccbc8',
  f: '#dd4e53',
  h: '#780c2b',
  i: '#100d10',
  j: '#fefffe',
  k: '#a61d2d',
  l: '#a21c2d',
  m: '#fbe5cc',
  n: '#fcead6',
  p: '#740c2b',
  q: '#ac1f2f',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const GLINT_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he painted them: the lash line on the anchor row, the white, glint and reds under it. */
  open: {
    near: {
      letters: ['LLLLb', 'LhidL', 'bwiil', 'lbbbb'],
      rows: ['abcc.', 'defhi', '.jklm', 'n....'],
    },
    far: {
      letters: ['sLL', 'LdL', 'hiL'],
      rows: ['.bc', 'cpc', 'eqc'],
    },
  },
  /** Reading: the lid comes down over the top of the eye (the row under the lash takes the lash's colours). */
  lowered: {
    near: {
      letters: ['LLLLb', 'LLLLL', 'bwiil', 'lbbbb'],
      rows: ['abcc.', 'dddii', '.jklm', 'n....'],
    },
    far: {
      letters: ['sLL', 'LLL', 'hiL'],
      rows: ['.bc', 'ccc', 'eqc'],
    },
  },
  /** Knocked out: the lash colours run across the shut eye; under them the face's skin. */
  closed: {
    near: {
      letters: ['LLLLb', 'LLLLL', 'bbbbl', 'lbbbb'],
      rows: ['abcc.', 'dddii', '....m', 'n....'],
    },
    far: {
      letters: ['sLL', 'LLL', 'bbL'],
      rows: ['.bc', 'ccc', '..c'],
    },
  },
};

/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */
export const GLINT_IRIS = '#d81b2a';

/** The skin he painted his lit flecks of lid over: the character's skin moves them as far. */
export const GLINT_SKIN = '#f3c39c';

/** The template column his far eye starts at (ours start at 9): his far eye sits a column further in. */
export const GLINT_FAR_FROM = 8;
