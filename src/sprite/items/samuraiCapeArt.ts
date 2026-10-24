// The owner's samurai cape, his pixels at our scale (tools/refs/samurai-cape-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_CAPE_RED = '#881f23';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_CAPE_KIND: Record<string, 'dark' | 'line' | 'red'> = {
  '#000113': 'line',
  '#261d22': 'dark',
  '#390d1e': 'red',
  '#49111e': 'red',
  '#66151c': 'red',
  '#881f23': 'red',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_CAPE_REST: Record<string, [number, number]> = {
  SAMURAI_CAPE: [92, 179],
  SAMURAI_CAPE_FAR: [142, 198],
};

/** His cape: red cloth flowing back from behind the waist, its folds and dark inside. */
export const SAMURAI_CAPE: PaintedPiece = {
  pivot: [35, -32],
  angle: 90.00,
  rows: [
    '................aa.................',
    '...............ababbbbbbbbbbbbbbbbb',
    '..............abbbabbbbbbbbbbbbbbbb',
    '.............abbbcacccccccccccccccc',
    '............acbbbcaaccccccccccccccc',
    '...........accbbcaaaccccccccccccccc',
    '..........accbbccaaaccccccccccccccc',
    '........aacccbccaaaaccccccccccccccc',
    '......aacccccccaaaaaccccccccccccccc',
    '.....acccbcccccaaaaaccccccccccccccc',
    '...aacccbccccaaaaaaaccccccccccccccc',
    '..abbcbcccccaaaaaaaaccccccccccccccc',
    '..abbbbccccaaaaaaaa.ccccccccccccccc',
    '..abbbcccccaaabbaaa................',
    '..abbcccccaaabbaaaa................',
    '..accccccaaabbaaaba................',
    '.acccdcccaabbaaabba................',
    '.abcddccaaaaaaaabba................',
    'abbcdcca....aaabbba................',
    'abbaeeea.....abbbaa................',
    'abaaeea......aab.a.................',
    '.aaeeea........aa..................',
    '.aaeeea............................',
    '..adea.............................',
    '..adfa.............................',
    '...afa.............................',
    '...afa.............................',
    '....aa.............................',
    '....aa.............................',
  ],
  colors: {
    a: '#000113',
    b: '#390d1e',
    c: '#881f23',
    d: '#261d22',
    e: '#49111e',
    f: '#66151c',
  },
};

/** The edge of his cape he drew beside the far leg, behind it. */
export const SAMURAI_CAPE_FAR: PaintedPiece = {
  pivot: [-15, -51],
  angle: 90.00,
  rows: [
    '.a',
    '.a',
    '.a',
    'aa',
  ],
  colors: {
    a: '#000113',
  },
};
