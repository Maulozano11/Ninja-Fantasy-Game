// The owner's Cazador 2 face, his pixels (tools/refs/cazador2-head-from-ref.py from
// docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he painted her in (her arms'): a player's skin moves every colour of her face as far. */
export const HUNTRESS_SKIN = '#ebc0a0';

/** Her head (the 'huntress' face shape), his pixels: her forehead, brow, eye band and cheeks as he painted them, the rest (under her hair and mask) continued in her skin and line; the face template draws the eyes and mouth on it. Its pivot is the cell on the face anchor. */
export const HUNTRESS_HEAD: PaintedPiece = {
  pivot: [7, 13],
  angle: 0.00,
  rows: [
    '......aaaaaa.......',
    '....aabbbbbbaa.....',
    '...abbbbbbbbbba....',
    '..abbbbbbbbbbbba...',
    '.acbbbbbbbbbbbbca..',
    '.acbbbbbbbbbbbbca..',
    'acbbbbbbbbbbbbbca..',
    'acbbbbbbbbbbbbbbca.',
    'acbbbbbbbbbbbbbbca.',
    'acbbbbbbbbcbbbbbca.',
    'acbbbbbbbcbdebbbca.',
    'acbbbbbbbbbbbcbbca.',
    'acbbbbbbcffhidfbca.',
    'acbbbbbbbbbbjbbkbba',
    'acbcbbblbbbbmbbbbba',
    '.acbbbbbnpbbdqbrbla',
    '..abbbbbbbbbbbbbca.',
    '...abbbbbbbbbbbbbca',
    '....abbbbbbbbbbbbca',
    '.....abbbbbbbbbcca.',
    '......aaaabbbbba...',
    '..........aaaaa....',
  ],
  colors: {
    a: '#070714',
    b: '#f5be97',
    c: '#d0836b',
    d: '#f5c29e',
    e: '#ecad8a',
    f: '#d08a71',
    h: '#9d534d',
    i: '#2a1c36',
    j: '#c8806e',
    k: '#c87b69',
    l: '#d78f73',
    m: '#c87865',
    n: '#e6a785',
    p: '#f1ba99',
    q: '#958d81',
    r: '#ce7e66',
  },
};
