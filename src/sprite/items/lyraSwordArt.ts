// Lyra's sword, the owner's pixels from his picture of her at our game's scale
// (tools/refs/lyra-sword-from-ref.py from docs/reference/lyra-game-scale-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

export interface LyraSword extends PaintedPiece {
  /** The characters of the glowing blade, its sparkles and the gem in the cross. */
  blade: string;
  /** The characters of the guard's gold: the collar, the shell and the cross's tips. */
  guard: string;
  /** The sparkles round the blade: [x, y, character] in the template's cells (not in rows). */
  sparks: [number, number, string][];
}

/** His commonest blade cyan and guard gold: the colours the two colour slots turn his from. */
export const LYRA_SWORD_BLADE = '#80c1c8';
export const LYRA_SWORD_GUARD = '#aa6a26';

/**
 * The sword as he drew it in her near fist, hanging across the legs: drawn at his blade's angle and
 * pivoting on the grip under our fist, which is his hand. At rest every pixel is his, held as he
 * held it, where our fist stands.
 */
export const LYRA_RAPIER: LyraSword = {
  pivot: [5, 7],
  angle: 42.73,
  rows: [
    'aaa.............................................',
    'azja............................................',
    'ajbja...........................................',
    '..abja..........................................',
    '.a.abj.......axl................................',
    '.aa..bj....aaxja................................',
    '.aa..jbj.aakxja.................................',
    '.ana..jbjuixcca.................................',
    '..ana.afmixcixa.................................',
    '...anaaaixdqixa.................................',
    '....ajjaxchhujxa................................',
    '......axjcnncujxa...............................',
    '.....axjaaaancmesa..............................',
    '.....ala....aaeeesa.............................',
    '......a.......aeresa............................',
    '...............aeresa...........................',
    '................aeresa..........................',
    '.................aeresa.........................',
    '..................aevesa........................',
    '....................apesa.......................',
    '.....................asesa......................',
    '......................asesa.....................',
    '.......................asesa....................',
    '........................asesa...................',
    '.........................asesa..................',
    '..........................asesAa................',
    '...........................asetAa...............',
    '............................attsAa..............',
    '..............................astAa.............',
    '...............................attAa............',
    '................................assAa...........',
    '.................................attAa..........',
    '..................................assAa.........',
    '....................................asAa........',
    '.....................................atAa.......',
    '......................................asAa......',
    '.......................................atAa.....',
    '........................................asAa....',
    '..........................................aAa...',
  ],
  colors: {
    a: '#010101',
    b: '#282c39',
    c: '#4a5161',
    d: '#3a596c',
    e: '#30717a',
    f: '#864d4a',
    h: '#9c6026',
    i: '#aa6a26',
    j: '#656c7e',
    k: '#b87a2d',
    l: '#d18f39',
    m: '#d89d3c',
    n: '#9099a3',
    p: '#72bfca',
    q: '#3ed8f2',
    r: '#66c9da',
    s: '#80c1c8',
    t: '#8dc0c6',
    u: '#fcc65e',
    v: '#74d4d9',
    w: '#6ee6e4',
    x: '#b7c0cb',
    y: '#70ecf1',
    z: '#eedfbc',
    A: '#caebee',
  },
  blade: 'depqrstvwyA',
  guard: 'hiklmu',
  sparks: [
    [24, 25, 'w'],
    [26, 27, 'w'],
    [27, 20, 'w'],
    [30, 30, 'v'],
    [31, 24, 'w'],
    [34, 33, 'r'],
    [38, 30, 'w'],
    [38, 37, 'w'],
    [41, 33, 'y'],
    [45, 36, 'w'],
    [47, 37, 'y'],
  ],
};
