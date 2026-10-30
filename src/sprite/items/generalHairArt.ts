// The owner's Roman general's curly mane.
// Lifted from the owner's Roman general (docs/reference/general-head-v2-owner-reference.png) and
// brought down to our scale by tools/refs/general-hair-from-ref.py (tools/refs/general_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/general-hair-from-ref.py src/sprite/items/generalHairArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const GENERAL_HAIR_BASE = '#5a3226';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const GENERAL_HAIR_REST: Record<string, [number, number]> = {
  GENERAL_HAIR: [114, 125],
};

/** His curly mane: stamped on the face anchor, in front of the head. */
export const GENERAL_HAIR: PaintedPiece = {
  pivot: [9, 11],
  angle: -90.00,
  rows: [
    '.......aaaaaaaaa.....',
    '.....aabcdefahieaa...',
    '....ajkkjjjcbjlemka..',
    '...aj.kdnjjpmklcdqna.',
    '..acjjcrsqekkkllddkka',
    '.achijjrceedklllrddma',
    '.ahtcjjsceeedkkltadma',
    '.aallhhbeeccpc..blra.',
    '.achllds..c......cla.',
    'ajpllh.............a.',
    'abrh..............ala',
    'abcc..............aca',
    '.acc..............aba',
    '.aac..............aa.',
    '.ajcca............a..',
    '.ablll............a..',
    '.accca...............',
    '.acch................',
    'aicia................',
    'aaaaa................',
  ],
  colors: {
    a: '#02021c',
    b: '#5a3226',
    c: '#4e2d26',
    d: '#a6724a',
    e: '#b87e4d',
    f: '#1a0a16',
    h: '#3a2024',
    i: '#42241e',
    j: '#623828',
    k: '#a16a42',
    l: '#341a1e',
    m: '#996238',
    n: '#b27640',
    p: '#3e2a26',
    q: '#bc8546',
    r: '#6c3e26',
    s: '#824d2e',
    t: '#26121d',
  },
};

/** What each colour of GENERAL_HAIR is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const GENERAL_HAIR_KIND: Record<string, 'dark' | 'line' | 'warm'> = {
  '#02021c': 'line',
  '#1a0a16': 'dark',
  '#26121d': 'dark',
  '#341a1e': 'warm',
  '#3a2024': 'warm',
  '#3e2a26': 'warm',
  '#42241e': 'warm',
  '#4e2d26': 'warm',
  '#5a3226': 'warm',
  '#623828': 'warm',
  '#6c3e26': 'warm',
  '#824d2e': 'warm',
  '#996238': 'warm',
  '#a16a42': 'warm',
  '#a6724a': 'warm',
  '#b27640': 'warm',
  '#b87e4d': 'warm',
  '#bc8546': 'warm',
};
