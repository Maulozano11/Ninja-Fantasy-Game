// The owner's leather rogue: the fingerless gloves, his pixels at our scale (tools/refs/drifter-gloves-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const DRIFTER_GLOVES_LEATHER = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const DRIFTER_GLOVES_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'skin' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0a000e': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#151116': 'dark',
  '#160f1f': 'dark',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#2d2d2f': 'steel',
  '#2e131c': 'brown',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#673338': 'brown',
  '#793f47': 'skin',
  '#7d8286': 'steel',
  '#874c4a': 'skin',
  '#9b584f': 'skin',
  '#ac6857': 'skin',
  '#c38267': 'skin',
  '#d18b67': 'skin',
  '#d49070': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const DRIFTER_GLOVES_REST: Record<string, [number, number]> = {
  DRIFTER_GLOVES_HAND_N: [105, 173],
  DRIFTER_GLOVES_HAND_F: [137, 173],
};

/** His near fingerless glove, a fist. It rides the hand about the wrist. */
export const DRIFTER_GLOVES_HAND_N: PaintedPiece = {
  pivot: [1, 2],
  angle: 96.01,
  rows: [
    'a...a.a....',
    'abbcada....',
    'abaaeea....',
    'aabcceba...',
    'afbbhebba..',
    'afiibbjkk.a',
    'abellbbkmna',
    'abbclbjapq.',
    '.arestupaa.',
    '..aaaaaa.a.',
  ],
  colors: {
    a: '#000116',
    b: '#323338',
    c: '#3b3c40',
    d: '#322826',
    e: '#141a2a',
    f: '#2d2d2f',
    h: '#63686e',
    i: '#575c62',
    j: '#2c2b31',
    k: '#212227',
    l: '#1c2234',
    m: '#d49070',
    n: '#7d8286',
    p: '#673338',
    q: '#160f1f',
    r: '#151116',
    s: '#2e131c',
    t: '#c38267',
    u: '#d18b67',
  },
};

/** His far fingerless glove, a fist. It rides the hand about the wrist. */
export const DRIFTER_GLOVES_HAND_F: PaintedPiece = {
  pivot: [4, 1],
  angle: 69.44,
  rows: [
    '.....aa.',
    '.aabcdba',
    '.abcddea',
    '.abccfda',
    '.aahijka',
    '.alhmana',
    'aappiiaa',
    'a.aaaa..',
    'a.......',
    'a.......',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#2c2b31',
    d: '#323338',
    e: '#212227',
    f: '#0e101d',
    h: '#ac6857',
    i: '#9b584f',
    j: '#00011f',
    k: '#141a2a',
    l: '#d49070',
    m: '#0a000e',
    n: '#874c4a',
    p: '#793f47',
  },
};
