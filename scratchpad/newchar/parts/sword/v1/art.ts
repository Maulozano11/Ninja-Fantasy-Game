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
  pivot: [-1, -3],
  angle: 56.31,
  rows: [
    '...AA.....................',
    '.AAtaA....................',
    'AbcudbA...................',
    'AbefebA...................',
    '.AhevtiA..................',
    '..AiweijA.................',
    '..AiftijA.................',
    '...AicviaA................',
    '....AckxblA...............',
    '....AceykmA...............',
    '.....AncpimA..............',
    '......AjcwimA.............',
    '......AjeuqmA.............',
    '.......AjevqmA............',
    '........AncuqmA...........',
    '........AncvqmA...........',
    '.........AnczqmA..........',
    '..........AnfvqiA.........',
    '..........AnevbmA.........',
    '...........AnevqmA........',
    '............AnevqcA.......',
    '............AjevqiA.......',
    '.............AnevkiA......',
    '..............AknvabA.....',
    '..............AnewdbA.....',
    '...............AinvddA....',
    '................AnnwmqA...',
    '................AeivdiA...',
    '.................AeifmiA..',
    '..................ArwfmcA.',
    '..................AnfpdiA.',
    '...................AcwwqsA',
    '....................AAewiA',
    '.....................AewvA',
    '......................AepA',
    '.......................AA.',
  ],
  colors: {
    a: '#504e52',
    b: '#1a191e',
    c: '#040405',
    d: '#767276',
    e: '#0f0407',
    f: '#26060d',
    h: '#211a24',
    i: '#111014',
    j: '#2e2d33',
    k: '#252328',
    l: '#646267',
    m: '#86868a',
    n: '#39383c',
    p: '#3a0f1e',
    q: '#17101a',
    r: '#aca7a6',
    s: '#9c9496',
    t: '#d83c44',
    u: '#a11a24',
    v: '#84141f',
    w: '#5d0e1a',
    x: '#c72b32',
    y: '#a9292f',
    z: '#7c1e2c',
    A: '#111014',
  },
  blade: 'abcdefhijklmnpqrs',
  edge: 'tuvwxyz',
  guard: '',
};
