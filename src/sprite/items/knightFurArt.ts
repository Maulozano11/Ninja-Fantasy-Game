// The owner's paladin's fur mantle, his pixels at our scale (tools/refs/knight-fur-from-ref.py from
// docs/reference/three-knights-owner-reference.jpg, shrunk and cleaned by tools/refs/knights_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const KNIGHT_FUR = '#eee7d7';

/** What each of his colours is, as the script sorts them (tools/refs/knights_ref.py kind). */
export const KNIGHT_FUR_KIND: Record<string, 'dark' | 'line' | 'red' | 'steel' | 'warm' | 'white'> = {
  '#020206': 'line',
  '#141318': 'dark',
  '#1e090e': 'red',
  '#80849f': 'steel',
  '#a28e87': 'warm',
  '#b7a49d': 'warm',
  '#c3b2aa': 'warm',
  '#d6ccca': 'white',
  '#eee7d7': 'white',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const KNIGHT_FUR_REST: Record<string, [number, number]> = {
  KNIGHT_PALADIN_FUR: [106, 138],
  KNIGHT_PALADIN_FUR_F: [133, 141],
};

/** His fur mantle on the near side: over the near shoulder and behind the head. */
export const KNIGHT_PALADIN_FUR: PaintedPiece = {
  pivot: [21, 10],
  angle: -89.65,
  rows: [
    '........ab......',
    '.....aaaccd.....',
    '.....aeeecdd....',
    '...aaeeeeeeb....',
    '...aeeeeeeee....',
    '..addeeeeeeeee.a',
    '..adddeeeeeeeee.',
    '.adddeeeeeeeeee.',
    '.addffffeeeeeee.',
    '.addafaaaeeeeee.',
    'a....a...aeeeee.',
    '.........a...e..',
  ],
  colors: {
    a: '#020206',
    b: '#1e090e',
    c: '#d6ccca',
    d: '#b7a49d',
    e: '#eee7d7',
    f: '#a28e87',
  },
};

/** His fur mantle on the far side, over the far shoulder. */
export const KNIGHT_PALADIN_FUR_F: PaintedPiece = {
  pivot: [-6, 7],
  angle: -89.65,
  rows: [
    '...a.....',
    '..bca....',
    '..cddaa..',
    '.adddda..',
    'aaaddda..',
    'aefddda..',
    'aefdddda.',
    'a..dddda.',
    '...dddfa.',
    '...ddffa.',
    '.....h..a',
  ],
  colors: {
    a: '#020206',
    b: '#1e090e',
    c: '#c3b2aa',
    d: '#eee7d7',
    e: '#141318',
    f: '#a28e87',
    h: '#80849f',
  },
};
