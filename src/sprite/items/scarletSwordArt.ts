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
  pivot: [8, 11],
  angle: 56.31,
  rows: [
    '..rr.................................',
    '.rklr................................',
    'rkeflr...............................',
    'rmhemr...............................',
    '.rmnrr...............................',
    '..rrpqr..............................',
    '...rpqr..............................',
    '....rpqr.............................',
    '....rpqr........rr...................',
    '.....rpqr......rllr..................',
    '......rpqr...rrlmmr..................',
    '......rpqr..rllmrr...................',
    '.......rpqrrlmmr.....................',
    '........rpqlmrr......................',
    '........rllfrr.......................',
    '.......rlmmiabr......................',
    '......rlmmceiabr.....................',
    '.....rlmrrcjeadr.....................',
    '......rr..rcjeabr....................',
    '...........rcjeabr...................',
    '...........rcjeabr...................',
    '............rcjeabr..................',
    '.............rcjeabr.................',
    '.............rcjeabr.................',
    '..............rcjeabr................',
    '...............rcjeadr...............',
    '...............rcjeabr...............',
    '................rcjeabr..............',
    '.................rcjeabr.............',
    '.................rcjeabr.............',
    '..................rcjeabr............',
    '...................rcjeabr...........',
    '...................rcjeabr...........',
    '....................rcjeabr..........',
    '.....................rcjeadr.........',
    '.....................rcjeabr.........',
    '......................rcjeabr........',
    '.......................rcjeabr.......',
    '.......................rcjeabr.......',
    '........................rcjeabr......',
    '.........................rcjjabr.....',
    '.........................rcjjabr.....',
    '...........................rcjabr....',
    '............................rcjebr...',
    '.............................rcjbr...',
    '..............................rjhbr..',
    '................................rhbr.',
    '.................................rbr.',
    '...................................rr',
  ],
  colors: {
    a: '#504e52',
    b: '#86868a',
    c: '#39383c',
    d: '#9c9496',
    e: '#a11a24',
    f: '#ffa7a7',
    h: '#5d0e1a',
    i: '#d83c44',
    j: '#84141f',
    k: '#504e52',
    l: '#86868a',
    m: '#767276',
    n: '#39383c',
    p: '#2e2d33',
    q: '#39383c',
    r: '#040405',
  },
  blade: 'abcd',
  edge: 'efhij',
  guard: 'klmn',
};
