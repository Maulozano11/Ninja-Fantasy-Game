// Saya's sword, the owner's big picture of her at our scale (tools/refs/saya-sword-from-ref.py from
// docs/reference/saya-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

export interface SayaSword extends PaintedPiece {
  /** The characters of the steel blade and its sparkles. */
  blade: string;
  /** The characters of the hilt's gold: the pommel, the knuckle bow, the cup's rims and the blade's gold dots. */
  guard: string;
  /** The sparkles round the blade: [x, y, character] in the template's cells (not in rows). */
  sparks: [number, number, string][];
}

/** Her blade steel and hilt gold: the colours the two colour slots turn hers from. */
export const SAYA_SWORD_BLADE = '#cacdd5';
export const SAYA_SWORD_GUARD = '#e8ba58';

/**
 * The sword as she holds it, hanging across the legs at 45 degrees and pivoting on the grip under our
 * near hand joint, so held at rest every pixel lies as drawn.
 */
export const SAYA_SABER: SayaSword = {
  pivot: [10, 10],
  angle: 45,
  rows: [
    '.pp..............................................',
    'pihp.............................................',
    'phfep............................................',
    '.pedpp...........................................',
    'pippllp..........................................',
    'pip.pmnp.........................................',
    'pip..pmnp........................................',
    'php...pllp.......................................',
    '.php...pmnp......................................',
    '..php...pmnp.....................................',
    '...php...pllp....................................',
    '....php...pmnp...................................',
    '.....pfp...pmnp..pp..............................',
    '......pfp...pllppiep.............................',
    '.......pfp...pmnikfp.............................',
    '........pfp...phkfp..............................',
    '.........pfp.phjdcp..............................',
    '..........pfphjdahcp.............................',
    '...........pfedppahcp............................',
    '............ppp..pahcp...........................',
    '..................pabcp..........................',
    '...................pabcp.........................',
    '....................pahcp........................',
    '.....................pabcp.......................',
    '......................pabcp......................',
    '.......................pahcp.....................',
    '........................pabcp....................',
    '.........................pabcp...................',
    '..........................pahcp..................',
    '...........................pabcp.................',
    '............................pabcp................',
    '.............................pahcp...............',
    '..............................pabcp..............',
    '...............................pabcp.............',
    '................................pahcp............',
    '.................................pabcp...........',
    '..................................pabcp..........',
    '...................................pahcp.........',
    '....................................pabcp........',
    '.....................................pabcp.......',
    '......................................pahcp......',
    '.......................................pabcp.....',
    '........................................pabcp....',
    '.........................................pahcp...',
    '..........................................pabcp..',
    '...........................................pabcp.',
    '............................................pahp.',
    '.............................................ppbp',
    '...............................................pp',
    '.................................................',
  ],
  colors: {
    a: '#a0a4b2',
    b: '#cacdd5',
    c: '#f2f1f1',
    d: '#9d6e44',
    e: '#c48e42',
    f: '#d8a84c',
    h: '#e8ba58',
    i: '#f6d886',
    j: '#6c6e78',
    k: '#b7becc',
    l: '#302525',
    m: '#453631',
    n: '#604f46',
    p: '#02010d',
    q: '#f7c962',
    r: '#feeeb5',
    s: '#fef6d8',
  },
  blade: 'abcqrs',
  guard: 'defhi',
  sparks: [
    [24, 18, 's'],
    [22, 28, 'r'],
    [32, 24, 'q'],
    [28, 36, 's'],
    [39, 33, 'r'],
    [36, 42, 'q'],
    [46, 40, 's'],
    [45, 49, 'r'],
    [29, 39, 's'],
    [28, 39, 'q'],
    [30, 39, 'q'],
    [29, 38, 'q'],
    [29, 40, 'q'],
  ],
};

/**
 * The same sword drawn level, for the angles nearer level or upright than diagonal: turned from
 * 45 degrees there its thin blade would break its line.
 */
export const SAYA_SABER_LEVEL: SayaSword = {
  pivot: [12, 5],
  angle: 0,
  rows: [
    '..................................................................',
    '...................pp.............................................',
    '..................piep............................................',
    '.pp.pppppppppppppppikfppppppppppppppppppppppppppppppppppppppppp...',
    'pihplnnlnnlnnlnnlnnikfcccccccccccccccccccccccccccccccccccccccccpp.',
    'phfelmmlmmlmmlmmlmmhjdhhhhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbp',
    'pedpppppppppppppppphjdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaapp.',
    '.pip..............phjdppppppppppppppppppppppppppppppppppppppppp...',
    '.pipppppppppppppppphep............................................',
    '..pihhhhhffffffffffpp.............................................',
    '...pppppppppppppppp...............................................',
    '..................................................................',
    '..................................................................',
    '..................................................................',
  ],
  colors: {
    a: '#a0a4b2',
    b: '#cacdd5',
    c: '#f2f1f1',
    d: '#9d6e44',
    e: '#c48e42',
    f: '#d8a84c',
    h: '#e8ba58',
    i: '#f6d886',
    j: '#6c6e78',
    k: '#b7becc',
    l: '#302525',
    m: '#453631',
    n: '#604f46',
    p: '#02010d',
    q: '#f7c962',
    r: '#feeeb5',
    s: '#fef6d8',
  },
  blade: 'abcqrs',
  guard: 'defhi',
  sparks: [
    [28, 1, 's'],
    [33, 9, 'r'],
    [37, 0, 'q'],
    [43, 10, 's'],
    [49, 1, 'r'],
    [53, 9, 'q'],
    [59, 1, 's'],
    [65, 8, 'r'],
    [46, 12, 's'],
    [45, 12, 'q'],
    [47, 12, 'q'],
    [46, 11, 'q'],
    [46, 13, 'q'],
  ],
};
