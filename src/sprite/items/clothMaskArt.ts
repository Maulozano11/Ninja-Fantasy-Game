// The owner's cloth mask on his Renegade, his pixels (tools/refs/renegade-mask-from-ref.py from
// docs/reference/renegade-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const MASK_CLOTH = '#392325';

/** What each of his colours is: his line, skin, hair, cloth, or the kunai's metal and rust. */
export const CLOTH_MASK_KIND: Record<string, 'line' | 'skin' | 'hair' | 'cloth' | 'metal' | 'rust'> = {
  '#010000': 'line',
  '#130a0d': 'line',
  '#181411': 'line',
  '#1f0f0f': 'line',
  '#271919': 'cloth',
  '#342122': 'cloth',
  '#392325': 'cloth',
  '#3f2724': 'cloth',
  '#442824': 'cloth',
  '#4c2f27': 'cloth',
  '#4c423a': 'cloth',
  '#4f322c': 'cloth',
  '#55372c': 'cloth',
  '#553830': 'cloth',
  '#562810': 'cloth',
  '#593a30': 'cloth',
  '#5e3d34': 'cloth',
  '#614339': 'cloth',
  '#66341a': 'cloth',
  '#664339': 'cloth',
  '#724f46': 'cloth',
  '#775148': 'cloth',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const CLOTH_MASK_REST: Record<string, [number, number]> = {
  CLOTH_MASK: [119, 142],
};

/** His mask from under the eyes to its point over the collar, wrapped round the jaw and neck: its pivot is the cell on our face anchor. */
export const CLOTH_MASK: PaintedPiece = {
  pivot: [4, -3],
  angle: 0.00,
  rows: [
    '...aaaaaaaaaaaa.',
    '..abcddccceefhia',
    'aahhjhhhieekhhaa',
    'alahhmnmmppeia..',
    'aqrahhmmmssjiaa.',
    '.aahhhhhhmspaaa.',
    '..ahhhfftishha..',
    '...ahhjffhsha...',
    '...ahfuhfssha...',
    '...ahhaaffka....',
    '....aa.aifha....',
    '........ahia....',
    '.........aiv....',
    '........wxa.....',
    '.........w......',
  ],
  colors: {
    a: '#010000',
    b: '#66341a',
    c: '#724f46',
    d: '#775148',
    e: '#664339',
    f: '#55372c',
    h: '#392325',
    i: '#342122',
    j: '#4f322c',
    k: '#614339',
    l: '#3f2724',
    m: '#593a30',
    n: '#553830',
    p: '#562810',
    q: '#442824',
    r: '#4c2f27',
    s: '#5e3d34',
    t: '#271919',
    u: '#130a0d',
    v: '#1f0f0f',
    w: '#181411',
    x: '#4c423a',
  },
};
