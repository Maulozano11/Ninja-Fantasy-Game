// The owner's Scarlet's head, his colours (tools/refs/scarlet-head-from-ref.py from
// docs/reference/scarlet-owner-reference.jpg, brought down to our scale). Generated: rerun the script to change it.

import type { PaintedPiece } from './painted';

/** The skin colour he drew the head in: a player's skin moves every colour of it as far. */
export const NOBLE_SKIN = '#f8d4b8';

/** The owner's Scarlet's head (the 'noble' face shape), his colours: his face, its warm shading, his smile, his jaw line and pointed chin, his far temple; his skull and near cheek (under his hair) in our tapered head's outline. The eye shape draws the eyes on it. Its pivot is the cell on the face anchor. */
export const NOBLE_HEAD: PaintedPiece = {
  pivot: [7, 13],
  angle: 0.00,
  rows: [
    '.....aaaaaaaa.......',
    '....abbbbbbbba......',
    '..aabbbbbbbbbba.....',
    '..abbbbbbbbbbbba....',
    '.abbbbbbbbbbbbbba...',
    'acbbbbbbbbbbbbbba...',
    'acbbbbbbbbbbbbbbca..',
    'acbbbbbbbbbbbbbbca..',
    'acbbbbbbbbbbbbbbca..',
    'acbbbbbbbbbbbbbbdea.',
    'acbbbbbbbbbbbbbbfda.',
    'acbbbbbbbbbbfbbbhida',
    'acbbbbbbbbbjhbbbhifa',
    'acbbbbbbbhhhhhhhhhhk',
    'accbbbbbhhhhhhbhhhha',
    '.acbbbbbbcbbbbblhifm',
    '..acbbbbbhhbbbbbjcfa',
    '...achhhhhhbbbbbhiia',
    '....achhhhbbbbbdfca.',
    '.....achhhbbbbbdcfa.',
    '......aljibiedbbcfa.',
    '.......elhbbbbifcn..',
    '.......mdpqibbirs...',
    '.........deqqcbm....',
  ],
  colors: {
    a: '#0f0407',
    b: '#f8d4b8',
    c: '#e2af8c',
    d: '#be8867',
    e: '#9e654b',
    f: '#ca9c75',
    h: '#f2c8aa',
    i: '#eabb9d',
    j: '#b27758',
    k: '#332a1e',
    l: '#6f442a',
    m: '#26060d',
    n: '#4e3c2b',
    p: '#846542',
    q: '#512619',
    r: '#70583c',
    s: '#040405',
  },
};
