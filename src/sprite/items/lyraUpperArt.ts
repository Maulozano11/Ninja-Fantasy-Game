// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his heroine picture
// (docs/reference/lyra-owner-reference.jpg) at our scale on the female rig, as the study brought her
// down (tools/refs/heroine_ref.py), cut by tools/refs/lyra-upper-from-ref.py: one piece per segment
// of the rig, pivot on its joint at our female idle, angle the segment's there. Generated: rerun
// the script to change it.

import type { PaintedPiece } from '../painted';

/** The blouse: the red V edged in gold, the cream bust, the red scarf round to the near arm, the body to the waist (pivot: the base of the neck). */
export const BLOUSE_TORSO: PaintedPiece = {
  pivot: [12, -5],
  angle: -89.50,
  rows: [
    '......ccffccccffcccc...',
    '.acccccchfcccccfcccc...',
    '.accccbbhhfcccfhbbbbb..',
    '.abbbbhiihhfcfhiiiiha..',
    '.ahiiihhhhehfhehiihea..',
    '.ahheeeeeeddddddeehda..',
    '.ahhiihhhhehhhheeedda..',
    '..ahiihhhhehhhheeedda..',
    '..ahiihhhhehhhheeedda..',
    '...aiihhhhehhhheeedda..',
    '....aihhhhehhhheeedda..',
    '....aihhhhehhhheeedda..',
    '.....ahhhhehhhheeeda...',
    '.....ahhhhehhhheeeda...',
    '....aihhhhdhhhhdeeda...',
    '...aiihhhhdhhhhdeeda...',
    '..ahiihhhhdhehhdeedda..',
    '..ahiihhhhdhehhdeeddda.',
    '.ahhiihhhhdhehhdeeddda.',
    'ahhhiihhhhdhehhdeedddda',
    'aaaaaaaaaaaaaaaaaaaaaaa',
  ],
  colors: {
    a: '#04010d',
    b: '#590f26',
    c: '#8c1c35',
    d: '#ac937a',
    e: '#cbb194',
    f: '#e8b45e',
    h: '#e4d0af',
    i: '#f6e8cd',
  },
};

/** The near sleeve: the red scarf band and the puff (pivot: the near shoulder). */
export const BLOUSE_SLEEVE_N: PaintedPiece = {
  pivot: [9, -2],
  angle: 107.97,
  rows: [
    '...acccccccccc',
    '..accccccccccc',
    '..abbbccccbbbb',
    '.aidiiihhhhhfa',
    'aiiiiihhhhffa.',
    'aiiiihhhhffea.',
    'aiiihhhhfffea.',
    'ahihhhhfffeea.',
    'ahhhhffffeea..',
    '.afhfffeeea...',
    '.aaefeeeaaa...',
  ],
  colors: {
    a: '#04010d',
    b: '#590f26',
    c: '#8c1c35',
    d: '#634947',
    e: '#ac937a',
    f: '#cbb194',
    h: '#e4d0af',
    i: '#f6e8cd',
  },
};

/** The near fitted sleeve, gathered under the puff, and her cuff at the wrist (pivot: the near elbow). */
export const BLOUSE_FOREARM_N: PaintedPiece = {
  pivot: [5, 2],
  angle: 103.11,
  rows: [
    '.acccccca',
    '.acccccca',
    '.abcbcbba',
    '.abcbbbba',
    '.aeddccba',
    'adeddccba',
    'adedccbba',
    'adeddcbba',
    'adddccbba',
    'abcbbbba.',
    'aedddcca.',
    '...adca..',
  ],
  colors: {
    a: '#04010d',
    b: '#ac937a',
    c: '#cbb194',
    d: '#e4d0af',
    e: '#f6e8cd',
  },
};

/** The far sleeve: its red band under the pauldron and the puff (pivot: the far shoulder). */
export const BLOUSE_SLEEVE_F: PaintedPiece = {
  pivot: [-1, 2],
  angle: 77.78,
  rows: [
    '.aaaa...',
    'acccca..',
    'acccca..',
    'abbba...',
    'abbbbaa.',
    'aedffeea',
    'aedffeea',
    'aedfeeda',
    'aedfeeda',
    'aedeedda',
    'aedeedda',
    'aededdda',
    'aededdda',
    '.adaddaa',
    '...aaaaa',
  ],
  colors: {
    a: '#04010d',
    b: '#590f26',
    c: '#8c1c35',
    d: '#ac937a',
    e: '#cbb194',
    f: '#e4d0af',
  },
};

/** The far puff's edge where our torso is wider than hers: drawn over the body before the blouse, it moves with the far arm (pivot: the far shoulder). */
export const BLOUSE_SIDE_F: PaintedPiece = {
  pivot: [-4, -3],
  angle: 77.78,
  rows: [
    'ddc',
    'ddc',
    'dcc',
    'dcc',
    'ccb',
    'ccb',
    'cbb',
    'cbb',
    'abb',
  ],
  colors: {
    a: '#04010d',
    b: '#ac937a',
    c: '#cbb194',
    d: '#e4d0af',
  },
};

/** The far fitted sleeve and its cuff, behind the pouch at her hip (pivot: the far elbow). */
export const BLOUSE_FOREARM_F: PaintedPiece = {
  pivot: [2, 1],
  angle: 59.54,
  rows: [
    '.abbba....',
    'accbbba...',
    '.abbbbba..',
    '.acddcbba.',
    '..acddcbba',
    '..acdccbba',
    '...addcbba',
    '...abbbbba',
    '...acdcbba',
    '....accbaa',
    '....aaaa..',
  ],
  colors: {
    a: '#04010d',
    b: '#ac937a',
    c: '#cbb194',
    d: '#e4d0af',
  },
};

/** The corset: gold bands, gold filigree, two steel buckles, and the strap across the chest to the pauldron (pivot: the base of the neck). */
export const CORSET: PaintedPiece = {
  pivot: [10, -2],
  angle: -89.50,
  rows: [
    '..bbbbbabbbbbb.....',
    '...................',
    '...................',
    '...................',
    '...................',
    '...................',
    '...................',
    '...................',
    '...................',
    'afiiiifiiiiiiiiffia',
    'acddccfcddddjhcdcba',
    '.acddfcdddddheccdba',
    '.accfcdddddddccfcba',
    '..acdcfcddddjhcdcba',
    '..abdcddddddhecfcba',
    '...acfcddddddccdba.',
    '...acdcdddddddccba.',
    '...abcccccccccccba.',
    '...affiiffifffiifa.',
    'aaaaaaaaaaaaaaaaaa.',
  ],
  colors: {
    a: '#04010d',
    b: '#352628',
    c: '#473435',
    d: '#634947',
    e: '#686a74',
    f: '#ce9242',
    h: '#b0b6bc',
    i: '#e8b45e',
    j: '#d4e4ea',
  },
};

/** The gold pauldron on the far shoulder (pivot: the far shoulder). */
export const CORSET_PAULDRON: PaintedPiece = {
  pivot: [2, 4],
  angle: 77.78,
  rows: [
    '..aaaaa..',
    '.adeedca.',
    'adeddcbca',
    'abdcdbcda',
    'adcbcdbca',
    '.abcdcba.',
    '.aabcbaa.',
    '...aaa...',
  ],
  colors: {
    a: '#04010d',
    b: '#9c5d27',
    c: '#ce9242',
    d: '#e8b45e',
    e: '#fed982',
  },
};

/** The near bracer: her leather lit along its edge, gold studs (pivot: the near elbow). */
export const CORSET_BRACER_N: PaintedPiece = {
  pivot: [5, -1],
  angle: 103.11,
  rows: [
    '.adeddcca',
    '.aedfdcba',
    'adeddccba',
    'aedfccbba',
    'adeddccba',
    'aedfdcbba',
    'addddcba.',
    'aaa......',
  ],
  colors: {
    a: '#04010d',
    b: '#352628',
    c: '#473435',
    d: '#634947',
    e: '#8b7061',
    f: '#ce9242',
  },
};

/** The far bracer, after the near one in the far side's shade, behind the pouch at her hip (pivot: the far elbow). */
export const CORSET_BRACER_F: PaintedPiece = {
  pivot: [1, -1],
  angle: 59.54,
  rows: [
    '.aaaaaaa.',
    'adfdccba.',
    '.afdeccba',
    '.adfdccba',
    '..afdecba',
    '..adfdcba',
  ],
  colors: {
    a: '#04010d',
    b: '#352628',
    c: '#473435',
    d: '#634947',
    e: '#9c5d27',
    f: '#8b7061',
  },
};

/** Her blouse's cream, lit to dark; the Blouse slot moves them from the second. */
export const LYRA_BLOUSE = ['#f6e8cd', '#e4d0af', '#cbb194', '#ac937a'];

/** Her red lining (the scarf band and the V) and its dark; the Lining slot moves them from the first. */
export const LYRA_LINING = ['#8c1c35', '#590f26'];

/** Her gold, light to dark; the Gold slot moves them from the second. */
export const LYRA_GOLD = ['#fed982', '#e8b45e', '#ce9242', '#9c5d27'];

/** Her leather, lit to dark; the Leather slot moves them from the second. */
export const LYRA_LEATHER = ['#8b7061', '#634947', '#473435', '#352628'];

/** Her steel (the buckles), light to dark; the Steel slot moves them from the second. */
export const LYRA_STEEL = ['#d4e4ea', '#b0b6bc', '#686a74'];
