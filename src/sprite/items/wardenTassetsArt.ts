// The owner's armoured outfit: the mail skirt and tassets, his pixels at our scale (tools/refs/warden-tassets-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_TASSETS_STEEL = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_TASSETS_KIND: Record<string, 'brown' | 'dark' | 'hair' | 'line' | 'steel'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#0e101d': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#413833': 'brown',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#63686e': 'steel',
  '#6a7179': 'steel',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_TASSETS_REST: Record<string, [number, number]> = {
  WARDEN_TASSETS_SKIRT: [112, 171],
};

/** His mail skirt between the plate tassets, hanging from the belt over the thighs. It hangs from the pelvis. */
export const WARDEN_TASSETS_SKIRT: PaintedPiece = {
  pivot: [15, 5],
  angle: -89.65,
  rows: [
    '...aaaaa......a.....a......',
    '...abcddaaaaaaceffcca......',
    '..aahhheecccacaaacaaa..aa..',
    'a.aihhceejkacacacacacjcca..',
    '..cihcfebcjcacacacacaacca..',
    '....hcbfbblacacacacaaacca..',
    '......ffckaaacacacacaakb...',
    '.....aacckamaacacacanakc...',
    '.....pckaaaqmcacacacaakc...',
    '.....aclaicammaaammabbak.a.',
    '.....aknhbbeamaaamaabbijca.',
    '.......aaeeanaaaaarabbiaea.',
    '..........a.aaaansraeebaeia',
    '...............a...aa..a..a',
  ],
  colors: {
    a: '#000116',
    b: '#3b3c40',
    c: '#323338',
    d: '#1e1e2a',
    e: '#45484f',
    f: '#4f5259',
    h: '#141a2a',
    i: '#2c2b31',
    j: '#575c62',
    k: '#63686e',
    l: '#6a7179',
    m: '#181822',
    n: '#212227',
    p: '#00011f',
    q: '#0e101d',
    r: '#413833',
    s: '#322826',
  },
};
