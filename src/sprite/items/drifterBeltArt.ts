// The owner's leather rogue: the belt with pouches, his pixels at our scale (tools/refs/drifter-belt-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const DRIFTER_BELT_LEATHER = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const DRIFTER_BELT_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#151116': 'dark',
  '#181822': 'dark',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#221c1e': 'dark',
  '#282421': 'brown',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#51473e': 'brown',
  '#544a48': 'brown',
  '#575c62': 'steel',
  '#5a534a': 'brown',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const DRIFTER_BELT_REST: Record<string, [number, number]> = {
  DRIFTER_BELT_BELT: [115, 167],
};

/** His belt with its pouches and buckle. It rides the pelvis. */
export const DRIFTER_BELT_BELT: PaintedPiece = {
  pivot: [12, 9],
  angle: -89.65,
  rows: [
    '..aaaa....a.a....a.a',
    '.aabcaaadeeeaaaaaada',
    'afhcahhijaaaakkllaaa',
    'aibbamimannnkkpqqlba',
    'aaibamimammmmkiiqlra',
    'asmbaaatammmikiitura',
    'a...a...a..........a',
  ],
  colors: {
    a: '#000116',
    b: '#181822',
    c: '#1e1e2a',
    d: '#2c2b31',
    e: '#323338',
    f: '#5a534a',
    h: '#544a48',
    i: '#413833',
    j: '#00011f',
    k: '#575c62',
    l: '#45484f',
    m: '#322826',
    n: '#51473e',
    p: '#151116',
    q: '#221c1e',
    r: '#0e101d',
    s: '#282421',
    t: '#212227',
    u: '#3b3c40',
  },
};
