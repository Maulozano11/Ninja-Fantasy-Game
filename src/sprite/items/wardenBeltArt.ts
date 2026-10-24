// The owner's armoured outfit: the belt, his pixels at our scale (tools/refs/warden-belt-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_BELT_LEATHER = '#322826';
export const WARDEN_BELT_BUCKLE = '#2c2b31';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_BELT_KIND: Record<string, 'brown' | 'dark' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#181822': 'dark',
  '#212227': 'dark',
  '#282421': 'brown',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#51473e': 'brown',
  '#63686e': 'steel',
  '#90959b': 'steel',
  '#a4a9ac': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_BELT_REST: Record<string, [number, number]> = {
  WARDEN_BELT_BELT: [115, 166],
};

/** His brown belt with its studs and the square buckle. It rides the pelvis. */
export const WARDEN_BELT_BELT: PaintedPiece = {
  pivot: [12, 10],
  angle: -89.65,
  rows: [
    '........aaaa....aaa',
    '.aaaaaabbcacdeeeaca',
    '.afhiaaaaaaajkkaaa.',
    '.ailhhmmmmmnphffiq.',
    '.aiiliiifhfnkhhiia.',
    'aaaaaiiffffaeffnda.',
    '.....aaaaaa......a.',
  ],
  colors: {
    a: '#000116',
    b: '#2c2b31',
    c: '#323338',
    d: '#45484f',
    e: '#3b3c40',
    f: '#322826',
    h: '#413833',
    i: '#212227',
    j: '#a4a9ac',
    k: '#63686e',
    l: '#282421',
    m: '#51473e',
    n: '#181822',
    p: '#90959b',
    q: '#00011f',
  },
};
