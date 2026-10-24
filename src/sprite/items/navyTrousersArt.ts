// The owner's officer's trousers (navy from his first picture, black from his open-coat picture), the owner's pixels at our scale (tools/refs/navy-trousers-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TROUSERS_NAVY = '#0c1124';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const TROUSERS_NAVY_KIND: Record<string, 'cloth' | 'line'> = {
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#1c223a': 'cloth',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const TROUSERS_NAVY_REST: Record<string, [number, number]> = {
  TROUSERS_NAVY_N_UPPER: [116, 172],
  TROUSERS_NAVY_N_LOWER: [113, 191],
  TROUSERS_NAVY_F_UPPER: [125, 172],
  TROUSERS_NAVY_F_LOWER: [128, 191],
  TROUSERS_NAVY_SEAT: [119, 165],
};

/** His joints at rest, where his picture has them (fine pixels of our male idle frame 0). */
export const TROUSERS_NAVY_JOINTS: Record<string, [number, number]> = {
  hipN: [121.50, 176.50],
  kneeN: [119.50, 191.50],
  ankleN: [115.50, 208.50],
  hipF: [130.50, 175.50],
  kneeF: [131.50, 191.50],
  ankleF: [132.50, 207.50],
};

/** The near thigh, pivoted on his near hip at his angle. */
export const TROUSERS_NAVY_N_UPPER: PaintedPiece = {
  pivot: [5, 4],
  angle: 97.59,
  rows: [
    '....aaa...',
    '...abbba..',
    '..abbbbba.',
    '.acbbbbbba',
    '.acbbbbbba',
    '.acbbbbbba',
    '.acbbbbba.',
    '.acbbbbbb.',
    '.acbbbbbb.',
    '.acbbbcbbc',
    'accbbbcbbc',
    'accbbbbbbc',
    'accbbcbbb.',
    'accbbcbbc.',
    'accbbbbcc.',
    'aacbbbbc..',
    'accbbbbca.',
    'accbbbbca.',
    'acbcbbca..',
    '....bcca..',
  ],
  colors: {
    a: '#000316',
    b: '#1c223a',
    c: '#0c1124',
  },
};

/** The near shin down into the boot, pivoted on his near knee at his angle. */
export const TROUSERS_NAVY_N_LOWER: PaintedPiece = {
  pivot: [6, 0],
  angle: 103.24,
  rows: [
    '..ababc....',
    '..abcaacbba',
    '..abcbccba.',
    '.abbcbccaa.',
    '.abbcbcc...',
    '.abbcbcc...',
    '.abbcbcc...',
    '.abbcbcca..',
    'abbbcbcca..',
    'abbbcbcc...',
    'aaaaaaa....',
  ],
  colors: {
    a: '#000316',
    b: '#0c1124',
    c: '#1c223a',
  },
};

/** The far thigh, pivoted on his far hip at his angle. */
export const TROUSERS_NAVY_F_UPPER: PaintedPiece = {
  pivot: [5, 3],
  angle: 86.42,
  rows: [
    '...aaaaa..',
    '..abbbbba.',
    '..abbbbba.',
    '..abbbbba.',
    '..abbbbba.',
    '..abbbbbba',
    '..aaabbbba',
    '.bbabbbbba',
    'cb..bbcbba',
    '....bbccba',
    '....bbbcca',
    '....bbccca',
    '....bbccca',
    '....bbccca',
    '....abccca',
    '....abccca',
    '....abbccc',
    '....abcccc',
    '...aabcccc',
    '...aba....',
  ],
  colors: {
    a: '#000316',
    b: '#0c1124',
    c: '#1c223a',
  },
};

/** The far shin down into the boot, pivoted on his far knee at his angle. */
export const TROUSERS_NAVY_F_LOWER: PaintedPiece = {
  pivot: [3, 0],
  angle: 86.42,
  rows: [
    '...abbbc',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    'caabaaac',
    '.aabaaa.',
    '.cccccc.',
  ],
  colors: {
    a: '#0c1124',
    b: '#1c223a',
    c: '#000316',
  },
};

/** The seat between his hips, up to the belt (under the coat's tails at rest). Its pivot is the cell on the pelvis joint. */
export const TROUSERS_NAVY_SEAT: PaintedPiece = {
  pivot: [8, 11],
  angle: -89.65,
  rows: [
    '.aaaaaaaaaaaaaaa',
    '.abaaaacaaccaaaa',
    '.abaaaacaaccaaaa',
    '.abaaaacaaccaaaa',
    'aabaaaacaaccaaaa',
    'aabaaaacaaccaaaa',
    'aabaaaacaaccaaaa',
    'a...aaaca.....ab',
    '.....aac.......b',
    '......ac.......b',
    '.......c.......b',
    '.......c.......b',
    '.......c........',
    '......ac........',
    '......a.........',
  ],
  colors: {
    a: '#000316',
    b: '#1c223a',
    c: '#0c1124',
  },
};

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TROUSERS_BLACK = '#0b0e21';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const TROUSERS_BLACK_KIND: Record<string, 'cloth' | 'line'> = {
  '#000116': 'line',
  '#000316': 'line',
  '#0b0e21': 'cloth',
  '#1d1b28': 'cloth',
  '#1e1c29': 'cloth',
  '#230b21': 'cloth',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const TROUSERS_BLACK_REST: Record<string, [number, number]> = {
  TROUSERS_BLACK_N_UPPER: [116, 172],
  TROUSERS_BLACK_N_LOWER: [113, 191],
  TROUSERS_BLACK_F_UPPER: [124, 172],
  TROUSERS_BLACK_F_LOWER: [128, 191],
  TROUSERS_BLACK_SEAT: [119, 165],
};

/** The near thigh, pivoted on his near hip at his angle. */
export const TROUSERS_BLACK_N_UPPER: PaintedPiece = {
  pivot: [5, 4],
  angle: 97.59,
  rows: [
    '....aaa...',
    '...abbba..',
    '..acbbbba.',
    '.abcbbbb..',
    '.abcbbbb..',
    '.abcbdbbc.',
    '.abcbdbbc.',
    '.abcbbcbcb',
    '.abcbcccc.',
    '.abcbcbccb',
    'abbcccbccb',
    'abbceccccb',
    'abbbebcccd',
    'abbcebecbd',
    'abbccbebbd',
    'adbcbcebdf',
    'abbccccbdd',
    'abbccccbd.',
    'dbcbecbd..',
    '....cbbd..',
  ],
  colors: {
    a: '#000316',
    b: '#0b0e21',
    c: '#1d1b28',
    d: '#000116',
    e: '#1e1c29',
    f: '#230b21',
  },
};

/** The near shin down into the boot, pivoted on his near knee at his angle. */
export const TROUSERS_BLACK_N_LOWER: PaintedPiece = {
  pivot: [6, 0],
  angle: 103.24,
  rows: [
    '..ababc....',
    '..abdaacbba',
    '..ebdbccba.',
    '.ebbdbccaa.',
    '.ebbdbcc...',
    '.ebbdbcc...',
    '.ebbdbcc...',
    '.ebbdbcce..',
    'ebbbdbcce..',
    'ebbbdbcc...',
    'eeeeeee....',
  ],
  colors: {
    a: '#000116',
    b: '#0b0e21',
    c: '#1e1c29',
    d: '#1d1b28',
    e: '#000316',
  },
};

/** The far thigh, pivoted on his far hip at his angle. */
export const TROUSERS_BLACK_F_UPPER: PaintedPiece = {
  pivot: [6, 3],
  angle: 86.42,
  rows: [
    '....aaaaa..',
    '...abcbbca.',
    '...abcbbca.',
    'ccbbbdbbca.',
    'dccccddcca.',
    '.bbcdddccca',
    '.bccddcccca',
    '..ccdccccca',
    '.bcddccbcca',
    '..dedccbbca',
    '..dedcccbba',
    '..dedccbbba',
    '..eedccbbba',
    '..eedccbbbd',
    '..eeedccbbd',
    '..eeedcbbbd',
    '..ddedccbbb',
    '....ddcbbbb',
    '....ddcbbbb',
    '....ddd....',
  ],
  colors: {
    a: '#000316',
    b: '#1d1b28',
    c: '#0b0e21',
    d: '#000116',
    e: '#230b21',
  },
};

/** The far shin down into the boot, pivoted on his far knee at his angle. */
export const TROUSERS_BLACK_F_LOWER: PaintedPiece = {
  pivot: [3, 0],
  angle: 86.42,
  rows: [
    '...abbcd',
    'daaaaaad',
    'eaaaaaae',
    'eaaaaaae',
    'eaaaaaae',
    'eaaaaaae',
    'eaaaaaae',
    'eaaaaaae',
    'eaaaaaae',
    '.aaaaaa.',
    '.eeeeee.',
  ],
  colors: {
    a: '#0b0e21',
    b: '#1d1b28',
    c: '#1e1c29',
    d: '#000116',
    e: '#000316',
  },
};

/** The seat between his hips, up to the belt (under the coat's tails at rest). Its pivot is the cell on the pelvis joint. */
export const TROUSERS_BLACK_SEAT: PaintedPiece = {
  pivot: [8, 11],
  angle: -89.65,
  rows: [
    '.aaaaaaaaaaaaaaa',
    '.abaabbcacbaabaa',
    '.abaabbcacbaabaa',
    '.abaabbcacbaabaa',
    'aabaabbcacbaabaa',
    'aabaabbcacbaabaa',
    'aabaabbcacbaabaa',
    'a...abbca.....ac',
    '.....bbc.......c',
    '......bc.......c',
    '...............c',
    '...............c',
  ],
  colors: {
    a: '#000316',
    b: '#0b0e21',
    c: '#1d1b28',
  },
};
