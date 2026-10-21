// The owner's kunai on his Cazador 2, his pixels (tools/refs/cazador2-kunai-from-ref.py
// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const KUNAI_STEEL = '#9a9ea9';
export const KUNAI_WRAP = '#5b6074';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const KUNAI_KIND: Record<string, 'line' | 'blade' | 'wrap'> = {
  '#000000': 'line',
  '#04040e': 'line',
  '#050613': 'line',
  '#080818': 'line',
  '#292734': 'wrap',
  '#2c2b37': 'blade',
  '#2f2d3b': 'blade',
  '#33313e': 'blade',
  '#3f3f4b': 'blade',
  '#585b6f': 'blade',
  '#5b6074': 'wrap',
  '#64667a': 'blade',
  '#656a7d': 'blade',
  '#868a96': 'blade',
  '#989ca8': 'blade',
  '#9ca0ab': 'blade',
  '#a2a6b2': 'wrap',
  '#a6a9b5': 'blade',
  '#babdc7': 'blade',
  '#cccfd6': 'blade',
  '#d1d5da': 'blade',
  '#e9eef1': 'blade',
  '#eff3f6': 'blade',
};

/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const KUNAI_REST: Record<string, [number, number]> = {
  KUNAI_ART: [105, 175],
};

/** Her kunai, pinned on the grip and pointing at her angle toward the point. */
export const KUNAI_ART: PaintedPiece = {
  pivot: [4, 5],
  angle: 42.88,
  rows: [
    '.aa..............',
    'bcda.............',
    'adedf............',
    '.ffddf...........',
    '...fddff.........',
    '....fdddf........',
    '.....fdhia.......',
    '......bdjka......',
    '......almmna.....',
    '......aapmqrb....',
    '........apmcsat..',
    '........auppue...',
    '........avppppa..',
    '.........bwppppa.',
    '..........xsyywsa',
    '...........abaaaa',
  ],
  colors: {
    a: '#050613',
    b: '#080818',
    c: '#a2a6b2',
    d: '#5b6074',
    e: '#292734',
    f: '#000000',
    h: '#2c2b37',
    i: '#585b6f',
    j: '#2f2d3b',
    k: '#868a96',
    l: '#33313e',
    m: '#656a7d',
    n: '#a6a9b5',
    p: '#9ca0ab',
    q: '#64667a',
    r: '#d1d5da',
    s: '#babdc7',
    t: '#3f3f4b',
    u: '#989ca8',
    v: '#cccfd6',
    w: '#e9eef1',
    x: '#04040e',
    y: '#eff3f6',
  },
};
