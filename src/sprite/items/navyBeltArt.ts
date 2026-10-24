// The owner's belt on his navy officer, the owner's pixels at our scale (tools/refs/navy-belt-from-ref.py from
// docs/reference/navy-officer-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NAVY_BELT_LEATHER = '#1e1412';
export const NAVY_BELT_GOLD = '#eab45c';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const NAVY_BELT_KIND: Record<string, 'cloth' | 'gold' | 'leather' | 'line' | 'metal' | 'skin'> = {
  '#000316': 'line',
  '#0c1124': 'cloth',
  '#19182a': 'cloth',
  '#1e1412': 'leather',
  '#291a21': 'leather',
  '#2b0d25': 'leather',
  '#32201e': 'leather',
  '#383641': 'metal',
  '#412b2e': 'leather',
  '#613f26': 'skin',
  '#683e2e': 'skin',
  '#754833': 'skin',
  '#a47040': 'gold',
  '#aa7c4b': 'gold',
  '#ad7642': 'gold',
  '#c18849': 'gold',
  '#c8904b': 'gold',
  '#ce984e': 'gold',
  '#eab45c': 'gold',
  '#ecbd66': 'gold',
  '#f2c46e': 'gold',
  '#f8d584': 'gold',
  '#fad576': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NAVY_BELT_REST: Record<string, [number, number]> = {
  NAVY_BELT: [119, 164],
};

/** The belt and its round gold buckle. Its pivot is the cell on the pelvis joint, at the torso's angle. */
export const NAVY_BELT: PaintedPiece = {
  pivot: [8, 12],
  angle: -89.65,
  rows: [
    'abbb..abb.aaacb.',
    '.aaaaaaaadeefaaa',
    '.ahaiajjklmnpaha',
    '.ahhqahhankrsaha',
    '..baataabuvwxaaa',
    '....ya..........',
  ],
  colors: {
    a: '#000316',
    b: '#0c1124',
    c: '#754833',
    d: '#ad7642',
    e: '#f8d584',
    f: '#a47040',
    h: '#1e1412',
    i: '#383641',
    j: '#412b2e',
    k: '#291a21',
    l: '#fad576',
    m: '#32201e',
    n: '#f2c46e',
    p: '#ecbd66',
    q: '#19182a',
    r: '#2b0d25',
    s: '#eab45c',
    t: '#aa7c4b',
    u: '#613f26',
    v: '#c18849',
    w: '#ce984e',
    x: '#683e2e',
    y: '#c8904b',
  },
};
