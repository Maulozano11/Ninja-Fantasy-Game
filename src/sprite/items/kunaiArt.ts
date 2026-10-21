// The owner's kunai on his Renegade, his pixels (tools/refs/renegade-kunai-from-ref.py from
// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const KUNAI_STEEL = '#8f8c93';
export const KUNAI_WRAP = '#7f5332';

/** What each of his colours is: his line, skin, hair, cloth, or the kunai's metal and rust. */
export const KUNAI_KIND: Record<string, 'line' | 'skin' | 'hair' | 'cloth' | 'metal' | 'rust'> = {
  '#000000': 'line',
  '#121420': 'line',
  '#130f17': 'line',
  '#16151b': 'line',
  '#161621': 'line',
  '#190e0f': 'line',
  '#191b28': 'metal',
  '#1a1a24': 'metal',
  '#636269': 'metal',
  '#71707d': 'metal',
  '#723b18': 'rust',
  '#74370e': 'rust',
  '#757680': 'metal',
  '#7a5132': 'rust',
  '#7f5332': 'rust',
  '#824218': 'rust',
  '#82552b': 'rust',
  '#858592': 'metal',
  '#8b8d99': 'metal',
  '#8f8c93': 'metal',
  '#925224': 'rust',
  '#9e8669': 'rust',
  '#a3a8bc': 'metal',
  '#a5a37e': 'metal',
  '#b09877': 'rust',
  '#b9becc': 'metal',
  '#bec0cc': 'metal',
  '#c1a778': 'rust',
  '#c1c5cc': 'metal',
  '#d3cdb0': 'metal',
  '#d8d2bf': 'metal',
  '#e3e4e8': 'metal',
  '#fdfdfb': 'metal',
  '#feffff': 'metal',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const KUNAI_REST: Record<string, [number, number]> = {
  KUNAI_PIECE: [101, 175],
};

/** His kunai: the ring above the fist, the handle under it, the blade hanging at our idle angle. */
export const KUNAI_PIECE: PaintedPiece = {
  pivot: [5, 5],
  angle: 52.00,
  rows: [
    '.aa...........',
    'bbcd..........',
    'ac.ed.........',
    '...ffd........',
    '...deed.......',
    '....dffd......',
    '.....dee......',
    '......df......',
    '.......dhaaa..',
    '.......aijklm.',
    '.......anpqrsa',
    '.......atuvwka',
    '.......axywzsA',
    '........BCDEFa',
    '........bmGGHb',
    '........IIIJma',
    '.............J',
  ],
  colors: {
    a: '#161621',
    b: '#1a1a24',
    c: '#190e0f',
    d: '#000000',
    e: '#74370e',
    f: '#82552b',
    h: '#8f8c93',
    i: '#7f5332',
    j: '#c1a778',
    k: '#feffff',
    l: '#d3cdb0',
    m: '#191b28',
    n: '#757680',
    p: '#c1c5cc',
    q: '#a5a37e',
    r: '#fdfdfb',
    s: '#e3e4e8',
    t: '#8b8d99',
    u: '#636269',
    v: '#b9becc',
    w: '#bec0cc',
    x: '#7a5132',
    y: '#858592',
    z: '#9e8669',
    A: '#121420',
    B: '#824218',
    C: '#925224',
    D: '#71707d',
    E: '#b09877',
    F: '#a3a8bc',
    G: '#723b18',
    H: '#d8d2bf',
    I: '#130f17',
    J: '#16151b',
  },
};
