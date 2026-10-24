// The owner's gloves on his navy officer, the owner's pixels at our scale (tools/refs/navy-gloves-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_GLOVE_LEATHER = '#2e2e3a';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_GLOVE_KIND: Record<string, 'cloth' | 'leather' | 'line'> = {
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#11162c': 'cloth',
  '#19182a': 'cloth',
  '#191e32': 'cloth',
  '#1c223a': 'cloth',
  '#1e1e26': 'leather',
  '#201d2e': 'leather',
  '#232d48': 'cloth',
  '#262834': 'leather',
  '#2e2e3a': 'leather',
  '#383641': 'leather',
  '#eab45c': 'leather',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_GLOVE_REST: Record<string, [number, number]> = {
  NAVY_GLOVE_N: [109, 173],
  NAVY_GLOVE_F: [141, 161],
};

/** The near fist, pivoted on his near wrist at his angle. */
export const NAVY_GLOVE_N: PaintedPiece = {
  pivot: [3, 0],
  angle: 90.00,
  rows: [
    'abcddd...',
    'dddefd...',
    'dehiijd..',
    'dhjkiiidc',
    'djkiilidd',
    'dhjjidfda',
    'dekjkdeda',
    '.ddlflda.',
    '..dddddm.',
    '...cda...',
  ],
  colors: {
    a: '#0c1124',
    b: '#11162c',
    c: '#1c223a',
    d: '#000316',
    e: '#191e32',
    f: '#19182a',
    h: '#262834',
    i: '#383641',
    j: '#201d2e',
    k: '#2e2e3a',
    l: '#1e1e26',
    m: '#232d48',
  },
};

/** The far fist, pivoted on his far wrist at his angle. */
export const NAVY_GLOVE_F: PaintedPiece = {
  pivot: [1, 4],
  angle: 33.69,
  rows: [
    '...a......',
    '..baa.....',
    'cdddaa....',
    'ecdafhaaa.',
    'eeaihhjeha',
    'aaahhaehha',
    '..a.j..aka',
    '........aa',
  ],
  colors: {
    a: '#000316',
    b: '#eab45c',
    c: '#1c223a',
    d: '#232d48',
    e: '#0c1124',
    f: '#191e32',
    h: '#383641',
    i: '#1e1e26',
    j: '#2e2e3a',
    k: '#11162c',
  },
};
