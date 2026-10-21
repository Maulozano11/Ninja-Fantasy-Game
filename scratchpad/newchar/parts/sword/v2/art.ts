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
    '.OO...............................',
    'OEFO..............................',
    'OtutO.............................',
    'OtvwO.............................',
    '.OxtO.............................',
    '..OyzO............................',
    '...OMNO...........................',
    '...OMNO.......O...................',
    '....OMNO.....OGO..................',
    '.....OMNO...OHO...................',
    '.....OMNO...OGO...................',
    '......OMNO.OIO....................',
    '.......OMNOOJO....................',
    '.......OHIOHOOOO..................',
    '.......OHAvFIGIKO.................',
    '.......OGtuBabOO..................',
    '......OFGbcdcbP...................',
    '.....OFIOPecxufP..................',
    '....OFGO..PftcfhP.................',
    '....OLO...PfdufhP.................',
    '.....O.....PfixfjP................',
    '............PikCblP...............',
    '............PicvkmP...............',
    '.............PnipfmP..............',
    '..............PhitfmP.............',
    '..............PhcBqmP.............',
    '...............PhcxqmP............',
    '................PniBqmP...........',
    '................PnixqmP...........',
    '.................PniDqmP..........',
    '..................PndxqfP.........',
    '..................PncxbmP.........',
    '...................PncxqmP........',
    '....................PncxqiP.......',
    '....................PhcxqfP.......',
    '.....................PncxkfP......',
    '......................PknxjbP.....',
    '......................PnctabP.....',
    '.......................PfnxaaP....',
    '........................PnntmqP...',
    '........................PcfxafP...',
    '.........................PcfdmfP..',
    '..........................PrtdmiP.',
    '..........................PndpafP.',
    '...........................PittqsP',
    '............................PPctfP',
    '.............................PctxP',
    '..............................PcpP',
    '...............................PP.',
  ],
  colors: {
    a: '#767276',
    b: '#1a191e',
    c: '#0f0407',
    d: '#26060d',
    e: '#211a24',
    f: '#111014',
    h: '#2e2d33',
    i: '#040405',
    j: '#504e52',
    k: '#252328',
    l: '#646267',
    m: '#86868a',
    n: '#39383c',
    p: '#3a0f1e',
    q: '#17101a',
    r: '#aca7a6',
    s: '#9c9496',
    t: '#5d0e1a',
    u: '#d83c44',
    v: '#a9292f',
    w: '#ffa7a7',
    x: '#84141f',
    y: '#3a0f1e',
    z: '#601f35',
    A: '#f47278',
    B: '#a11a24',
    C: '#c72b32',
    D: '#7c1e2c',
    E: '#39383c',
    F: '#504e52',
    G: '#767276',
    H: '#646267',
    I: '#86868a',
    J: '#9c9496',
    K: '#cfc9c8',
    L: '#beb9b8',
    M: '#2e2d33',
    N: '#39383c',
    O: '#040405',
    P: '#111014',
  },
  blade: 'abcdefhijklmnpqrs',
  edge: 'tuvwxyzABCD',
  guard: 'EFGHIJKL',
};
