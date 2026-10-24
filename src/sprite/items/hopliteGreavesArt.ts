// The owner's bare thighs, bronze greaves and shoes (feet_hoplite_greaves).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-greaves-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-greaves-from-ref.py src/sprite/items/hopliteGreavesArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_GREAVES_BRONZE = '#764830';
export const HOPLITE_GREAVES_SHOE = '#362222';
export const HOPLITE_GREAVES_SKIN = '#8a4e46';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_GREAVES_REST: Record<string, [number, number]> = {
  HOPLITE_THIGH_N: [116, 180],
  HOPLITE_GREAVE_N: [112, 193],
  HOPLITE_SHOE_N: [111, 212],
  HOPLITE_THIGH_F: [129, 179],
  HOPLITE_GREAVE_F: [130, 193],
  HOPLITE_SHOE_F: [131, 210],
};

/** His near thigh: rides the near hip. */
export const HOPLITE_THIGH_N: PaintedPiece = {
  pivot: [5, 3],
  angle: 101.31,
  rows: [
    '....aaaa..',
    '...abbbba.',
    '...abbbba.',
    '..abbbbba.',
    '..abbbbba.',
    '..abbbbba.',
    '..abbbbba.',
    '..acbbbba.',
    '.abdcbba..',
    'aefbheia..',
    '.ajbbkka..',
    '.ablbbfka.',
    '.ajamflkda',
    'aca.aamma.',
    'aa....ama.',
    'a......a..',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#954e46',
    d: '#9e5b52',
    e: '#9f5249',
    f: '#bb6d56',
    h: '#a65a4a',
    i: '#90574c',
    j: '#ca7f63',
    k: '#ae6954',
    l: '#88463e',
    m: '#c4785e',
  },
};

/** What each colour of HOPLITE_THIGH_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_THIGH_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#ae6954': 'skin',
  '#bb6d56': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
};

/** His near greave: rides the near knee. */
export const HOPLITE_GREAVE_N: PaintedPiece = {
  pivot: [7, 4],
  angle: 102.75,
  rows: [
    '.......a...',
    '......bcba.',
    '.....dddbef',
    '...ffbbbdhf',
    '..fidbbbdjf',
    '..fkdbbbdif',
    '.fllbdddbmf',
    '.fllknbbjf.',
    '.fjhkphjjf.',
    '.fjqkphjbf.',
    '.fjkkknjf..',
    '.fjkkkjjf..',
    '.frkkkjf...',
    '.frkkkjf...',
    '.fbkkjf....',
    '.fbbkjf....',
    'flbbkjf....',
    'flbbjf.....',
    'flhjsf.....',
    '.....f.....',
  ],
  colors: {
    a: '#ce9456',
    b: '#2e1a1c',
    c: '#2c2223',
    d: '#85583a',
    e: '#ac7c48',
    f: '#010216',
    h: '#764830',
    i: '#603c2e',
    j: '#6c4434',
    k: '#9c6842',
    l: '#7c4d38',
    m: '#563234',
    n: '#362222',
    p: '#4e2e25',
    q: '#a66e41',
    r: '#6a3e2c',
    s: '#9d6738',
  },
};

/** What each colour of HOPLITE_GREAVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_N_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#4e2e25': 'warm',
  '#563234': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#85583a': 'warm',
  '#9c6842': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#ac7c48': 'warm',
  '#ce9456': 'warm',
};

/** His near shoe: rides the near ankle. */
export const HOPLITE_SHOE_N: PaintedPiece = {
  pivot: [4, -1],
  angle: 102.75,
  rows: [
    '..aaaa..',
    '.abcdea.',
    'afdddha.',
    'afcdiija',
    'afjkkjfa',
    'affjjjfa',
    'alllllla',
    '.aaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#28272d',
    c: '#49484d',
    d: '#565255',
    e: '#38323e',
    f: '#362222',
    h: '#202028',
    i: '#7a706f',
    j: '#442824',
    k: '#4a332e',
    l: '#2c2223',
  },
};

/** What each colour of HOPLITE_SHOE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SHOE_N_KIND: Record<string, 'grey' | 'hair' | 'line' | 'purple' | 'warm'> = {
  '#010216': 'line',
  '#202028': 'hair',
  '#28272d': 'hair',
  '#2c2223': 'warm',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#442824': 'warm',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#565255': 'grey',
  '#7a706f': 'grey',
};

/** His far thigh: rides the far hip. */
export const HOPLITE_THIGH_F: PaintedPiece = {
  pivot: [3, 3],
  angle: 79.46,
  rows: [
    '.aaaaa....',
    'abbbbba...',
    'abbbbba...',
    'abbbbba...',
    'abbbbba...',
    'abbbbbba..',
    '.abbbbba..',
    '.abbbbba..',
    '.abbbbba..',
    '.abbcdda..',
    '.abbdeba..',
    '.abbdbbbaa',
    '..addefcda',
    '..aehbcbaa',
    '..aiibca..',
    '..ajbba...',
    '..ajca....',
    '..aja.....',
    '..aa......',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#954e46',
    d: '#90574c',
    e: '#a66356',
    f: '#28272d',
    h: '#ae6954',
    i: '#88463e',
    j: '#bb6d56',
  },
};

/** What each colour of HOPLITE_THIGH_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_THIGH_F_KIND: Record<string, 'hair' | 'line' | 'skin'> = {
  '#010216': 'line',
  '#28272d': 'hair',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#a66356': 'skin',
  '#ae6954': 'skin',
  '#bb6d56': 'skin',
};

/** His far greave: rides the far knee. */
export const HOPLITE_GREAVE_F: PaintedPiece = {
  pivot: [5, 4],
  angle: 94.76,
  rows: [
    '.......abb',
    '......cdeb',
    '.....ffdeb',
    '....fddfhb',
    'b..bfddfib',
    'bbbjdffdb.',
    'bekdjjkdb.',
    'blkddjmb..',
    'biknpjpb..',
    'bikqrjsb..',
    'btkkejjb..',
    '.bukejjb..',
    '.bmkdjjb..',
    '.bvkddjb..',
    '.bvkedwb..',
    '.bvkddwb..',
    '.bbkdedb..',
    '...bnbbb..',
  ],
  colors: {
    a: '#ac7c48',
    b: '#010216',
    c: '#b47d3f',
    d: '#2e1a1c',
    e: '#362222',
    f: '#bc884e',
    h: '#b47e4e',
    i: '#4e2e25',
    j: '#ce9456',
    k: '#764830',
    l: '#3c241a',
    m: '#7c4d38',
    n: '#6c4434',
    p: '#9d6738',
    q: '#85583a',
    r: '#a66e41',
    s: '#96603a',
    t: '#56342a',
    u: '#2c2223',
    v: '#3a3030',
    w: '#845232',
  },
};

/** What each colour of HOPLITE_GREAVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_F_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#3a3030': 'warm',
  '#3c241a': 'warm',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#845232': 'warm',
  '#85583a': 'warm',
  '#96603a': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#ac7c48': 'warm',
  '#b47d3f': 'warm',
  '#b47e4e': 'warm',
  '#bc884e': 'warm',
  '#ce9456': 'warm',
};

/** His far shoe: rides the far ankle. */
export const HOPLITE_SHOE_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 94.76,
  rows: [
    'aa............',
    'abaaaaaa......',
    'abcccdefa.....',
    'acccchbiiaa...',
    'abbcccccficaa.',
    'abbbbbccccccca',
    'aaaaaabbbbbbba',
    '......aaaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#2c2223',
    c: '#362222',
    d: '#28272d',
    e: '#49484d',
    f: '#38323e',
    h: '#603c2e',
    i: '#828184',
  },
};

/** What each colour of HOPLITE_SHOE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SHOE_F_KIND: Record<string, 'grey' | 'hair' | 'line' | 'purple' | 'warm'> = {
  '#010216': 'line',
  '#28272d': 'hair',
  '#2c2223': 'warm',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#49484d': 'grey',
  '#603c2e': 'warm',
  '#828184': 'grey',
};
