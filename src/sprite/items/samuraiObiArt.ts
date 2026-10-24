// The owner's samurai obi, his pixels at our scale (tools/refs/samurai-obi-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_OBI_GOLD = '#4c2b1d';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_OBI_KIND: Record<string, 'dark' | 'gold' | 'hair' | 'line' | 'red' | 'steel'> = {
  '#000113': 'line',
  '#120416': 'line',
  '#131722': 'hair',
  '#1a0e1d': 'dark',
  '#230d19': 'dark',
  '#290e24': 'dark',
  '#322424': 'dark',
  '#390d1e': 'red',
  '#3b2c27': 'dark',
  '#413736': 'steel',
  '#49111e': 'red',
  '#4a3e3e': 'steel',
  '#4c2b1d': 'dark',
  '#520b1c': 'red',
  '#573522': 'dark',
  '#5d524e': 'steel',
  '#5e3c2c': 'dark',
  '#603621': 'dark',
  '#610c23': 'red',
  '#69382c': 'dark',
  '#6e4220': 'dark',
  '#74101e': 'red',
  '#7b4a29': 'dark',
  '#7e111d': 'red',
  '#82562b': 'gold',
  '#8b5428': 'dark',
  '#911e23': 'red',
  '#95622c': 'gold',
  '#966235': 'gold',
  '#9e662b': 'gold',
  '#a06736': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_OBI_REST: Record<string, [number, number]> = {
  SAMURAI_OBI: [115, 165],
};

/** His obi: the gold rope sash round the waist and its knot hanging at the front. It rides the torso about the pelvis. */
export const SAMURAI_OBI: PaintedPiece = {
  pivot: [12, 11],
  angle: -89.65,
  rows: [
    'aaa...a................',
    'abacbbddddefaahddadadd.',
    'abbaaabbbidjhbacdddabba',
    'aabddkaabbbbbbbabbbaaa.',
    'abablhldaaaabmbbabbadd.',
    'aabbbbnpbjdqaajbbabaaba',
    'aaaaabbbbbbbaddbabbbab.',
    '.arstaaaaaaabdbabbabcaa',
    '.aupvwmwnasxydarrwzada.',
    '.a........aydaaAuB.a...',
    '..........ajdaaaaa.....',
    '..........bdyaCDEFa....',
    '.........aGcbaCCEF.....',
    '..........jjbaaaaa.....',
  ],
  colors: {
    a: '#000113',
    b: '#4c2b1d',
    c: '#573522',
    d: '#95622c',
    e: '#5e3c2c',
    f: '#69382c',
    h: '#82562b',
    i: '#6e4220',
    j: '#9e662b',
    k: '#603621',
    l: '#8b5428',
    m: '#131722',
    n: '#3b2c27',
    p: '#322424',
    q: '#7b4a29',
    r: '#390d1e',
    s: '#1a0e1d',
    t: '#120416',
    u: '#74101e',
    v: '#7e111d',
    w: '#520b1c',
    x: '#230d19',
    y: '#966235',
    z: '#290e24',
    A: '#911e23',
    B: '#49111e',
    C: '#4a3e3e',
    D: '#413736',
    E: '#5d524e',
    F: '#610c23',
    G: '#a06736',
  },
};
