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
    '.......................abbcccda.............',
    '..................aaaaabbeeccddaaaaaaa......',
    '..................abbbbbbebbddddddddda......',
    '..................aeeeeeeeeeedddddddda......',
    '..................aeeeeeeeeeeeddddfffa......',
    '..................aeeeeeeeeeeedddffffa......',
    '..................aeeeeeeeeeeffffffffa......',
    '..................aeeeeeeeeefffffffffa......',
    '..................abbbbffffffffffffffa......',
    '..................abbbbffffffffffffffa.aaa..',
    '..................abbbbfffffffffffffffafffa.',
    '..................abbbbbfffffffffffffffffffa',
    '..................abbbbbbfffffffffffffffffa.',
    '..................abbbbbbbfffffffffffffaaa..',
    '..................abbbbbbbbfffffffffffa.....',
    '..................abbbbbbbbbffffffffffa.....',
    '..................abbbbbbbbbbfffffffffa.....',
    '..................abbbbbbbbbbbffffffffa.....',
    '..................abbbbbbbbbbbbfffffffa.....',
    '..................abbbbbbbbbbbbbffffffa.....',
    '..................abbbbbbbbbbbbbbfffffa.....',
    '.............aa...abbbbbbbbbbbbbbbffffa.....',
    '............acda..abbbbbbbbbbbbbbbbbbfa.....',
    '............acca..abbbbbbbbbbbbbbbbbbba.....',
    '...........addba..abbbbbbbbbbbbbbbbbbba.....',
    '...........adbba..abbbbbbbbbbbbbbbbbbba.....',
    '..........adbbbba.abbbbbbbbbbbbbbbbbbba.....',
    '..........adbbbbbabbbbbbbbbbbbbbbbbbbba.....',
    '.........adbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '........addbbbbhhhhbbbbbbbbbbbbbbbbbbba.....',
    '.......addbbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '.......addbbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '......adddbbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '.....adddbbbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '.....adddbbbbbbbbbbbbbbbbbbbbbbbbbbbbba.....',
    '....adddbbbbiibbbbbbbbbbbbbbbbbbbbbbbba.....',
    '...addddbbbbiibbbbbbbbbbbbbbbbbbbbbbbba.....',
    '...adddbbbbiiibbbbbbbbbbbbbbbbbbbbbbbba.....',
    '..addddbbbbiiibbbbbbbbbbbbbbbbbbbbbbbba.....',
    '..addddbbbbiiibbibbbbbbbbbbbbbbbbbbbbba.....',
    '.addddbbbbiiibbbibbbbbbbbbbbbbbbbbbbbba.....',
    '.addddbbbbiiibbbibbbbbbbbbbbbbbbbbbbbba.....',
    '.addddbbbiiiibbiibbbbbbbbbbbbbbbbbbbbba.....',
    'addddbbbbiiiibbiibbbbbbbbbbbbbbbbbbbbba.....',
    'addddbbbbiiiibbiibbbbbbbbbbbbbbbbbbbbba.....',
    'addddaaaiiiibbiiibbbbbbbbbbbbbbbbbbbba......',
    'addda...aiiibbiiibbbbbbbbbbbbbbbbbbbba......',
    'addda....aibbiiibbbbbbbbbbbbbbbbbbbbba......',
    'addda.....abbiiibbbbbbbbbbbbbbbbbbbbba......',
    'addda.....abbiiibbbbbbbbbbbbbbbbbbbbba......',
    '.ada......abbiiibbbbbbbbbbbbbbibbbbbba......',
    '.ada.......aiiiibbbbbbbbbbbbbiibbbbbba......',
    '.ada.......aiiiibbbbbbbbbbbbbiibbbbbba......',
    '..aa........aaiibbbbbbbbbbbbiiibbbbbba......',
    '..aa..........aaaabbbbbbbbbbiiibbbbbba......',
    '..aa..............abbbbbbbbbiibbaaaaa.......',
    '...a..............aabbbbbbbiiiba....a.......',
    '....................abbbaaaaaaa.....a.......',
    '.....................aba............a.......',
    '......................aa............a.......',
  ],
  colors: {
    a: '#010216',
    b: '#231932',
    c: '#463852',
    d: '#4d3f56',
    e: '#2a223a',
    f: '#38323e',
    h: '#101428',
    i: '#3f3246',
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
    'aaabbbbba.........aa....',
    '...aaaabba......aacba...',
    '........ba.......addbaa.',
    '........aaaaa....abebbba',
    '..........abbaaaabfdbbba',
    '..........ahhdbeeeidcba.',
    '..........adbieeeeedbea.',
    '..........aaaaabbbbbaa..',
    '...............aaaaa....',
  ],
  colors: {
    a: '#010216',
    b: '#463852',
    c: '#4d3f56',
    d: '#231932',
    e: '#2a223a',
    f: '#141c2e',
    h: '#38323e',
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
  '#463852': 'purple',
  '#4d3f56': 'purple',
};
