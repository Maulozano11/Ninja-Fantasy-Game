// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his picture of her at our game's
// scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of ours), cut by
// tools/refs/lyra-upper-from-ref.py into one piece per segment of the rig, pivot on its joint at our
// female idle, angle the segment's there. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** The blouse: the red V edged in gold and the skin in it (in the player's skin), the red scarf across the chest, the cream bust and the body to the waist (pivot: the base of the neck). */
export const BLOUSE_TORSO: PaintedPiece = {
  pivot: [7, -2],
  angle: -98.05,
  rows: [
    '.........djja......',
    '..........ddja.....',
    '..........d........',
    '...................',
    '.............dd....',
    '.....pkmnaaadjdqkb.',
    '.....aaracakaaaakbb',
    '.....aebblabkhhnkb.',
    '.....ahbbbbbbkekbb.',
    '.....pffffbbbbkbbb.',
    '...nniifffffffifff.',
    '....iiiiffffffffff.',
    '..affbbbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    'affbbbbbibbbfifiiia',
    'affbbbbbibbbfifiiia',
    'affbbbbbibbbfifiiia',
    '.afffffbibbbfifiiia',
    '.affbbbbibbbfifiiia',
    '.aaaaaaaaaaaaaaaaaa',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#43414e',
    d: '#ffc7a6',
    e: '#681d24',
    f: '#cbad8d',
    h: '#81152c',
    i: '#9d7e6a',
    j: '#d58771',
    k: '#db9b41',
    l: '#121116',
    m: '#230d17',
    n: '#481120',
    p: '#561025',
    q: '#e3896e',
    r: '#e4cc9b',
  },
};

/** The near sleeve: the bare top of the shoulder above it (in the player's skin), the red scarf band round the shoulder, the puff, its leather band with a steel buckle (pivot: the near shoulder). */
export const BLOUSE_SLEEVE_N: PaintedPiece = {
  pivot: [7, 3],
  angle: 107.10,
  rows: [
    '.........aaa.',
    '........apdn.',
    '.......apbddj',
    '......ajddddj',
    '......ajddd..',
    '.....aaaaaahk',
    '.....ahhiiika',
    '.....allllaa.',
    '.....aaaaafa.',
    '....affbbbfaa',
    '....acmabfa..',
    '....aamecaaa.',
    '...abbfaaa...',
    '..affbbbfa...',
    '.afbbbbfa....',
    'afbbbbffa....',
    'afbfbbbfa....',
    '.aaafbffa....',
    '....affa.....',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#362324',
    d: '#ffc7a6',
    e: '#573c3a',
    f: '#cbad8d',
    h: '#81152c',
    i: '#8f1d2f',
    j: '#d58771',
    k: '#481120',
    l: '#561025',
    m: '#9d9e9e',
    n: '#e3896e',
    p: '#f3a486',
  },
};

/** Where our body's near shoulder and upper arm come out from under the near sleeve at idle: the sleeve takes them off (pivot and angle as the piece's). */
export const BLOUSE_SLEEVE_N_CUT: PaintedPiece = {
  pivot: [5, 4],
  angle: 107.10,
  rows: [
    '.....xxx...',
    '....xxx....',
    '...xxx.....',
    '..xxx......',
    '..xx.......',
    '..xx.....xx',
    '..x........',
    '.xx........',
    '.xx........',
    '.xx........',
    'xx.........',
    'xx.........',
    'xx.........',
    'x..........',
  ],
  colors: { x: '#000000' },
};

/** The near fitted sleeve under the bracer and its cream cuff at the wrist (pivot: the near wrist). */
export const BLOUSE_FOREARM_N: PaintedPiece = {
  pivot: [2, 9],
  angle: 111.02,
  rows: [
    '....adc..',
    '...aaaaca',
    '..aadcda.',
    '...adcba.',
    '..adccba.',
    '..adcba..',
    '.aaacba..',
    '.accaaaaa',
    'acbbcda..',
    'abbaaaa..',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#cbad8d',
    d: '#9d7e6a',
  },
};

/** Where our body's near forearm comes out from under the bracer and cuff at idle: the fitted sleeve takes it off (pivot and angle as the piece's). */
export const BLOUSE_FOREARM_N_CUT: PaintedPiece = {
  pivot: [2, 10],
  angle: 111.02,
  rows: [
    '...x.....',
    '...x.....',
    '..x......',
    '.x......x',
    '.xx......',
    'xx.......',
    'xx.......',
    'x........',
    'x........',
  ],
  colors: { x: '#000000' },
};

/** The far puff, its top under the pauldron (pivot: the far shoulder). */
export const BLOUSE_SLEEVE_F: PaintedPiece = {
  pivot: [-1, -1],
  angle: 72.90,
  rows: [
    '.aaa..',
    'abba..',
    '.aba..',
    '..bca.',
    '..bba.',
    '..cca.',
    '..cda.',
    '..daa.',
    '...da.',
    '...ca.',
    '...ca.',
    '...dca',
    '...cca',
    '...cda',
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
  pivot: [-3, -4],
  angle: 72.90,
  rows: [
    'bca',
    'bba',
    'cca',
    'cda',
    'daa',
    '.da',
    '.ca',
    '.ca',
    '.dc',
    '.cc',
    '.cd',
  ],
  colors: {
    a: '#010101',
    b: '#f2e2c0',
    c: '#cbad8d',
    d: '#9d7e6a',
  },
};

/** The far fitted sleeve and its cuff, behind the pouch at her hip (pivot: the far wrist). */
export const BLOUSE_FOREARM_F: PaintedPiece = {
  pivot: [6, 11],
  angle: 66.05,
  rows: [
    'baa.....',
    'abaa....',
    'aaba....',
    'aacba...',
    '.acbba..',
    '.aacba..',
    '..acba..',
    '..aacba.',
    '...abba.',
    '...acbba',
    '....aaaa',
  ],
  colors: {
    a: '#010101',
    b: '#cbad8d',
    c: '#9d7e6a',
  },
};

/** Where our body's far forearm comes out from under the far bracer and cuff at idle: the fitted sleeve takes it off (pivot and angle as the piece's). */
export const BLOUSE_FOREARM_F_CUT: PaintedPiece = {
  pivot: [7, 11],
  angle: 66.05,
  rows: [
    'x...x.....',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '.......x..',
    '........x.',
    '..........',
    '..........',
    '.........x',
  ],
  colors: { x: '#000000' },
};

/** The corset: gold bands and filigree, steel buckles (pivot: the base of the neck). */
export const CORSET: PaintedPiece = {
  pivot: [7, -13],
  angle: -98.05,
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

/** The gold pauldron on the far shoulder and its strap, down across the chest to the braid (pivot: the far shoulder). */
export const CORSET_PAULDRON: PaintedPiece = {
  pivot: [4, 4],
  angle: 72.90,
  rows: [
    '.....da.....',
    '...abbja....',
    '...aebjha...',
    'aahfaadcda..',
    'chaaiadfhda.',
    'aa..adadcha.',
    '.......aidda',
    '........aaaa',
    '..........da',
    '..........aa',
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

/** The near bracer: leather with gold studs (pivot: the near wrist). */
export const CORSET_BRACER_N: PaintedPiece = {
  pivot: [1, 9],
  angle: 111.02,
  rows: [
    '...abc..',
    '..aaaaca',
    '.aabcba.',
    '..abcda.',
    '.abccda.',
    '.abcda..',
    'aaacda..',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#db9b41',
  },
};

/** The far bracer, in his near bracer's pattern, behind the pouch at her hip (pivot: the far wrist). */
export const CORSET_BRACER_F: PaintedPiece = {
  pivot: [6, 11],
  angle: 66.05,
  rows: [
    'daa....',
    'adaa...',
    'aada...',
    'aabca..',
    '.abcca.',
    '.aabca.',
    '..abca.',
    '..aabca',
    '...adda',
  ],
  colors: {
    a: '#010101',
    b: '#362324',
    c: '#573c3a',
    d: '#40302f',
  },
};

/** Where our body's chest carries the near shoulder's round above his bare shoulder at idle: the near sleeve takes it off the torso (pivot and angle as the piece's). */
export const BLOUSE_SHOULDER_CUT: PaintedPiece = {
  pivot: [5, 6],
  angle: 107.10,
  rows: [
    'xxxxxxxxx',
    'xxxxxxxxx',
    'xxxxxxxxx',
    'xxxxxxx..',
  ],
  colors: { x: '#000000' },
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

/** His skin on the bare top of the near shoulder and in the V, the one he used most first: the player's skin moves them from the first. */
export const LYRA_SKIN = ['#ffc7a6', '#f3a486', '#e3896e', '#d58771'];

/** His black line and his near-blacks: no slot moves them. */
export const LYRA_LINE = ['#010101', '#121116', '#230d17'];
