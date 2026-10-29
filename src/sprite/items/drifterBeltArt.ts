// The owner's leather rogue: the belt with pouches, his pixels at our scale (tools/refs/drifter-belt-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const DRIFTER_BELT_LEATHER = '#2c2b31';

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
  DRIFTER_BELT_BELT: [115, 166],
};

/** His belt with its pouches and buckle. It rides the pelvis. */
export const DRIFTER_BELT_BELT: PaintedPiece = {
  pivot: [12, 10],
  angle: -89.65,
  rows: [
    '.......a...a........',
    '..aaaa..b.acab...a.a',
    '.aadeaaabfffaaaaaaba',
    'ahieaiijkaaaallmmaaa',
    'ajddanjnapppllqrrmda',
    'aajdanjnannnnljjrmsa',
    'at.daaauannn.ljjucsa',
    'a...a...a..........a',
  ],
  colors: {
    a: '#000116',
    b: '#2c2b31',
    c: '#3b3c40',
    d: '#181822',
    e: '#1e1e2a',
    f: '#323338',
    h: '#5a534a',
    i: '#544a48',
    j: '#413833',
    k: '#00011f',
    l: '#575c62',
    m: '#45484f',
    n: '#322826',
    p: '#51473e',
    q: '#151116',
    r: '#221c1e',
    s: '#0e101d',
    t: '#282421',
    u: '#212227',
  },
};
