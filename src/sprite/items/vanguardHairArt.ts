// The owner's tactical figure's hair, his pixels at our scale (tools/refs/vanguard-hair-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const VANGUARD_HAIR_BASE = '#2b3244';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const VANGUARD_HAIR_KIND: Record<string, 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#04081c': 'hair',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#1e1e2a': 'hair',
  '#222b3c': 'hair',
  '#272a32': 'hair',
  '#2b3244': 'hair',
  '#323338': 'steel',
  '#343b4d': 'hair',
  '#3b3c40': 'steel',
  '#485063': 'hair',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const VANGUARD_HAIR_REST: Record<string, [number, number]> = {
  VANGUARD_HAIR: [115, 125],
};

/** His tactical figure's hair: blue-black spikes standing up and back, his own bangs over the brow. */
export const VANGUARD_HAIR: PaintedPiece = {
  pivot: [8, 14],
  angle: 0.00,
  rows: [
    '......aaaaaaa..........',
    '.....abcadcaaaa........',
    '..aaaaecbcdccdaaa......',
    '...aecfhbcccccccca.....',
    '..aaccccdffdcdiibcaa...',
    '.ajccccddcdcddccicca...',
    'aacciccccccccccccccba..',
    'aaciciiccickciciidccba.',
    'accckcdciicdbiddicddcda',
    'accdccdciicbdccddkcacca',
    'addccdccibcdaccdaccddaa',
    'adccddcccddaadcdacdcda.',
    'accdadcccd...dcd.ddcda.',
    'adda.dccca....d...adca.',
    'adaa.dccd.....da.aaaca.',
    'adaa.dccaa....da.aaadaa',
    '.aaa.dccj.........daaa.',
    '.aaa.dcd..........daa..',
    'aaaa..cd..........baa..',
    '...a..c...........ba...',
    '..al.ad...........a....',
    '..amnpaa...............',
    'aaaapqqa...............',
    '...............h.......',
  ],
  colors: {
    a: '#000116',
    b: '#1c2234',
    c: '#2b3244',
    d: '#141a2a',
    e: '#222b3c',
    f: '#0e101d',
    h: '#04081c',
    i: '#485063',
    j: '#00011f',
    k: '#343b4d',
    l: '#272a32',
    m: '#1e1e2a',
    n: '#323338',
    p: '#181822',
    q: '#3b3c40',
  },
};
