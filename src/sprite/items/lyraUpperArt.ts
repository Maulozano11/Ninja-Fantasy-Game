// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his picture of her at our game's
// scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of ours), cut by
// tools/refs/lyra-upper-from-ref.py into one piece per segment of the rig, pivot on its joint at our
// female idle, angle the segment's there. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** The blouse: the red V edged in gold and the skin in it (in the player's skin), the red scarf across the chest, the cream bust and the body to the waist (pivot: the base of the neck). */
export const BLOUSE_TORSO: PaintedPiece = {
  pivot: [10, -2],
  angle: -90.10,
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
  pivot: [9, 2],
  angle: 107.95,
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

/** Where our body's near shoulder and upper arm come out from under the near sleeve at idle: the sleeve takes them off (pivot and angle as the sleeve's). */
export const BLOUSE_SLEEVE_N_CUT: PaintedPiece = {
  pivot: [6, 4],
  angle: 107.95,
  rows: [
    '......xxx..',
    '....xxxxxx.',
    '...xxx...xx',
    '..xxx....xx',
    '..xx......x',
    '.xx.......x',
    '.xx.....xxx',
    '...........',
    '...........',
    '.x.........',
    '.x.........',
    '...........',
    '...........',
    'x..........',
  ],
  colors: { x: '#000000' },
};

/** The near fitted sleeve under the bracer and its cream cuff at the wrist (pivot: the near elbow). */
export const BLOUSE_FOREARM_N: PaintedPiece = {
  pivot: [4, -1],
  angle: 103.11,
  rows: [
    '....adc..',
    '...aaaaca',
    '..aadcda.',
    '.adadcba.',
    '.aadccba.',
    'adadcba..',
    'acaacba..',
    'aaccaa...',
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

/** The far puff, its top under the pauldron (pivot: the far shoulder). */
export const BLOUSE_SLEEVE_F: PaintedPiece = {
  pivot: [-3, -2],
  angle: 79.34,
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
  pivot: [-4, -5],
  angle: 79.34,
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
  pivot: [0, 0],
  angle: 57.69,
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
  pivot: [10, -13],
  angle: -90.10,
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
  pivot: [4, 3],
  angle: 79.34,
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
  pivot: [4, -1],
  angle: 103.11,
  rows: [
    '....abc..',
    '...aaaaca',
    '..aabcba.',
    '.ababcda.',
    '.aabccda.',
    'ababcda..',
    'acaacda..',
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
  pivot: [0, 0],
  angle: 57.69,
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
export const LYRA_BLOUSE = ['#cbad8d', '#f2e2c0', '#e4cc9b', '#9d7e6a'];

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
