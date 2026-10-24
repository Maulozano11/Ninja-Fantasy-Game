// The owner's samurai hair, his pixels at our scale (tools/refs/samurai-hair-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_HAIR_BASE = '#1e222d';
export const SAMURAI_HAIR_CORD = '#66151c';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_HAIR_KIND: Record<string, 'hair' | 'line' | 'red' | 'skin'> = {
  '#000113': 'line',
  '#1e222d': 'hair',
  '#373f4c': 'hair',
  '#390d1e': 'red',
  '#41464c': 'hair',
  '#49111e': 'red',
  '#66151c': 'red',
  '#911e23': 'red',
  '#98553a': 'skin',
  '#b87854': 'skin',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_HAIR_REST: Record<string, [number, number]> = {
  SAMURAI_HAIR: [112, 119],
};

/** His hair: the messy black locks lit in blue-grey, over the brow and the ears, and the topknot tied in red cord. */
export const SAMURAI_HAIR: PaintedPiece = {
  pivot: [11, 18],
  angle: 0.00,
  rows: [
    '......aa..a..................',
    '......aaa.a..................',
    '...aaabacaaa.a...............',
    '.aabccbabcbaada..............',
    '.aaaabbbabaaaaa..............',
    '..aaaaaaaaaaaaaaaaaaaa.......',
    '.abbaaaaeaaaaccbaccbaaa......',
    'abbbbaaaaabbbabbabbbbccaa....',
    'aaabaaaaabaabbabaabbbbbbba...',
    'a.aaaaaabccbbbbbbbbbbbbbaaa..',
    '..a.aabbbbbbbbbbbbbbbbbbba...',
    '....aabbbabbbbbbbbbbcbcbcca..',
    '..aabbbbabcbbccbcbabcaffaaa..',
    '...aaabaababccaccaabcaafbaaa.',
    '....aaaaaaabcabba.aabaaacaaaa',
    '...aaaaaaabbaaaa...ab..abba..',
    '...aaaaaaabbaaaa...a...abaa..',
    '.....aaah.aba...aa.a..aabaa..',
    '.....aaai.aa..aaaaa.aaaaaa...',
    '....abaaa.aa...........aaa...',
    '....abaaa..a...........aa....',
    '...aaaaaaaa...........a......',
    '......aaa.a...........a......',
    '......aaa.............a......',
    '.......aa..a.........a.......',
    '.....aabba..a........a.......',
    '.....jkabba..aa.....aaaaaaa..',
  ],
  colors: {
    a: '#000113',
    b: '#1e222d',
    c: '#41464c',
    d: '#911e23',
    e: '#66151c',
    f: '#373f4c',
    h: '#98553a',
    i: '#b87854',
    j: '#49111e',
    k: '#390d1e',
  },
};
