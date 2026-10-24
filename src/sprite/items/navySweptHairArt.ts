// The owner's swept-back black hair on his officer, the owner's pixels at our scale (tools/refs/navy-swept-hair-from-ref.py from
// docs/reference/navy-officer-dark-coat-owner-reference.jpg, reduced and cleaned by tools/refs/navy_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const SWEPT_HAIR_BASE = '#1d1b26';

/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */
export const SWEPT_HAIR_KIND: Record<string, 'hair' | 'line'> = {
  '#000116': 'line',
  '#10121f': 'hair',
  '#111217': 'hair',
  '#151a23': 'hair',
  '#1d1b26': 'hair',
  '#1d1e23': 'hair',
  '#2a2a32': 'hair',
  '#313237': 'hair',
  '#6a4630': 'hair',
  '#9e5e3f': 'hair',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const SWEPT_HAIR_REST: Record<string, [number, number]> = {
  SWEPT_HAIR_BACK: [116, 122],
  SWEPT_HAIR_FRONT: [116, 122],
};

/** His hair with what his face hides filled in, drawn behind the head. Its pivot is the cell on the face anchor. */
export const SWEPT_HAIR_BACK: PaintedPiece = {
  pivot: [7, 14],
  angle: 0.00,
  rows: [
    '.......aaaa.a..a.......',
    '...a....abcabaaaa......',
    '....aaaadabbdcbeca.a...',
    '....aaabbbaccebbebaaa..',
    '...aaffedccdbbcbecffa..',
    '.aafaefccffhebhhdcfa...',
    '..addebdaaaeadhhecefaa.',
    '..aebbfabdbadaafheaaa.a',
    '.aheddabebbedeadeaadba.',
    'aaadaababibedehdeeebaa.',
    '.addaaeabibedehdeeebaa.',
    'adddafebhibedehdeeebbaa',
    'aaeaefebhibedehdeeebeaa',
    '.aaaafebhibedehdeeeba..',
    'aaaaafebhibedehdeeeba..',
    '..aaj...............a..',
    '..ada..................',
    '.aada..................',
    '..aeda.................',
    '..aaaa.................',
    '...aaak................',
    '...aaaa................',
  ],
  colors: {
    a: '#000116',
    b: '#2a2a32',
    c: '#313237',
    d: '#10121f',
    e: '#111217',
    f: '#1d1b26',
    h: '#1d1e23',
    i: '#151a23',
    j: '#9e5e3f',
    k: '#6a4630',
  },
};

/** His hair over the head, his line included. Its pivot is the cell on the face anchor. */
export const SWEPT_HAIR_FRONT: PaintedPiece = {
  pivot: [7, 14],
  angle: 0.00,
  rows: [
    '.......aaaa.a..a.......',
    '...a....abcabaaaa......',
    '....aaaadabbdcbeca.a...',
    '....aaabbbaccebbebaaa..',
    '...aaffedccdbbcbecffa..',
    '.aafaefccffhebhhdcfa...',
    '..addebdaaaeadhhecefaa.',
    '..aebbfabdbadaafheaaa.a',
    '.aheddabeb...eadeaadba.',
    'aaadaababi.........baa.',
    '.addaaeab...........aa.',
    'adddafe.h...........baa',
    'aaeae...............eaa',
    '.aaaa...............a..',
    'aaaaa...............a..',
    '..aaj...............a..',
    '..ada..................',
    '.aada..................',
    '..aeda.................',
    '..aaaa.................',
    '...aaak................',
    '...aaaa................',
  ],
  colors: {
    a: '#000116',
    b: '#2a2a32',
    c: '#313237',
    d: '#10121f',
    e: '#111217',
    f: '#1d1b26',
    h: '#1d1e23',
    i: '#151a23',
    j: '#9e5e3f',
    k: '#6a4630',
  },
};
