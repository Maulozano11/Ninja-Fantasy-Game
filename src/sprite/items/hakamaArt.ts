// The owner's wide black hakama on his Ascended paint-over, his pixels
// (tools/refs/ascended-hakama-from-ref.py from docs/reference/ascended-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HAKAMA_CLOTH = '#1b1924';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const HAKAMA_KIND: Record<string, 'line' | 'cloth'> = {
  '#000000': 'line',
  '#010101': 'line',
  '#020204': 'line',
  '#15141e': 'cloth',
  '#16141f': 'cloth',
  '#161620': 'cloth',
  '#1a1822': 'cloth',
  '#1a1823': 'cloth',
  '#1a191f': 'cloth',
  '#1c1a27': 'cloth',
  '#1e1b26': 'cloth',
  '#23212c': 'cloth',
  '#24222e': 'cloth',
  '#282633': 'cloth',
  '#2a2835': 'cloth',
  '#2c2a37': 'cloth',
  '#2e2c39': 'cloth',
  '#302e3c': 'cloth',
  '#312f3d': 'cloth',
  '#322f3d': 'cloth',
  '#333141': 'cloth',
  '#333142': 'cloth',
  '#373444': 'cloth',
  '#373545': 'cloth',
  '#383547': 'cloth',
  '#3a3948': 'cloth',
  '#3a394a': 'cloth',
  '#3e3d4e': 'cloth',
  '#3f3c4e': 'cloth',
  '#434254': 'cloth',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const HAKAMA_REST: Record<string, [number, number]> = {
  HAKAMA_SEAT: [117, 180],
  HAKAMA_THIGH_N: [115, 180],
  HAKAMA_SHIN_N: [114, 190],
  HAKAMA_THIGH_F: [127, 180],
  HAKAMA_SHIN_F: [127, 185],
};

/** The hakama round the hips, over the tops of both legs: it rides the torso about the pelvis. */
export const HAKAMA_SEAT: PaintedPiece = {
  pivot: [10, -4],
  angle: -89.65,
  rows: [
    '.a..b......cccbbbbbdebcb',
    '.abbbbbbbbccccbbbbbdebcb',
    '.abfhbbbbbaaacbbbbbdebcb',
    'abbfhffbbbaccabbbbbdebcc',
    'abffffbhbaacccabbbbdebcc',
    'abfffbffbaacccbabbbdebcb',
  ],
  colors: {
    a: '#000000',
    b: '#1a1822',
    c: '#161620',
    d: '#1e1b26',
    e: '#383547',
    f: '#333142',
    h: '#312f3d',
  },
};

/** The near leg from the hip to below the knee: it rides the thigh about the hip. */
export const HAKAMA_THIGH_N: PaintedPiece = {
  pivot: [6, -4],
  angle: 87.91,
  rows: [
    '...a..b......',
    '...abbbbbbbbc',
    '...abdebbbbba',
    '..abbdeddbbba',
    '..abddddbebaa',
    '..abdddbddba.',
    '..abdddfdbba.',
    '..abddbdbbba.',
    '.abbhfddbba..',
    '.abbhhhbbba..',
    '.abihhjbea...',
    '.abhijbkba...',
    '.abljbcjba...',
    'abcjbbjja....',
  ],
  colors: {
    a: '#000000',
    b: '#1a1822',
    c: '#15141e',
    d: '#333142',
    e: '#312f3d',
    f: '#1c1a27',
    h: '#373545',
    i: '#3a3948',
    j: '#2a2835',
    k: '#24222e',
    l: '#3f3c4e',
  },
};

/** The near leg from above the knee to its hem: it rides the shin about the knee. */
export const HAKAMA_SHIN_N: PaintedPiece = {
  pivot: [8, 2],
  angle: 104.09,
  rows: [
    '..abcccdbea',
    '..abccdbfba',
    '..abhdbidba',
    '.abidbbdda.',
    '.abbbbibba.',
    '.abbbdhba..',
    '.adhhhcba..',
    '.adfjebba..',
    '.abddbba...',
    '.aaaaaa....',
    'abkkba.....',
    'aaaca......',
  ],
  colors: {
    a: '#010101',
    b: '#1a1822',
    c: '#3a3948',
    d: '#2a2835',
    e: '#322f3d',
    f: '#24222e',
    h: '#3f3c4e',
    i: '#16141f',
    j: '#2e2c39',
    k: '#373444',
  },
};

/** The far leg from the hip to below the knee: it rides the thigh about the hip. */
export const HAKAMA_THIGH_F: PaintedPiece = {
  pivot: [4, -7],
  angle: 65.49,
  rows: [
    '.aaaaabbacdaaa',
    '.aaaaabbacdaaa',
    'eeeaaabbacdaaa',
    'eaaeaabbacdaaa',
    'eaaaeabbacdaaa',
    'eaaaaebbacdaaa',
    'eaaafaebacdeea',
    'eaaaffebaeeaea',
    'eahaafbeecdbeb',
  ],
  colors: {
    a: '#161620',
    b: '#1a1823',
    c: '#1e1b26',
    d: '#383547',
    e: '#000000',
    f: '#2c2a37',
    h: '#1a191f',
  },
};

/** The far leg from above the knee to its hem: it rides the shin about the knee. */
export const HAKAMA_SHIN_F: PaintedPiece = {
  pivot: [11, 2],
  angle: 98.56,
  rows: [
    'abbbbaccbdebbb',
    'abbbfbacbdeaab',
    'abbbffacbaabab',
    'abhbbfcaadecac',
    'abbfbfecbcica.',
    '.abffbeeeeecb.',
    '.abbffceeeecb.',
    '.aabfffbiiebba',
    '.abbbbfjcidbba',
    'abbffbbccccbfa',
    'abbbfffdccdifa',
    '.abbbbfkklmea.',
    '..aabcccnnnba.',
    '..abacbbaaaa..',
    '.abbaepapecba.',
    '.aaaaaaaeeaaa.',
    '........qaa...',
  ],
  colors: {
    a: '#000000',
    b: '#161620',
    c: '#1a1823',
    d: '#1e1b26',
    e: '#383547',
    f: '#2c2a37',
    h: '#1a191f',
    i: '#3a394a',
    j: '#23212c',
    k: '#434254',
    l: '#3e3d4e',
    m: '#302e3c',
    n: '#282633',
    p: '#333141',
    q: '#020204',
  },
};
