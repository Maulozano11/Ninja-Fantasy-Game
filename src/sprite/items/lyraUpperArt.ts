// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his picture of her at our game's
// scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of ours), cut by
// tools/refs/lyra-upper-from-ref.py into one piece per segment of the rig, pivot on its joint at our
// female idle, angle the segment's there. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** The blouse: the red V edged in gold, the red scarf across the chest, the cream bust and the body to the waist (pivot: the base of the neck). */
export const BLOUSE_TORSO: PaintedPiece = {
  pivot: [11, -4],
  angle: -89.50,
  rows: [
    '.....miklaaa....ib.',
    '.....aanacaiaaaaibb',
    '.....adbbjabifflib.',
    '.....afbbbbbbidibb.',
    '.....meeeebbbbibbb.',
    '...llhheeeeeeeheee.',
    '....hhhheeeeeeeeee.',
    '..aeebbbhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    'aeebbbbbhbbbehehhha',
    'aeebbbbbhbbbehehhha',
    'aeebbbbbhbbbehehhha',
    '.aeeeeebhbbbehehhha',
    '.aeebbbbhbbbehehhha',
    '.aaaaaaaaaaaaaaaaaa',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#43414e',
    d: '#681d24',
    e: '#cbad8d',
    f: '#81152c',
    h: '#9d7e6a',
    i: '#db9b41',
    j: '#121116',
    k: '#230d17',
    l: '#481120',
    m: '#561025',
    n: '#e4cc9b',
  },
};

/** The near sleeve: the red scarf band round the shoulder, the puff, its leather band with a steel buckle (pivot: the near shoulder). */
export const BLOUSE_SLEEVE_N: PaintedPiece = {
  pivot: [8, 1],
  angle: 107.97,
  rows: [
    '.....aaaaaafi',
    '.....affhhhia',
    '.....ajjjjaa.',
    '.....aaaaaea.',
    '....aeebbbeaa',
    '....ackabea..',
    '....aakdcaaa.',
    '...abbeaaa...',
    '..aeebbbea...',
    '.aebbbbea....',
    'aebbbbeea....',
    'aebebbbea....',
    '.aaaebeea....',
    '....aeea.....',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#362324',
    d: '#573c3a',
    e: '#cbad8d',
    f: '#81152c',
    h: '#8f1d2f',
    i: '#481120',
    j: '#561025',
    k: '#9d9e9e',
  },
};

/** The near fitted sleeve under the bracer and its cream cuff at the wrist (pivot: the near elbow). */
export const BLOUSE_FOREARM_N: PaintedPiece = {
  pivot: [7, 0],
  angle: 103.11,
  rows: [
    '....adc....',
    '...aaaacaca',
    '..aadcdadda',
    '...adcbabba',
    '..adccbaba.',
    '..adcbabba.',
    '..aacbaba..',
    '.accaacca..',
    'acbbcdada..',
    'abbaaaaa...',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#cbad8d',
    d: '#9d7e6a',
  },
};

/** The far puff, its top under the pauldron (pivot: the far shoulder). */
export const BLOUSE_SLEEVE_F: PaintedPiece = {
  pivot: [-2, 2],
  angle: 77.78,
  rows: [
    '.aaa..',
    'abba..',
    '.aba..',
    '.bb...',
    '.bbba.',
    '.ccca.',
    '.ccda.',
    '.ddaa.',
    '.ddda.',
    '.ccca.',
    '.ccca.',
    '.dddca',
    '.cccca',
    '.cccda',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#cbad8d',
    d: '#9d7e6a',
  },
};

/** The far puff's columns by the corset, drawn over the body's edge under the blouse; it moves with the far arm (pivot: the far shoulder). */
export const BLOUSE_SIDE_F: PaintedPiece = {
  pivot: [-3, -1],
  angle: 77.78,
  rows: [
    'aa',
    'aa',
    'bb',
    'bb',
    'cc',
    'cc',
    'bb',
    'bb',
    'cc',
    'bb',
    'bb',
  ],
  colors: {
    a: '#f2e2c0',
    b: '#cbad8d',
    c: '#9d7e6a',
  },
};

/** The far fitted sleeve and its cuff, behind the pouch at her hip (pivot: the far elbow). */
export const BLOUSE_FOREARM_F: PaintedPiece = {
  pivot: [0, -1],
  angle: 59.54,
  rows: [
    'caa.......',
    'acaa......',
    'aaca......',
    '.aadca....',
    '..adcca...',
    '..aadca...',
    '..adcca...',
    '....abbca.',
    '....abbbca',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#cbad8d',
    d: '#9d7e6a',
  },
};

/** The corset: gold bands and filigree, steel buckles (pivot: the base of the neck). */
export const CORSET: PaintedPiece = {
  pivot: [11, -10],
  angle: -89.50,
  rows: [
    '.............akaa..',
    '..alaaaaaddaadckkaa',
    '.allllllddddbbcbbda',
    '.abbbbbbccdbcihadba',
    '.abbbbbbcccdaajadba',
    '.abbbbbbbccdbbaadba',
    '.abbbbbbccccbfjadba',
    'abbbbbcccccdaajadba',
    'abbbbbbccaaaceaaaab',
    'abbaaaabbcfbaaaffcb',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#db9b41',
    e: '#40302f',
    f: '#644642',
    h: '#6b5f5f',
    i: '#6f534f',
    j: '#8b8a90',
    k: '#aa6a26',
    l: '#b77a30',
  },
};

/** The gold pauldron on the far shoulder and its strap (pivot: the far shoulder). */
export const CORSET_PAULDRON: PaintedPiece = {
  pivot: [2, 7],
  angle: 77.78,
  rows: [
    '..da.....',
    'abbja....',
    'aebjha...',
    '.aadcda..',
    '.iadfhda.',
    '.adadcha.',
    '....aidda',
    '.....aaaa',
    '.......da',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#db9b41',
    e: '#121116',
    f: '#40302f',
    h: '#644642',
    i: '#b77a30',
    j: '#fbbc57',
  },
};

/** The near bracer: leather with gold studs (pivot: the near elbow). */
export const CORSET_BRACER_N: PaintedPiece = {
  pivot: [5, 0],
  angle: 103.11,
  rows: [
    '..abc....',
    '.aaaacaca',
    'aabcbabba',
    '.abcdadda',
    'abccdada.',
    'abcdadda.',
    'aacdada..',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#db9b41',
  },
};

/** The far bracer, in his near bracer's pattern, behind the pouch at her hip (pivot: the far elbow). */
export const CORSET_BRACER_F: PaintedPiece = {
  pivot: [0, -1],
  angle: 59.54,
  rows: [
    'daa....',
    'adaa...',
    'aada...',
    '.aabca.',
    '..abcca',
    '..aabca',
    '..abcca',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#40302f',
  },
};

/** Her blouse's creams, the one he used most first, then light to dark; the Blouse slot moves them from the first. */
export const LYRA_BLOUSE = ['#f2e2c0', '#e4cc9b', '#cbad8d', '#9d7e6a'];

/** Her reds (the scarf band, the scarf and the V), the one he used most first, then light to dark; the Lining slot moves them from the first. */
export const LYRA_LINING = ['#81152c', '#8f1d2f', '#681d24', '#561025', '#481120'];

/** Her leathers, the one he used most first, then light to dark; the Leather slot moves them from the first. */
export const LYRA_LEATHER = ['#362324', '#6f534f', '#644642', '#573c3a', '#43414e', '#40302f'];

/** Her golds, the one he used most first, then light to dark; the Gold slot moves them from the first. */
export const LYRA_GOLD = ['#db9b41', '#fbbc57', '#b77a30', '#aa6a26'];

/** Her steels (the buckles), the one he used most first, then light to dark; the Steel slot moves them from the first. */
export const LYRA_STEEL = ['#8b8a90', '#9d9e9e', '#6b5f5f'];

/** His black line and his near-blacks: no slot moves them. */
export const LYRA_LINE = ['#010101', '#121116', '#230d17'];
