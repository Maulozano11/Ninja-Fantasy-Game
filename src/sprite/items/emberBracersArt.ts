// The owner's leather arm guards, his pixels (tools/refs/akira-bracers-from-ref.py from
// docs/reference/akira-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const EMBER_BRACER_LEATHER = '#482a23';
export const EMBER_BRACER_STRAP = '#331a15';
export const EMBER_BRACER_SKIN = '#f0c4a0';

/** The middle of his far fist in our male idle frame 0 (fine pixels): our far hand is carried there. */
export const EMBER_BRACER_FIST: [number, number] = [140, 178];

/** What each of his colours is, as the script sorts them. */
export const EMBER_BRACER_KIND: Record<string, 'leather' | 'line' | 'skin' | 'strap'> = {
  '#01020e': 'line',
  '#01020f': 'line',
  '#01030e': 'line',
  '#010312': 'line',
  '#02010b': 'line',
  '#020313': 'line',
  '#020413': 'line',
  '#020416': 'line',
  '#06040d': 'line',
  '#0c0915': 'line',
  '#100811': 'line',
  '#160c14': 'line',
  '#1b1014': 'line',
  '#1b1019': 'line',
  '#211718': 'line',
  '#231415': 'line',
  '#251a1a': 'line',
  '#291617': 'strap',
  '#2a1618': 'skin',
  '#301814': 'strap',
  '#331a17': 'strap',
  '#341b16': 'strap',
  '#341b1b': 'leather',
  '#391d1a': 'leather',
  '#391e19': 'leather',
  '#392f2d': 'leather',
  '#3d201d': 'leather',
  '#3e221d': 'leather',
  '#402521': 'leather',
  '#43262e': 'skin',
  '#432723': 'leather',
  '#472a23': 'leather',
  '#482a23': 'leather',
  '#51362b': 'leather',
  '#51382d': 'skin',
  '#533a2f': 'leather',
  '#533b2f': 'leather',
  '#593d31': 'leather',
  '#623535': 'skin',
  '#76513f': 'leather',
  '#7a5844': 'leather',
  '#7c4741': 'skin',
  '#7e4740': 'skin',
  '#7e5946': 'leather',
  '#874e46': 'skin',
  '#93725c': 'leather',
  '#a27f64': 'leather',
  '#c0715d': 'skin',
  '#c67660': 'skin',
  '#cb7d65': 'skin',
  '#cc7a60': 'skin',
  '#cc7f67': 'skin',
  '#cc8166': 'skin',
  '#d18469': 'skin',
  '#d4896b': 'skin',
};

/** Where each piece lands in Akira's idle frame 0 (male), where he drew it: the fine pixel of its first row's first cell. */
export const EMBER_BRACER_REST: Record<string, [number, number]> = {
  EMBER_BRACER_F: [134, 164],
  EMBER_BRACER_N: [103, 165],
  EMBER_FIST_F: [137, 175],
  EMBER_FIST_N: [103, 179],
};

/** The far forearm guard down to the cuff over the back of the fist, at his angle: it rides the forearm about our elbow. */
export const EMBER_BRACER_F: PaintedPiece = {
  pivot: [3, 0],
  angle: 76.24,
  rows: [
    '..aa..bb...',
    '..acabbde..',
    '.bbeefhie..',
    '.bddibjkb..',
    '.edhjlehdb.',
    '.ejjbeehdb.',
    '.beebhljdb.',
    '.bljjddedb.',
    '.biiibbbe..',
    '.dbdeiidbb.',
    'bbbbiiidde.',
    '.mbbiednkdp',
    '..qbb..rnib',
    '.......emnb',
    '......bdiib',
    '.........ae',
  ],
  colors: {
    a: '#211718',
    b: '#020313',
    c: '#392f2d',
    d: '#3d201d',
    e: '#01020f',
    f: '#100811',
    h: '#593d31',
    i: '#391d1a',
    j: '#533a2f',
    k: '#432723',
    l: '#331a17',
    m: '#341b1b',
    n: '#482a23',
    p: '#02010b',
    q: '#1b1014',
    r: '#291617',
  },
};

/** The near forearm guard, elbow to cuff: it rides the forearm about the elbow. */
export const EMBER_BRACER_N: PaintedPiece = {
  pivot: [7, -1],
  angle: 103.19,
  rows: [
    '.aaab......',
    'acdcaeeab.e',
    'adfcchaiaaa',
    'adffdjkella',
    'ecffchcaama',
    '.adndhcapee',
    '.adaeaekpa.',
    '.eelinnkaa.',
    '.ajdffiaka.',
    '.aallfdaka.',
    '..aklkkaa..',
    '.qccllcra..',
    'akccccccke.',
    'adscccckta.',
    'euccvclala.',
    '..ww..a.ea.',
  ],
  colors: {
    a: '#010312',
    b: '#251a1a',
    c: '#593d31',
    d: '#533b2f',
    e: '#01020e',
    f: '#7e5946',
    h: '#301814',
    i: '#51362b',
    j: '#341b16',
    k: '#391e19',
    l: '#402521',
    m: '#06040d',
    n: '#7a5844',
    p: '#472a23',
    q: '#020416',
    r: '#3e221d',
    s: '#93725c',
    t: '#76513f',
    u: '#160c14',
    v: '#a27f64',
    w: '#1b1019',
  },
};

/** His far fist under the cuff, at the guard's angle: it rides the forearm about our elbow with the guard. */
export const EMBER_FIST_F: PaintedPiece = {
  pivot: [0, -11],
  angle: 76.24,
  rows: [
    '..a....',
    '.bcd...',
    'abeca..',
    'afdb...',
    'baahijk',
    'lahmnhb',
    'pbbbaa.',
    '.b.....',
  ],
  colors: {
    a: '#01030e',
    b: '#020413',
    c: '#cb7d65',
    d: '#cc7a60',
    e: '#cc8166',
    f: '#7e4740',
    h: '#c67660',
    i: '#43262e',
    j: '#d4896b',
    k: '#231415',
    l: '#0c0915',
    m: '#623535',
    n: '#c0715d',
    p: '#2a1618',
  },
};

/** His near fist round the katana's grip: it rides the forearm about the elbow. */
export const EMBER_FIST_N: PaintedPiece = {
  pivot: [7, -15],
  angle: 103.19,
  rows: [
    'ab....',
    'acdde.',
    '.afhaa',
    '..aaia',
    '...aaa',
  ],
  colors: {
    a: '#01020e',
    b: '#160c14',
    c: '#874e46',
    d: '#1b1019',
    e: '#51382d',
    f: '#7c4741',
    h: '#cc7f67',
    i: '#d18469',
  },
};
