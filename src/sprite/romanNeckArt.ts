// The owner's Roman neck, his pixels (tools/refs/roman-neck-from-ref.py from
// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The owner's neck under his Roman face, his pixels: his skin between his chin and the cuirass's collar, and below it each column going on in his lowest pixel between his black line. Its pivot is the cell on the face anchor (it rides the head, as the face does); the game draws it above the neck joint only. */
export const ROMAN_NECK: PaintedPiece = {
  pivot: [1, -10],
  angle: 0.00,
  rows: [
    '.abacde..',
    '...fhiij.',
    'kabfhiijk',
    'kabfhiijk',
    'kabfhiijk',
    'kabfhiijk',
    'kabfhiijk',
    'kabfhiijk',
  ],
  colors: {
    a: '#e7a07e',
    b: '#9f564a',
    c: '#8c4b49',
    d: '#94504d',
    e: '#90504a',
    f: '#b86856',
    h: '#e9b08d',
    i: '#bc7059',
    j: '#884d45',
    k: '#030210',
  },
};
