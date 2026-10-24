// The owner's black belt on his Ren, his pixels (tools/refs/ren-belt-skirt-from-ref.py from
// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NIGHT_BELT_BASE = '#33333d';

/** What each of his colours is, as the script sorts them (tools/refs/ren_ref.py kind). */
export const NIGHT_BELT_KIND: Record<string, 'dark' | 'line'> = {
  '#00010e': 'line',
  '#000212': 'line',
  '#000316': 'line',
  '#0e0d1d': 'dark',
  '#1c1c24': 'dark',
  '#32323a': 'dark',
  '#35363c': 'dark',
  '#4a4c57': 'dark',
  '#4c4e5b': 'dark',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NIGHT_BELT_REST: Record<string, [number, number]> = {
  NIGHT_BELT: [116, 167],
};

/** The broad black belt round the waist: it rides the pelvis, leaning with the torso. */
export const NIGHT_BELT: PaintedPiece = {
  pivot: [11, 9],
  angle: -89.65,
  rows: [
    '.a.................b.',
    'bcabaaabaaaabbbaaaada',
    'bdddecedeceecedddfhia',
    'aiiddddddddddddiidaij',
    'aiiddddddddddddiidbia',
    'jiiidhdddddhdddiidbia',
    'jjjjjbiiiiiiiiiiidaj.',
  ],
  colors: {
    a: '#00010e',
    b: '#000316',
    c: '#4a4c57',
    d: '#35363c',
    e: '#4c4e5b',
    f: '#0e0d1d',
    h: '#32323a',
    i: '#1c1c24',
    j: '#000212',
  },
};
