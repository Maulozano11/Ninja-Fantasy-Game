// The owner's samurai obi, his pixels at our scale (tools/refs/samurai-obi-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_OBI_GOLD = '#4a3e3e';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_OBI_KIND: Record<string, 'dark' | 'gold' | 'line' | 'red' | 'steel'> = {
  '#000113': 'line',
  '#261d22': 'dark',
  '#290e24': 'dark',
  '#2c091b': 'dark',
  '#322424': 'dark',
  '#390d1e': 'red',
  '#3b2c27': 'dark',
  '#49111e': 'red',
  '#4a3e3e': 'steel',
  '#4c2b1d': 'dark',
  '#520b1c': 'red',
  '#573522': 'dark',
  '#5d524e': 'steel',
  '#610c23': 'red',
  '#693923': 'dark',
  '#6e4220': 'dark',
  '#74101e': 'red',
  '#7b4a29': 'dark',
  '#817771': 'steel',
  '#82562b': 'gold',
  '#95622c': 'gold',
  '#966235': 'gold',
  '#9e662b': 'gold',
  '#a06736': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_OBI_REST: Record<string, [number, number]> = {
  SAMURAI_OBI: [116, 165],
};

/** His obi: the gold rope sash round the waist and its knot hanging at the front. It rides the torso about the pelvis. */
export const SAMURAI_OBI: PaintedPiece = {
  pivot: [11, 11],
  angle: -89.65,
  rows: [
    '.aa...a..............',
    '.bcaadeadeeeeeeeeeda.',
    '.afhiiiaaaaaaiaiaaaj.',
    '.ffaaafiiiijhhiaiaifa',
    '.afkihaaaffffffaiaala',
    '.afffffffkjkajfifaaia',
    'aammnaaaaaaaifafajbaa',
    'adpqrsmsmeqmiatumaiv.',
    'a.aaaa...a.wiap..a.a.',
    '..........ajiaaa.....',
    '..........aiwvx......',
    '..........ayfvx......',
    '..........aaazz......',
  ],
  colors: {
    a: '#000113',
    b: '#573522',
    c: '#6e4220',
    d: '#261d22',
    e: '#3b2c27',
    f: '#4c2b1d',
    h: '#82562b',
    i: '#95622c',
    j: '#9e662b',
    k: '#7b4a29',
    l: '#693923',
    m: '#390d1e',
    n: '#2c091b',
    p: '#74101e',
    q: '#322424',
    r: '#610c23',
    s: '#520b1c',
    t: '#49111e',
    u: '#290e24',
    v: '#4a3e3e',
    w: '#966235',
    x: '#5d524e',
    y: '#a06736',
    z: '#817771',
  },
};
