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
  pivot: [6, 6],
  angle: 45,
  rows: [
    '.pp........................................',
    'pihp.......................................',
    'phfep......................................',
    '.pedlp.....................................',
    'pippmnp....................................',
    'pip.pmnp...................................',
    'pip..pllp..pp..............................',
    'php...pmnppiep.............................',
    '.php...pmnikfp.............................',
    '..php...phkfp..............................',
    '...php.phjdcp..............................',
    '....phphjdahcp.............................',
    '.....pfedppahcp............................',
    '......ppp..pahcp...........................',
    '............pabcp..........................',
    '.............pabcp.........................',
    '..............pahcp........................',
    '...............pabcp.......................',
    '................pabcp......................',
    '.................pahcp.....................',
    '..................pabcp....................',
    '...................pabcp...................',
    '....................pahcp..................',
    '.....................pabcp.................',
    '......................pabcp................',
    '.......................pahcp...............',
    '........................pabcp..............',
    '.........................pabcp.............',
    '..........................pahcp............',
    '...........................pabcp...........',
    '............................pabcp..........',
    '.............................pahcp.........',
    '..............................pabcp........',
    '...............................pabcp.......',
    '................................pahcp......',
    '.................................pabcp.....',
    '..................................pabcp....',
    '...................................pahcp...',
    '....................................pabcp..',
    '.....................................pabcp.',
    '......................................pahp.',
    '.......................................ppbp',
    '.........................................pp',
    '...........................................',
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
    [18, 12, 's'],
    [16, 22, 'r'],
    [26, 18, 'q'],
    [22, 30, 's'],
    [33, 27, 'r'],
    [30, 36, 'q'],
    [40, 34, 's'],
    [39, 43, 'r'],
    [23, 33, 's'],
    [22, 33, 'q'],
    [24, 33, 'q'],
    [23, 32, 'q'],
    [23, 34, 'q'],
  ],
};

/**
 * The same sword drawn level, for the angles nearer level or upright than diagonal: turned from
 * 45 degrees there its thin blade would break its line.
 */
export const SAYA_SABER_LEVEL: SayaSword = {
  pivot: [8, 5],
  angle: 0,
  rows: [
    '............................................................',
    '.............pp.............................................',
    '............piep............................................',
    '.pp.pppppppppikfppppppppppppppppppppppppppppppppppppppppp...',
    'pihplnnlnnlnnikfcccccccccccccccccccccccccccccccccccccccccpp.',
    'phfelmmlmmlmmhjdhhhhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbhbbbp',
    'pedpppppppppphjdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaapp.',
    '.pip........phjdppppppppppppppppppppppppppppppppppppppppp...',
    '.pipppppppppphep............................................',
    '..pihhhhhffffpp.............................................',
    '...pppppppppp...............................................',
    '............................................................',
    '............................................................',
    '............................................................',
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
    [22, 1, 's'],
    [27, 9, 'r'],
    [31, 0, 'q'],
    [37, 10, 's'],
    [43, 1, 'r'],
    [47, 9, 'q'],
    [53, 1, 's'],
    [59, 8, 'r'],
    [40, 12, 's'],
    [39, 12, 'q'],
    [41, 12, 'q'],
    [40, 11, 'q'],
    [40, 13, 'q'],
  ],
};
