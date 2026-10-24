// The owner's tactical outfit: the utility belt, his pixels at our scale (tools/refs/vanguard-belt-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_BELT_CLOTH = '#2c2b31';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_BELT_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#575c62': 'steel',
  '#6a7179': 'steel',
  '#888888': 'steel',
  '#a4a9ac': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_BELT_REST: Record<string, [number, number]> = {
  VANGUARD_BELT_BELT: [113, 168],
};

/** His utility belt with its pouches and buckle. It rides the pelvis. */
export const VANGUARD_BELT_BELT: PaintedPiece = {
  pivot: [14, 8],
  angle: -89.65,
  rows: [
    '.aaaa.................',
    'abccaaaaaaaaaaaaaaaaaa',
    'abcdaecfaecaaahhijadea',
    'akedaccdaebbaajjjjakea',
    'aaadakcdadekaajljjaaaa',
    'amdnabekaaaaajjaaaaaka',
    'akddakekappppaaakdkab.',
    'aa..aaaa.....a.a....a.',
  ],
  colors: {
    a: '#000116',
    b: '#2c2b31',
    c: '#3b3c40',
    d: '#212227',
    e: '#323338',
    f: '#1e1e2a',
    h: '#a4a9ac',
    i: '#888888',
    j: '#575c62',
    k: '#181822',
    l: '#6a7179',
    m: '#0e101d',
    n: '#322826',
    p: '#141a2a',
  },
};
