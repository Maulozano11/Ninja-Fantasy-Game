// The owner's Roman eyes, his pixels (tools/refs/roman-eyes-from-ref.py from
// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedEye } from './eyeArt';

/** His colours, one character each. */
export const ROMAN_EYE_COLORS: Record<string, string> = {
  a: '#03071a',
  b: '#06081e',
  c: '#060515',
  d: '#eaeae9',
  e: '#b8363c',
  f: '#68111e',
  h: '#020317',
  i: '#dbdada',
  j: '#781a2a',
  k: '#020411',
};

/** His eyes in each lid state: open, lowered (reading) and closed (knocked out). */
export const ROMAN_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  /** His eyes as he painted them: the brow-and-lash line on the row under the anchor, the white and the irises under it. */
  open: {
    near: {
      letters: ['sbbbb', 'LLLLL', 'swids'],
      rows: ['.....', 'abaac', '.def.'],
    },
    far: {
      letters: ['bbo', 'LLL', 'hdL'],
      rows: ['...', 'aah', 'ijk'],
    },
  },
  /** Reading: his line already runs the width of each eye, so the lowered lid is his open eye. */
  lowered: {
    near: {
      letters: ['sbbbb', 'LLLLL', 'swids'],
      rows: ['.....', 'abaac', '.def.'],
    },
    far: {
      letters: ['bbo', 'LLL', 'hdL'],
      rows: ['...', 'aah', 'ijk'],
    },
  },
  /** Knocked out: his line over the shut eye; under it the face's skin. */
  closed: {
    near: {
      letters: ['sbbbb', 'LLLLL', 'sbbbs'],
      rows: ['.....', 'abaac', '.....'],
    },
    far: {
      letters: ['bbo', 'LLL', 'bbL'],
      rows: ['...', 'aah', '..k'],
    },
  },
};

/** The eye colour he painted his red iris over (our red): the player's eye colour moves his iris as far. */
export const ROMAN_IRIS = '#d81b2a';
