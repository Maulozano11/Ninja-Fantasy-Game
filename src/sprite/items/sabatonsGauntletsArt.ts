// The owner's plate boots and brown gloves, his pixels (tools/refs/aiden-boots-gloves-from-ref.py from
// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/**
 * Where his legs stand from our rig's at rest, in fine pixels: each boot hangs from our ankle moved
 * by this, so at rest it is where he drew it (the near leg 4 left and 1 down, the far 1 left and 5
 * down). Zero once the rig stands as he drew it.
 */
export const SABATON_SHIFT = { N: [-4, 1], F: [-1, 5] } as const;

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const BOOT_STEEL = '#6e7894';
export const BOOT_TRIM = '#b6812f';
export const GLOVE_LEATHER = '#452d29';
export const GLOVE_STEEL = '#939fb1';
export const GLOVE_TRIM = '#ecbf60';

/** His leather for the hands he did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */
export const GLOVE_TONES = ['#010101', '#1c0c0c', '#3c2725', '#48342d', '#684f43'] as const;

/** What a colour of his is, as the script sorts them: his black line (and blackest browns), gold, brown leather or steel. */
export function crimsonKind(hex: string): 'line' | 'gold' | 'brown' | 'steel' {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 40) return 'line';
  if (r > b + 40 && r >= 110 && g > b + 20) return 'gold';
  if (r > b + 5 && lum < 110) return 'brown';
  return 'steel';
}

/** The near knee cop and greave: they turn with the shin about the ankle. */
export const SABATON_SHIN_N: PaintedPiece = {
  pivot: [3, 19],
  angle: 104.09,
  rows: [
    '.....aaaaa...',
    '...aabbbbbaa.',
    '...acdefedha.',
    '..aijklledmha',
    '..abfknlefmha',
    '..ahfpllffmha',
    '.aahmfeefmmha',
    '.aaqrdefmmsa.',
    '.amatssrrsca.',
    'aumvawwhhaa..',
    'axmymaaaara..',
    'azeffArrrra..',
    'ameflBrjjra..',
    'ajeeCrxmua...',
    'aDfeCrjmra...',
    'arfCEjjua....',
    'arfCrmmFa....',
    'aueCujra.....',
    'ameCumra.....',
    'aueCujra.....',
    'aueCujra.....',
  ],
  colors: {
    a: '#030203',
    b: '#a26925',
    c: '#ac7228',
    d: '#66718e',
    e: '#a0a7b9',
    f: '#a4abbd',
    h: '#a66e27',
    i: '#9e6626',
    j: '#727c99',
    k: '#c4cad5',
    l: '#d7dce3',
    m: '#6e7893',
    n: '#f5f7fa',
    p: '#b7bac0',
    q: '#f0be5e',
    r: '#404867',
    s: '#3d4360',
    t: '#f7c864',
    u: '#424b6b',
    v: '#6a7490',
    w: '#e9b758',
    x: '#6d7898',
    y: '#9fa9bd',
    z: '#697696',
    A: '#cad0d6',
    B: '#8690ab',
    C: '#d5d8df',
    D: '#616a86',
    E: '#939db4',
    F: '#464e6c',
  },
};

/** The near sabaton, seen from the front: the gold cuff, a gold strap over the instep, the steel toe and the brown sole. */
export const SABATON_FOOT_N: PaintedPiece = {
  pivot: [5, 1],
  angle: 104.09,
  rows: [
    '....abc...',
    '..ddefhdib',
    '.bjhklmnbb',
    '.dpqrlkpsb',
    '.bpeftuppd',
    '.bvwwxxvyd',
    '.bzqAqBdhb',
    'dprlCqkpbd',
    'dykkqqrDib',
    'dEFEEEEFd.',
    '.ddddddd..',
  ],
  colors: {
    a: '#090406',
    b: '#050104',
    c: '#0a060b',
    d: '#010100',
    e: '#bd8733',
    f: '#f4c96d',
    h: '#b5802e',
    i: '#454e6d',
    j: '#985d1e',
    k: '#a2a9bc',
    l: '#dadfe5',
    m: '#9da7bb',
    n: '#a56c20',
    p: '#667091',
    q: '#a7afbf',
    r: '#a4abc0',
    s: '#a06720',
    t: '#f4c869',
    u: '#b9812f',
    v: '#b98733',
    w: '#271717',
    x: '#2c1c1c',
    y: '#626e8b',
    z: '#211414',
    A: '#dae0ea',
    B: '#737d9b',
    C: '#e0e2ea',
    D: '#626f8f',
    E: '#3d2925',
    F: '#3a2524',
  },
};

/** The far knee cop and greave, its brown back showing: they turn with the shin about the ankle. */
export const SABATON_SHIN_F: PaintedPiece = {
  pivot: [4, 21],
  angle: 98.56,
  rows: [
    '........aa..',
    '.......abca.',
    '......adeea.',
    '.....fdhiijk',
    '....alemnipa',
    '....qrsmtuva',
    '....kwxiiipa',
    '.....fyvpzAa',
    '...aaBkkCef.',
    '.aaeDBDEFka.',
    'aGHeDBDEa...',
    'aGHeDBDEa...',
    'aGHeDBDEa...',
    'aGHeDBDEa...',
    'aIIeDBDEa...',
    '.aJJDBDEa...',
    'aaHKIDDEa...',
    '..aKIDDEF...',
    '..aHIBDLa...',
    '..aHMDBa....',
    '.aGICNf.....',
    '.aGICNa.....',
    '.aGICNa.....',
  ],
  colors: {
    a: '#010101',
    b: '#fcd77f',
    c: '#bc8330',
    d: '#fbd479',
    e: '#646c8a',
    f: '#030205',
    h: '#5d6785',
    i: '#adb6c7',
    j: '#465371',
    k: '#0b060c',
    l: '#c89238',
    m: '#b6bcc8',
    n: '#dfe4eb',
    p: '#75829c',
    q: '#1b1212',
    r: '#9c6124',
    s: '#909aae',
    t: '#e4e6eb',
    u: '#abb3c3',
    v: '#737e99',
    w: '#a46724',
    x: '#838aa4',
    y: '#3d435f',
    z: '#79839e',
    A: '#40496a',
    B: '#717895',
    C: '#676f8e',
    D: '#6c7693',
    E: '#a4acbe',
    F: '#070206',
    G: '#4e5878',
    H: '#545d7b',
    I: '#3c2722',
    J: '#382320',
    K: '#54607f',
    L: '#a0a8bc',
    M: '#34231d',
    N: '#3e4765',
  },
};

/** The far sabaton pointing right: the gold cuff, the steel toe, the brown heel and sole. */
export const SABATON_FOOT_F: PaintedPiece = {
  pivot: [3, 2],
  angle: 98.56,
  rows: [
    '......aab......',
    '.....bcda......',
    'aaefhijklb.....',
    'amaanpqjrsa....',
    'atumavlwfhah...',
    'altxmayazABCbf.',
    'amtumxaDjBjk.qa',
    'ammmbmmEEFGGGFC',
    '.aaa.aammmmmmmm',
    '.......aaaaaaaa',
  ],
  colors: {
    a: '#010101',
    b: '#050203',
    c: '#f4c968',
    d: '#c58e35',
    e: '#6b7894',
    f: '#0b040b',
    h: '#070207',
    i: '#b88337',
    j: '#a4adbd',
    k: '#dbdfe9',
    l: '#586280',
    m: '#392522',
    n: '#be8631',
    p: '#5d6a8c',
    q: '#a1a8bd',
    r: '#e0d4c5',
    s: '#b7802c',
    t: '#5e6784',
    u: '#2e1b1b',
    v: '#b88735',
    w: '#f5cc6e',
    x: '#3d2825',
    y: '#c18d37',
    z: '#475272',
    A: '#76809f',
    B: '#a8afc2',
    C: '#6b7491',
    D: '#3e496b',
    E: '#616d8c',
    F: '#67728f',
    G: '#93a0b4',
  },
};

/** The near fist round a grip: the steel plate over the back of the hand with its gold edge, the brown fingers under it. */
export const GAUNTLET_N: PaintedPiece = {
  pivot: [3, 0],
  angle: 103.15,
  rows: [
    '.abbbc....',
    '.adefhaaa.',
    'aieffjklm.',
    'aneffpmkqa',
    'aarsjjmaaa',
    'atauvwa...',
    '.atkaa....',
    '..aakla...',
    '....aaa...',
  ],
  colors: {
    a: '#010001',
    b: '#252128',
    c: '#29222a',
    d: '#6e7995',
    e: '#99a0b4',
    f: '#d4dbe5',
    h: '#757f9a',
    i: '#66708d',
    j: '#959db1',
    k: '#3f2b26',
    l: '#5e4941',
    m: '#3d2725',
    n: '#ce983c',
    p: '#919bb1',
    q: '#684f43',
    r: '#f0c465',
    s: '#b9bfcc',
    t: '#4f3934',
    u: '#e9b654',
    v: '#fcde87',
    w: '#ecbf60',
  },
};

/** The far fist hanging closed: brown leather, the steel knuckle edge with a gold rivet. */
export const GAUNTLET_F: PaintedPiece = {
  pivot: [2, -2],
  angle: 60.37,
  rows: [
    '..aabca.',
    'aadddea.',
    'affhijkl',
    'aamfafnp',
    'aqrastuv',
    'awassra.',
    '.awxya..',
    '.aaaa...',
  ],
  colors: {
    a: '#020101',
    b: '#654f44',
    c: '#676e8d',
    d: '#4a362e',
    e: '#8e97ae',
    f: '#392522',
    h: '#57433c',
    i: '#1f1110',
    j: '#8993ac',
    k: '#59637f',
    l: '#060409',
    m: '#5c453e',
    n: '#e5b657',
    p: '#0b040c',
    q: '#1c0c0c',
    r: '#604740',
    s: '#3c2726',
    t: '#402a25',
    u: '#4f3b33',
    v: '#0d080e',
    w: '#452d29',
    x: '#3a221e',
    y: '#624b40',
  },
};
