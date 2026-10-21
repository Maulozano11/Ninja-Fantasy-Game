// The owner's oni mask and horns on his Cazador 1, his pixels (tools/refs/cazador1-mask-from-ref.py
// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const ONI_PORCELAIN = '#efe6dd';
export const ONI_PAINT = '#c0312a';
export const ONI_EYES = '#231726';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const ONI_MASK_KIND: Record<string, 'line' | 'porcelain' | 'paint' | 'eyes'> = {
  '#000000': 'line',
  '#010201': 'line',
  '#030403': 'line',
  '#060606': 'line',
  '#18121d': 'eyes',
  '#201625': 'eyes',
  '#26192a': 'eyes',
  '#952426': 'paint',
  '#95252b': 'paint',
  '#9b241f': 'paint',
  '#9b2426': 'paint',
  '#a12721': 'paint',
  '#a5282a': 'paint',
  '#a52923': 'paint',
  '#ab2728': 'paint',
  '#b22d27': 'paint',
  '#b42b29': 'paint',
  '#b62f28': 'paint',
  '#bc2e27': 'paint',
  '#be302b': 'paint',
  '#c0a68a': 'porcelain',
  '#c2342a': 'paint',
  '#c32f29': 'paint',
  '#c6382d': 'paint',
  '#c73529': 'paint',
  '#cb3631': 'paint',
  '#cbb197': 'porcelain',
  '#cf3531': 'paint',
  '#cfb39a': 'porcelain',
  '#d03931': 'paint',
  '#d03d35': 'paint',
  '#d1b79d': 'porcelain',
  '#d4bca3': 'porcelain',
  '#e1d3c6': 'porcelain',
  '#efe6dc': 'porcelain',
  '#f0e7e0': 'porcelain',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const ONI_MASK_REST: Record<string, [number, number]> = {
  ONI_MASK: [121, 133],
  ONI_HORNS: [121, 122],
};

/** The porcelain mask over the face, pinned on the face anchor. */
export const ONI_MASK: PaintedPiece = {
  pivot: [2, 6],
  angle: 0.00,
  rows: [
    '.....aa...a...',
    '....bcdddcc...',
    '...bceeeeee...',
    '..bdefhhhhhi..',
    '.ajieeffeefe..',
    '.cjkheeleeem..',
    'bcnkkkheepf..b',
    'bdpfkkkdeekknb',
    'bjfeeeedpeceeb',
    'bcfffeeeqqeeib',
    'bceeeeeeedeerb',
    'bbsefseeftesbb',
    '.amcemusevwxb.',
    '..bcdeeeevybb.',
    '...bbcdcdza..b',
  ],
  colors: {
    a: '#060606',
    b: '#010201',
    c: '#d1b79d',
    d: '#d4bca3',
    e: '#efe6dc',
    f: '#be302b',
    h: '#c2342a',
    i: '#bc2e27',
    j: '#b22d27',
    k: '#201625',
    l: '#18121d',
    m: '#c73529',
    n: '#b62f28',
    p: '#f0e7e0',
    q: '#26192a',
    r: '#cfb39a',
    s: '#c6382d',
    t: '#a52923',
    u: '#c32f29',
    v: '#e1d3c6',
    w: '#a12721',
    x: '#9b241f',
    y: '#cbb197',
    z: '#c0a68a',
  },
};

/** The two red horns over the hair, pinned on the face anchor. */
export const ONI_HORNS: PaintedPiece = {
  pivot: [2, 17],
  angle: 0.00,
  rows: [
    '.a............a.',
    'aa............aa',
    'aba..........aba',
    'aca.........aaba',
    'adba........aeea',
    'afch.......abija',
    '.kjl.........lkm',
    '..............aa',
  ],
  colors: {
    a: '#000000',
    b: '#d03931',
    c: '#cb3631',
    d: '#b42b29',
    e: '#d03d35',
    f: '#9b2426',
    h: '#a5282a',
    i: '#cf3531',
    j: '#95252b',
    k: '#952426',
    l: '#ab2728',
    m: '#030403',
  },
};
