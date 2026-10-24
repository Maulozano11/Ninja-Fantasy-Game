// The owner's belt on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-belt-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_BELT_LEATHER = '#251724';
export const NOBLE_BELT_GOLD = '#c57f42';

/** What each of his colours is, as the script sorts them (tools/refs/noble_ref.py kind). */
export const NOBLE_BELT_KIND: Record<string, 'gold' | 'leather' | 'line'> = {
  '#000008': 'line',
  '#13111f': 'leather',
  '#141228': 'leather',
  '#1c1326': 'leather',
  '#1d151c': 'leather',
  '#220816': 'leather',
  '#251724': 'leather',
  '#281a1b': 'leather',
  '#30201e': 'leather',
  '#422b35': 'leather',
  '#4b2d23': 'leather',
  '#534239': 'leather',
  '#5d2917': 'leather',
  '#704c44': 'leather',
  '#794a2e': 'gold',
  '#875637': 'gold',
  '#ae703f': 'gold',
  '#bc7c44': 'gold',
  '#c57f42': 'gold',
  '#c8874a': 'gold',
  '#ecac5c': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NOBLE_BELT_REST: Record<string, [number, number]> = {
  NOBLE_BELT: [120, 164],
};

/** The belt and its buckle: it rides the pelvis. */
export const NOBLE_BELT: PaintedPiece = {
  pivot: [7, 12],
  angle: -89.65,
  rows: [
    'aa...........bcd.',
    '.bbbbebb.fbbbcch.',
    'iijekjblmnpicbcc.',
    'biqqqibrnnpccbss.',
    'tbbbbbsbuvbwbbb.s',
  ],
  colors: {
    a: '#13111f',
    b: '#000008',
    c: '#251724',
    d: '#422b35',
    e: '#704c44',
    f: '#c57f42',
    h: '#534239',
    i: '#281a1b',
    j: '#4b2d23',
    k: '#30201e',
    l: '#ecac5c',
    m: '#5d2917',
    n: '#220816',
    p: '#c8874a',
    q: '#1d151c',
    r: '#bc7c44',
    s: '#1c1326',
    t: '#141228',
    u: '#ae703f',
    v: '#794a2e',
    w: '#875637',
  },
};
