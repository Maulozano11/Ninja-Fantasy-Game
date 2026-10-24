// The owner's purple cape and scarf (cape_hoplite).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-cape-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-cape-from-ref.py src/sprite/items/hopliteCapeArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_CAPE_CLOTH = '#231932';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_CAPE_REST: Record<string, [number, number]> = {
  HOPLITE_CAPE: [95, 148],
  HOPLITE_SCARF: [115, 148],
};

/** His cape behind him: hangs from the neck. */
export const HOPLITE_CAPE: PaintedPiece = {
  pivot: [33, 2],
  angle: -87.46,
  rows: [
    '.........................a..................',
    '........................abaaaa..............',
    '.......................acbdefha.............',
    '..................aaaaaccbbefhhaaaaaaa......',
    '..................accccccbbcefhhhhhhha......',
    '..................abbbbbbbbbdefhhhhffa......',
    '..................abbbbbbbbbbefhhffeea......',
    '..................abbbbbbbbbbdfffeedda......',
    '..................abbbbbbbbbbdeeedddda......',
    '..................abbbbbbbbbddddddddda......',
    '..................acccbbddddddddddddda......',
    '..................accccbddddddddddddda.aaa..',
    '..................accccbddddddddddddddaddda.',
    '..................accccbbdddddddddddddddddda',
    '..................acccccbbdddddddddddddddda.',
    '..................accccccbbddddddddddddaaa..',
    '..................acccccccbbdddddddddda.....',
    '..................accccccccbbddddddddda.....',
    '..................acccccccccbbdddddddda.....',
    '..................accccccccccbbddddddda.....',
    '..................acccccccccccbbdddddda.....',
    '..................accccccccccccbbddddda.....',
    '..................acccccccccccccbbdddda.....',
    '.............aa...accccccccccccccbbbdda.....',
    '............affa..acccccccccccccccbbbda.....',
    '............afea..accccccccccccccccccba.....',
    '...........aheda..accccccccccccccccccba.....',
    '...........afcba..accccccccccccccccccba.....',
    '..........ahcbcca.accccccccccccccccccba.....',
    '..........afcbcccacccccccccccccccccccca.....',
    '.........ahcbccccccccccccccccccccccccca.....',
    '........ahfcbcciiiiccccccccccccccccccca.....',
    '.......ahhcbcccccccccccccccccccccccccca.....',
    '.......ahfcbcccccccccccccccccccccccccca.....',
    '......ahfebccccccccccccccccccccccccccca.....',
    '.....ahhfdbcbbbccccccccccccccccccccccca.....',
    '.....ahfdbccbbbccccccccccccccccccccccca.....',
    '....ahhfdbcbbdbccccccccccccccccccccccca.....',
    '...ahhhebccbddbccccccccccccccccccccccca.....',
    '...ahhfcbccbddbcbbcccccccccccccccccccca.....',
    '..ahhhebccbdddbcbbcccccccccccccccccccca.....',
    '..ahhfdbccbddbbbbbcccccccccccccccccccca.....',
    '.ahhhfbccbdddbcbbbcccccccccccccccccccca.....',
    '.ahhhebccbdedbcbbbcccccccccccccccccccca.....',
    '.ahhfdbcbbdedbbbdbcccccccccccccccccccca.....',
    'afhhfbccbdeedbbddbcccccccccccccccccccca.....',
    'afhhebccbdedbbbddbcccccccccccccccccccca.....',
    'ahhhfaaaddedbbbdbbccccccccccccccccccca......',
    'ahhha...aeedbbddbbccccccccccccccccccca......',
    'ahhha....adbbbddbcccccccccccccccccccca......',
    'ahhha.....abbdedbcccccccccccccbbccccca......',
    'ahhha.....acbdedbccccccccccccbbbccccca......',
    '.aha......abbdedbccccccccccccbbbccccca......',
    '.aha.......addedbcccccccccccbbbbccccca......',
    '.aha.......addedbcccccccccccbddbccccca......',
    '..aa........aadbbcccccccccccbddbccccca......',
    '..aa..........aaaacccccccccbddbbccccca......',
    '..aa..............accccccccbddbbaaaaa.......',
    '...a..............aaccccccbdddba....a.......',
    '....................acccaaaaaaa.....a.......',
    '.....................aca............a.......',
    '......................aa............a.......',
  ],
  colors: {
    a: '#010216',
    b: '#2a223a',
    c: '#231932',
    d: '#38323e',
    e: '#3f3246',
    f: '#463852',
    h: '#4d3f56',
    i: '#101428',
  },
};

/** What each colour of HOPLITE_CAPE is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_CAPE_KIND: Record<string, 'dark' | 'line' | 'purple'> = {
  '#010216': 'line',
  '#101428': 'dark',
  '#231932': 'purple',
  '#2a223a': 'purple',
  '#38323e': 'purple',
  '#3f3246': 'purple',
  '#463852': 'purple',
  '#4d3f56': 'purple',
};

/** His scarf round the neck, in front of the chest and the head's neck. */
export const HOPLITE_SCARF: PaintedPiece = {
  pivot: [13, 2],
  angle: -87.46,
  rows: [
    '.aaaaaaa................',
    'aaabcccda.........aa....',
    '...aaaadda......aadba...',
    '........ba.......aeedaa.',
    '........aaaaa....adfddba',
    '..........addaaaadheddba',
    '..........acdeddcciedda.',
    '..........afcifcccfedca.',
    '..........aaaaaccccdaa..',
    '...............aaaaa....',
  ],
  colors: {
    a: '#010216',
    b: '#463852',
    c: '#38323e',
    d: '#3f3246',
    e: '#231932',
    f: '#2a223a',
    h: '#141c2e',
    i: '#101428',
  },
};

/** What each colour of HOPLITE_SCARF is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SCARF_KIND: Record<string, 'dark' | 'line' | 'purple'> = {
  '#010216': 'line',
  '#101428': 'dark',
  '#141c2e': 'dark',
  '#231932': 'purple',
  '#2a223a': 'purple',
  '#38323e': 'purple',
  '#3f3246': 'purple',
  '#463852': 'purple',
};
