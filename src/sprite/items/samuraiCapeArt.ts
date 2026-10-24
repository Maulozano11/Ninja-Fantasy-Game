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
  '#60322c': 'dark',
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
    '...............abaaa................................',
    '..............abbbcaccccccccccccccccccccc...........',
    '.............adbbeaaeeeeeeeeeeeeeeeeeeeee...........',
    '............aebbdeaaeeeeeeeeeeeeeeeeeeeee...........',
    '...........aeebbeaaaeeeeeeeeeeeeeeeeeeeee...........',
    '..........aeebbeeaaaeeeeeeeeeeeeeeeeeeeee...........',
    '........aaeeebeeaaaaeeeeeeeeeeeeeeeeeeeee...........',
    '......aaeeeeebeaaaaaeeeeeeeeeeeeeeeeeeeee...........',
    '.....abeebeeeeeaaaaaeeeeeeeeeeeeeeeeeeeee...........',
    '...aadeebeeeeaaaaaaaeeeeeeeeeeeeeeeeeeeee...........',
    '..abbebbeeeeaaaaaaaaeeeeeeeeeeeeeeeeeeeee...........',
    '..abbbbeeeeaaaaaaaeeeeeeeeeeeeeeeeeeeeeee...........',
    '..abbdeeeefaaabbaabbbbbbbbbbbbbbbbbbbbbbb...........',
    '..abbeeeefaaabbaaaabbbbbbbbbbbbbbbbbbbbbb...........',
    '..aeeeeeeaaabbaaababbbbbbbbbbbbbbbbbbbbbb...........',
    '.adeefeefaabbaaabbabbbbbbbbbbbbbbbbbbbbbb...........',
    '.abeffeeaaaaaaaabbabbbbbbbbbbbbbbbbbbbbbb.........a.',
    'abbbfeea....aaabbbabbbbbbbbbbbbbbbbbbbbbb........aa.',
    'abbaddda.....abbbaabbbbbbbbbbbbbbbbbbbbbb........aba',
    'abaadda......aabb.bbbbbbbbbbbbbbbbbbb.bbb........aba',
    '.aaddda........aa................................aba',
    '.aafdda..........dddddddddddddddd......dd........aaa',
    '..afda.............dddddddddd..........dd...........',
    '..afha.............hhhhhhhh.............h...........',
    '...aha.............hhhhhhh..............h...........',
    '...aha.............hhhhhhh..............h...........',
    '....aa..............................................',
    '....aa..............................................',
  ],
  colors: {
    a: '#000113',
    b: '#390d1e',
    c: '#60322c',
    d: '#49111e',
    e: '#881f23',
    f: '#261d22',
    h: '#66151c',
  },
};
