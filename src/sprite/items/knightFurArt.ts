// The owner's paladin's fur mantle, his pixels at our scale (tools/refs/knight-fur-from-ref.py from
// docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const KNIGHT_FUR = '#eee7d7';

/** What each of his colours is, as the script sorts them (tools/refs/knights_ref.py kind). */
export const KNIGHT_FUR_KIND: Record<string, 'line' | 'warm' | 'white'> = {
  '#020206': 'line',
  '#02061a': 'line',
  '#a28e87': 'warm',
  '#b7a49d': 'warm',
  '#cabbb1': 'warm',
  '#eee7d7': 'white',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const KNIGHT_FUR_REST: Record<string, [number, number]> = {
  KNIGHT_PALADIN_FUR: [105, 137],
  KNIGHT_PALADIN_FUR_F: [133, 141],
};

/** His fur mantle on the near side: over the near shoulder and behind the head. */
export const KNIGHT_PALADIN_FUR: PaintedPiece = {
  pivot: [22, 11],
  angle: -89.65,
  rows: [
    '.....aaaaa........',
    '.....abbccc.......',
    '...aaddbeecc......',
    '..abbcbbeeeeec....',
    '..adccceeeeee.....',
    '.addceeeeeeee.....',
    'adbbcceeeeeeeee.aa',
    '.adccccceeeeeeeecc',
    'addccdeeeeeeeeeeee',
    'adbbdddddddeeeeeee',
    'accdddfdddbbbeeeee',
    'ac.....ddd.ddeee..',
    'ac............ee..',
    'a.................',
  ],
  colors: {
    a: '#020206',
    b: '#cabbb1',
    c: '#b7a49d',
    d: '#a28e87',
    e: '#eee7d7',
    f: '#02061a',
  },
};

/** His fur mantle on the far side, over the far shoulder. */
export const KNIGHT_PALADIN_FUR_F: PaintedPiece = {
  pivot: [-6, 7],
  angle: -89.65,
  rows: [
    '...ab....',
    '..ccabb..',
    '..dcaab..',
    '.beeedb..',
    'babeeddb.',
    'baeeeedb.',
    'bacededb.',
    'bacededdb',
    '..aeeddab',
    '..aaeeaab',
    '..aaaaaab',
  ],
  colors: {
    a: '#a28e87',
    b: '#020206',
    c: '#cabbb1',
    d: '#b7a49d',
    e: '#eee7d7',
  },
};
