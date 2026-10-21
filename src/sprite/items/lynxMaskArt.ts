// The owner's half mask and ears on his Cazador 2, his pixels (tools/refs/cazador2-mask-from-ref.py
// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LYNX_PORCELAIN = '#f1e8df';
export const LYNX_PAINT = '#2ca09b';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const LYNX_MASK_KIND: Record<string, 'line' | 'porcelain' | 'paint'> = {
  '#080715': 'line',
  '#080818': 'line',
  '#207f7f': 'paint',
  '#238886': 'paint',
  '#247e7e': 'paint',
  '#2c9999': 'paint',
  '#2ca09b': 'paint',
  '#2ca3a1': 'paint',
  '#2d9a9b': 'paint',
  '#2e9594': 'paint',
  '#2f9d9e': 'paint',
  '#31a4a2': 'paint',
  '#acb8b4': 'porcelain',
  '#c4ab95': 'porcelain',
  '#d0beac': 'porcelain',
  '#d2bda7': 'porcelain',
  '#d47a88': 'porcelain',
  '#d5c3b1': 'porcelain',
  '#dacab9': 'porcelain',
  '#e6d6ca': 'porcelain',
  '#e7dacd': 'porcelain',
  '#efe6db': 'porcelain',
  '#f0eae4': 'porcelain',
  '#f2e9e0': 'porcelain',
  '#f3f0eb': 'porcelain',
};

/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const LYNX_MASK_REST: Record<string, [number, number]> = {
  LYNX_MASK: [123, 143],
  LYNX_EARS: [121, 127],
};

/** The half mask over the lower face, pinned on the face anchor. */
export const LYNX_MASK: PaintedPiece = {
  pivot: [0, -2],
  angle: 0.00,
  rows: [
    'a......a...',
    'bcadaeffhij',
    '.kkkcffflmn',
    '.fcfcccfmpq',
    '.ikkcfffmrs',
    '....fffct..',
    '.....hht...',
  ],
  colors: {
    a: '#2c9999',
    b: '#d5c3b1',
    c: '#efe6db',
    d: '#2e9594',
    e: '#2f9d9e',
    f: '#f2e9e0',
    h: '#dacab9',
    i: '#207f7f',
    j: '#238886',
    k: '#31a4a2',
    l: '#d47a88',
    m: '#e6d6ca',
    n: '#d2bda7',
    p: '#e7dacd',
    q: '#247e7e',
    r: '#d0beac',
    s: '#080818',
    t: '#c4ab95',
  },
};

/** The two small ears over the hair, pinned on the face anchor. */
export const LYNX_EARS: PaintedPiece = {
  pivot: [2, 14],
  angle: 0.00,
  rows: [
    '..a.........a',
    'b.c.......b.d',
    '.edd.......ed',
    '.edfh.....afd',
    '.afd........f',
    '.a...........',
  ],
  colors: {
    a: '#f0eae4',
    b: '#080715',
    c: '#2d9a9b',
    d: '#2ca3a1',
    e: '#f3f0eb',
    f: '#2ca09b',
    h: '#acb8b4',
  },
};
