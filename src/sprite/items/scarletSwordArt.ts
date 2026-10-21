// The owner's sword from his Scarlet picture, at our scale and held as our swords are
// (tools/refs/scarlet-sword-from-ref.py from docs/reference/scarlet-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

export interface PaintedScarletSword extends PaintedPiece {
  /** The characters of the blade's dark steel. */
  blade: string;
  /** The characters of the red: the blade's core and point, the jewels in the pommel and the guard. */
  edge: string;
  /** The characters of the hilt's steel: the cross-guard and the pommel's cap. */
  guard: string;
}

/** His colours the three colour slots turn his from: the blade's dark steel, its red core, the guard's steel. */
export const SCARLET_SWORD_BLADE = '#39383c';
export const SCARLET_SWORD_EDGE = '#84141f';
export const SCARLET_SWORD_GUARD = '#767276';

/**
 * His sword mirrored, so it hangs as our swords do (pommel up-left of the fist, blade down-right,
 * his lit edge on top), brought down to our scale and drawn at the angle our idle pose holds it
 * at, pivoting on the grip under the middle of our fist.
 */
export const SCARLET_SWORD: PaintedScarletSword = {
  pivot: [7, 10],
  angle: 56.31,
  rows: [
    '.II.................................',
    'IyzI................................',
    'IijiI...............................',
    'IiklI...............................',
    '.ImiI...............................',
    '..InpI..............................',
    '...IGHI.............................',
    '...IGHI.......I.....................',
    '....IGHI.....IAI....................',
    '.....IGHI...IBI.....................',
    '.....IGHI...IAI.....................',
    '......IGHI.ICI......................',
    '.......IGHIIDI......................',
    '.......IBCIBIIII....................',
    '.......JBqlzCACEI...................',
    '.......IAijrabJI....................',
    '......IzAcdqaeJ.....................',
    '.....IzCIJcdjaeJ....................',
    '....IzAI..JcstabJ...................',
    '....IFI...JcsiaeJ...................',
    '.....I.....JcduaeJ..................',
    '............JcduabJ.................',
    '............JcslabJ.................',
    '.............JcsiabJ................',
    '..............JfsrahJ...............',
    '..............JfdrabJ...............',
    '...............JcdmabJ..............',
    '................JcdrabJ.............',
    '................JcdmabJ.............',
    '.................JcdmabJ............',
    '..................JcdmabJ...........',
    '..................JcdmabJ...........',
    '...................JcsmabJ..........',
    '....................JcdmahJ.........',
    '....................JcdmaeJ.........',
    '.....................JcdmabJ........',
    '......................JcdmaeJ.......',
    '......................JcsiaeJ.......',
    '.......................JcdmaeJ......',
    '........................JcdiabJ.....',
    '........................JcdmaeJ.....',
    '..........................JdiabJ....',
    '...........................JdivbJ...',
    '............................JiweJ...',
    '.............................Jimxh..',
    '...............................imxJ.',
    '................................imK.',
    '..................................nK',
    '...................................K',
  ],
  colors: {
    a: '#504e52',
    b: '#86868a',
    c: '#39383c',
    d: '#0f0407',
    e: '#767276',
    f: '#2e2d33',
    h: '#9c9496',
    i: '#5d0e1a',
    j: '#d83c44',
    k: '#ffa7a7',
    l: '#a9292f',
    m: '#84141f',
    n: '#3a0f1e',
    p: '#601f35',
    q: '#f47278',
    r: '#a11a24',
    s: '#26060d',
    t: '#e85056',
    u: '#c72b32',
    v: '#70273e',
    w: '#ac5068',
    x: '#9e3b41',
    y: '#39383c',
    z: '#504e52',
    A: '#767276',
    B: '#646267',
    C: '#86868a',
    D: '#9c9496',
    E: '#cfc9c8',
    F: '#beb9b8',
    G: '#2e2d33',
    H: '#39383c',
    I: '#040405',
    J: '#111014',
    K: '#0f0407',
  },
  blade: 'abcdefh',
  edge: 'ijklmnpqrstuvwx',
  guard: 'yzABCDEF',
};
