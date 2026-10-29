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
    '..........aaaaaaaa.....',
    '........aabcdeafcdaa...',
    '.......ahiihhhbbfjkka..',
    '......ablijdhhminpidda.',
    '.....aphhpqredjinnijiia',
    '....apmchhqcsednnnbiila',
    '....afnphhrc.....ntail.',
    '....aaunffb............',
    '....avfnnl.............',
    '...aqmffn..............',
    '...abhfb...............',
    '...abpp................',
    '....apw................',
    '....aaw................',
    '....abmw...............',
    '....apxf...............',
    '....awwp...............',
    '....awwc...............',
    'aaaacwca...............',
    'ayyaaacma..............',
    '.aa...aa...............',
  ],
  colors: {
    a: '#02021c',
    b: '#5a3226',
    c: '#42241e',
    d: '#b27640',
    e: '#b87e4d',
    f: '#341a1e',
    h: '#623828',
    i: '#a16a42',
    j: '#a6724a',
    k: '#8d5842',
    l: '#996238',
    m: '#3a2024',
    n: '#26121d',
    p: '#4e2d26',
    q: '#6c3e26',
    r: '#824d2e',
    s: '#bc8546',
    t: '#1a0a16',
    u: '#2c1014',
    v: '#3e2a26',
    w: '#512a1c',
    x: '#2e1427',
    y: '#e6e5e1',
  },
};

/** What each colour of GENERAL_HAIR is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HAIR_KIND: Record<string, 'dark' | 'grey' | 'line' | 'warm'> = {
  '#02021c': 'line',
  '#1a0a16': 'dark',
  '#26121d': 'dark',
  '#2c1014': 'dark',
  '#2e1427': 'dark',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#3e2a26': 'warm',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#512a1c': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#6c3e26': 'warm',
  '#824d2e': 'warm',
  '#8d5842': 'warm',
  '#996238': 'warm',
  '#a16a42': 'warm',
  '#a6724a': 'warm',
  '#b27640': 'warm',
  '#b87e4d': 'warm',
  '#bc8546': 'warm',
  '#e6e5e1': 'grey',
};
