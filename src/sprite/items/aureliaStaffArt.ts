// Aurelia's staff, the owner's pixels at our game's scale (tools/refs/aurelia-staff-from-ref.py from
// docs/reference/aurelia-escala-juego-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

export interface DawnStaff extends PaintedPiece {
  /** The characters of his golds: the cross-piece, the wings, the orb's rim. */
  gold: string;
  /** The characters of the pearl orb's pale colours and its sparkles. */
  orb: string;
  /** The sparkles round the orb: [x, y, character] in the template's cells (not in rows). */
  sparks: [number, number, string][];
}

/** His commonest gold and orb colour: the colours the two colour slots turn his from. */
export const AURELIA_STAFF_GOLD = '#fac856';
export const AURELIA_STAFF_ORB = '#fedfa0';

/**
 * The staff as he drew it hanging from her far fist down to the right: drawn at his angle (the grip
 * to the orb's middle) and pivoting on the grip in the fist, so held there at rest every pixel is his.
 * The shaft inside the fist is his grey pixel and line run on up to a capped end.
 */
export const DAWN_STAFF: DawnStaff = {
  pivot: [2, 2],
  angle: 35.84,
  rows: [
    'oo..........................',
    'ozo.........................',
    '.ozo........................',
    '..ozo.......................',
    '...ozoo.....................',
    '....oyxo.....oo....oooo.....',
    '....oozvoo...oBo.ooAGEBoo...',
    '......o0wBoooFBooEBFBBBFFoo.',
    '.......ooFBFFFo.oBFBBFFBBBBo',
    '.........oFBBoo.oFFFFBBooooo',
    '..........oFFBFooFooooo.....',
    '.........oFDoF0tyoFBBBo.....',
    '........oFCo.o0u1EBzzzBo....',
    '.........oo..oFoEBzfbbzBo...',
    '............oFFoBzdaaadzo...',
    '...........oFBFoEzdaaadz....',
    '...........oBFBoEzhbaadz....',
    '...........oDFBFoEzdddz.....',
    '............oBFBooEzzz......',
    '............oBFBo.ooo.......',
    '.............oFBo...........',
    '..............oFBo..........',
    '...............oBo..........',
    '................oBo.........',
    '.................oo.........',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
    '............................',
  ],
  colors: {
    o: '#040517',
    '0': '#534d4f',
    '1': '#37343a',
    A: '#fbd469',
    B: '#fac856',
    C: '#eab245',
    D: '#dea63d',
    E: '#c99134',
    F: '#a26d2d',
    G: '#6c4932',
    a: '#fefdfa',
    b: '#feecc6',
    c: '#fdebb9',
    d: '#fedfa0',
    e: '#ffde8f',
    f: '#fad58f',
    g: '#fcd97f',
    h: '#e9ca86',
    i: '#fbd269',
    t: '#f7f0df',
    u: '#a79a91',
    v: '#c19966',
    w: '#b99368',
    x: '#a88d7a',
    y: '#6d6260',
    z: '#61524f',
  },
  gold: 'ABCDEFG',
  orb: 'abcdefghi',
  sparks: [
    [27, 12, 'd'],
    [27, 13, 'd'],
    [27, 20, 'i'],
    [11, 22, 'c'],
    [11, 23, 'g'],
    [12, 23, 'e'],
    [20, 22, 'i'],
    [23, 25, 'i'],
    [16, 27, 'i'],
    [20, 30, 'i'],
  ],
};
