// The owner's bare thighs, bronze greaves and shoes (feet_hoplite_greaves).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-greaves-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-greaves-from-ref.py src/sprite/items/hopliteGreavesArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_GREAVES_BRONZE = '#764830';
export const HOPLITE_GREAVES_SHOE = '#2c2223';
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
    '..abbbbba.',
    '.abbbbba..',
    'acdbbbba..',
    '.aebbbfa..',
    '.abhbiifa.',
    '.aeaiiheba',
    'aja.aaiia.',
    'aa....aia.',
    'a......a..',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#9f5249',
    d: '#bb6d56',
    e: '#ca7f63',
    f: '#ae6954',
    h: '#88463e',
    i: '#c4785e',
    j: '#954e46',
  },
};

/** What each colour of HOPLITE_THIGH_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_THIGH_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#954e46': 'skin',
  '#9f5249': 'skin',
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
    '..fidbbbdif',
    '..fjdbbbdif',
    '.fkkbdddblf',
    '.fkkjmbbnf.',
    '.fihjphnnf.',
    '.fkqjphnbf.',
    '.fnrjjmnf..',
    '.fnjjjnnf..',
    '.fnjjjnf...',
    '.fnjjjnf...',
    '.fbjjnf....',
    '.fbbjnf....',
    'fkbbjnf....',
    'fkbbnf.....',
    'fkhndf.....',
    '.....f.....',
  ],
  colors: {
    a: '#ce9456',
    b: '#2e1a1c',
    c: '#2c2223',
    d: '#85583a',
    e: '#96603a',
    f: '#010216',
    h: '#764830',
    i: '#603c2e',
    j: '#9c6842',
    k: '#7c4d38',
    l: '#56342a',
    m: '#362222',
    n: '#6c4434',
    p: '#4e2e25',
    q: '#b47e4e',
    r: '#6a3e2c',
  },
};

/** What each colour of HOPLITE_GREAVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_N_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#85583a': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#b47e4e': 'warm',
  '#ce9456': 'warm',
};

/** His near shoe: rides the near ankle. */
export const HOPLITE_SHOE_N: PaintedPiece = {
  pivot: [4, -1],
  angle: 102.75,
  rows: [
    '..aaaa..',
    '.abcdea.',
    'afchdia.',
    'afccccja',
    'afkllmka',
    'akkkkkka',
    'akkkkkka',
    '.aaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#28272d',
    c: '#49484d',
    d: '#565255',
    e: '#38323e',
    f: '#362222',
    h: '#464046',
    i: '#202028',
    j: '#442824',
    k: '#2c2223',
    l: '#483b3a',
    m: '#4a332e',
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
  '#464046': 'grey',
  '#483b3a': 'warm',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#565255': 'grey',
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
    '.abbbbba..',
    '.abbbbba..',
    '.abbbbbbaa',
    '..abbbcdea',
    '..afhbdbaa',
    '..aiibda..',
    '..ahbba...',
    '..ahda....',
    '..aja.....',
    '..aa......',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#28272d',
    d: '#954e46',
    e: '#c17e68',
    f: '#a66356',
    h: '#ca7f63',
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
  '#954e46': 'skin',
  '#a66356': 'skin',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#ca7f63': 'skin',
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
    'bbbcdffdb.',
    'bjkdccldb.',
    'bdkddcmb..',
    'bjknpcqb..',
    'bjkrlcsb..',
    'btkkeccb..',
    '.bjkeccb..',
    '.bnkdccb..',
    '.bjkddcb..',
    '.bjkedpb..',
    '.bekddpb..',
    '.bbkdedb..',
    '...bubbb..',
  ],
  colors: {
    a: '#dca05e',
    b: '#010216',
    c: '#ce9456',
    d: '#2e1a1c',
    e: '#362222',
    f: '#bc884e',
    h: '#e4af5e',
    i: '#4e2e25',
    j: '#2c2223',
    k: '#764830',
    l: '#845232',
    m: '#6c4434',
    n: '#7c4d38',
    p: '#85583a',
    q: '#96603a',
    r: '#603c2e',
    s: '#8e5a36',
    t: '#483b3a',
    u: '#6a3e2c',
  },
};

/** What each colour of HOPLITE_GREAVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_F_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#483b3a': 'warm',
  '#4e2e25': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#845232': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#bc884e': 'warm',
  '#ce9456': 'warm',
  '#dca05e': 'warm',
  '#e4af5e': 'warm',
};

/** His far shoe: rides the far ankle. */
export const HOPLITE_SHOE_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 94.76,
  rows: [
    'aa............',
    'abaaaaaa......',
    'abcdbefha.....',
    'abbbijbkkaa...',
    'abbbibbehkbaa.',
    'abbiibbbbbbbba',
    'aaaaaabbbbbbba',
    '......aaaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#2c2223',
    c: '#483b3a',
    d: '#4a332e',
    e: '#28272d',
    f: '#49484d',
    h: '#38323e',
    i: '#362222',
    j: '#603c2e',
    k: '#828184',
  },
};

/** What each colour of HOPLITE_SHOE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SHOE_F_KIND: Record<string, 'grey' | 'hair' | 'line' | 'purple' | 'warm'> = {
  '#010216': 'line',
  '#28272d': 'hair',
  '#2c2223': 'warm',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#483b3a': 'warm',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#603c2e': 'warm',
  '#828184': 'grey',
};
