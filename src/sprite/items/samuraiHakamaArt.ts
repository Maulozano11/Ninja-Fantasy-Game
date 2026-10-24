// The owner's samurai hakama, his pixels at our scale (tools/refs/samurai-hakama-from-ref.py from
// docs/reference/samurai-owner-reference.jpg, shrunk and cleaned by tools/refs/samurai_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SAMURAI_HAKAMA = '#390d1e';

/** What each of his colours is, as the script sorts them (tools/refs/samurai_ref.py kind). */
export const SAMURAI_HAKAMA_KIND: Record<string, 'dark' | 'hair' | 'line' | 'red'> = {
  '#000113': 'line',
  '#131722': 'hair',
  '#390d1e': 'red',
  '#3b2c27': 'dark',
  '#7f1d1e': 'red',
  '#881f23': 'red',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SAMURAI_HAKAMA_REST: Record<string, [number, number]> = {
  SAMURAI_THIGH_N: [110, 177],
  SAMURAI_THIGH_F: [125, 176],
};

/** His hakama's near leg, wide and bloused over the knee. It rides the thigh about the hip. */
export const SAMURAI_THIGH_N: PaintedPiece = {
  pivot: [9, 1],
  angle: 98.88,
  rows: [
    '.aaaaaaaaaaaaa.',
    '.bbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    '..bbbbbbbbbbbb.',
    'aabbbbbbbbbbbb.',
    'abbbbbbbbbbbba.',
    'abbbbbbbbbbbbcc',
    'accccccccccccbb',
    'abbbbbbbbbbabba',
    'abbbbbbbbbbabaa',
    'a...........aaa',
    'a...........aaa',
    'abbbbbbbbbbbaab',
    'abbbbbbbbbbaabb',
    '.........aaabbb',
    '..........daaaa',
    '.........aa....',
  ],
  colors: {
    a: '#000113',
    b: '#390d1e',
    c: '#881f23',
    d: '#3b2c27',
  },
};

/** His hakama's far leg, wide and bloused over the knee. It rides the thigh about the hip. */
export const SAMURAI_THIGH_F: PaintedPiece = {
  pivot: [7, 1],
  angle: 73.61,
  rows: [
    '....aaaaa.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    '....bbbbb.',
    'a...bbbbb.',
    'aaaabbabb.',
    'aaaabbcbb.',
    'aaaabbbcca',
    'aaaaaabab.',
    'aaaaaaabb.',
    'baaaaaddda',
    'aaaaa.aaa.',
    'aaaa......',
    'aa........',
  ],
  colors: {
    a: '#000113',
    b: '#390d1e',
    c: '#7f1d1e',
    d: '#131722',
  },
};
