// The owner's samurai cape, his pixels at our scale (tools/refs/samurai-cape-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_CAPE_RED = '#66151c';

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
};

/** His cape: red cloth flowing back from behind the waist, its folds and dark inside. It hangs from the base of the neck behind the body. */
export const SAMURAI_CAPE: PaintedPiece = {
  pivot: [35, -32],
  angle: 90.00,
  rows: [
    '................aa..................................',
    '...............aba..................................',
    '..............abbbabbbbbbbbbbbbbbbbbbbbbb...........',
    '.............abbbcacccccccccccccccccccccc...........',
    '............acbbbcaaccccccccccccccccccccc...........',
    '...........accbbcaaaccccccccccccccccccccc...........',
    '..........accbbccaaaccccccccccccccccccccc...........',
    '........aacccbccaaaaccccccccccccccccccccc...........',
    '......aacccccccaaaaaccccccccccccccccccccc...........',
    '.....acccbcccccaaaaaccccccccccccccccccccc...........',
    '...aacccbccccaaaaaaaccccccccccccccccccccc...........',
    '..abbcbcccccaaaaaaaaccccccccccccccccccccc...........',
    '..abbbbccccaaaaaaaccccccccccccccccccccccc...........',
    '..abbbcccccaaabbaabbbbbbbbbbbbbbbbbbbbbbb...........',
    '..abbcccccaaabbaaaabbbbbbbbbbbbbbbbbbbbbb...........',
    '..accccccaaabbaaababbbbbbbbbbbbbbbbbbbbbb...........',
    '.acccdcccaabbaaabbabbbbbbbbbbbbbbbbbbbbbb...........',
    '.abcddccaaaaaaaabbabbbbbbbbbbbbbbbbbbbbbb...........',
    'abbcdcca....aaabbbabbbbbbbbbbbbbbbbbbbbbb...........',
    'abbaeeea.....abbbaabbbbbbbbbbbbbbbbbbbbbb..........a',
    'abaaeea......aab.a.................................a',
    '.aaeeea........aa..................................a',
    '.aaeeea..........eeeeeeeeeeeeeeee....eeee.........aa',
    '..adea............eeeeeeeeeee.........eee...........',
    '..adfa............fffffffff...........fff...........',
    '...afa............fffffffff............ff...........',
    '...afa...........ffffffffff............ff...........',
    '....aa..............................................',
    '....aa..............................................',
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
