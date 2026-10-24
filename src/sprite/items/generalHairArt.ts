// The owner's Roman general's curly mane.
// Lifted from the owner's Roman general (docs/reference/roman-general-owner-reference.jpg) and
// brought down to our scale by tools/refs/general-hair-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-hair-from-ref.py src/sprite/items/generalHairArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_HAIR_BASE = '#623828';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_HAIR_REST: Record<string, [number, number]> = {
  GENERAL_HAIR: [112, 125],
};

/** His curly mane: stamped on the face anchor, in front of the head. */
export const GENERAL_HAIR: PaintedPiece = {
  pivot: [11, 11],
  angle: -90.00,
  rows: [
    '..........aaaa.aaa......',
    '........aabcdeafdhaa....',
    '.......aibdiiibbfjkca...',
    '......almnkekiedpqrsta..',
    '.....ammuqeeevwscxnxfda.',
    '....ahycrizssrnxxxrkexa.',
    '....afwqiiAc.....xBasC..',
    '.....aDxEdb.............',
    '....aCfidD.............a',
    '...amyffF..............a',
    '...abbfb................',
    '...acGc.................',
    '....aqB.................',
    '.....af.................',
    '....azyy................',
    '....axGf................',
    '....axHi................',
    '....abfx................',
    'aaaaybfa................',
    'aIIaaafxa...............',
    '.aa...aa................',
  ],
  colors: {
    a: '#02021c',
    b: '#5a3226',
    c: '#42241e',
    d: '#a6724a',
    e: '#b87e4d',
    f: '#341a1e',
    h: '#643e32',
    i: '#623828',
    j: '#a57340',
    k: '#bc8546',
    l: '#241a23',
    m: '#70422f',
    n: '#b27640',
    p: '#885336',
    q: '#4e2d26',
    r: '#a16a42',
    s: '#c88e51',
    t: '#c38d46',
    u: '#996238',
    v: '#704a38',
    w: '#8d5842',
    x: '#26121d',
    y: '#3a2024',
    z: '#6c3e26',
    A: '#824d2e',
    B: '#1a0a16',
    C: '#3e2a26',
    D: '#2c1014',
    E: '#785034',
    F: '#7a472c',
    G: '#2e1427',
    H: '#0e0c1c',
    I: '#e6e5e1',
  },
};

/** What each colour of GENERAL_HAIR is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HAIR_KIND: Record<string, 'dark' | 'grey' | 'line' | 'purple' | 'warm'> = {
  '#02021c': 'line',
  '#0e0c1c': 'dark',
  '#1a0a16': 'dark',
  '#241a23': 'purple',
  '#26121d': 'dark',
  '#2c1014': 'dark',
  '#2e1427': 'dark',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#3e2a26': 'warm',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#643e32': 'warm',
  '#6c3e26': 'warm',
  '#70422f': 'warm',
  '#704a38': 'warm',
  '#785034': 'warm',
  '#7a472c': 'warm',
  '#824d2e': 'warm',
  '#885336': 'warm',
  '#8d5842': 'warm',
  '#996238': 'warm',
  '#a16a42': 'warm',
  '#a57340': 'warm',
  '#a6724a': 'warm',
  '#b27640': 'warm',
  '#b87e4d': 'warm',
  '#bc8546': 'warm',
  '#c38d46': 'warm',
  '#c88e51': 'warm',
  '#e6e5e1': 'grey',
};
