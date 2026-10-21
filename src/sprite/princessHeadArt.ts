// The owner's princess's head shape, his pixels (tools/refs/princess-face-from-ref.py from
// docs/reference/princess-owner-reference.jpg, drawn at our scale). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he painted her head in: a player's skin moves every colour of it as far. */
export const NOBLE_SKIN = '#f6c8aa';

/** The owner's princess's head (the 'noble' face shape), his pixels: her face, nose, mouth and jaw, the hair's shadow down her near cheek and his black line; her skull and near cheek under her hair continued in her skin. The eye options draw her eyes and brows on it; the face template draws no mouth on it. Its pivot is the cell on the face anchor. */
export const NOBLE_HEAD: PaintedPiece = {
  pivot: [7, 13],
  angle: 0.00,
  rows: [
    '......aaaaaa......',
    '....aabbbbbbaa....',
    '...abbbbbbbbbba...',
    '..abbbbbbbbbbbba..',
    '.acbbbbbbbbbbbbca.',
    '.acbbbbbbbbbbbbca.',
    'acbbbbbbbbbbbbbca.',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbcbca',
    'acbbbbbbbbbbbbbdca',
    'acbbbbbbbbbbbbbbea',
    'acbbbbbbbbbbbbbbca',
    'acbbbbbbbbbbbbbbba',
    'acbbbbbbbbbbbbbbba',
    'acbbbbcbbbbbbbbbba',
    '.abbbbdfbbbbbbbbba',
    '.abbbbcbbbbbbbhbba',
    '..abbbcbbbbbbbibba',
    '...aabcbbbbbbbbbda',
    '.....aacbbbjjfbba.',
    '......aacbbbbbba..',
    '......aaakdbbba...',
    '.........lmaaa....',
  ],
  colors: {
    a: '#060317',
    b: '#f6c8aa',
    c: '#e09d84',
    d: '#de9680',
    e: '#e5a78d',
    f: '#d28676',
    h: '#fee6cf',
    i: '#db8d76',
    j: '#ce8071',
    k: '#94526a',
    l: '#5f3543',
    m: '#673a4d',
  },
};
