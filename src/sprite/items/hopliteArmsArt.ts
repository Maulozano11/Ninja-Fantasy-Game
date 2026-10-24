// The owner's bare arms, bronze bracers and fists (hands_hoplite_bracers).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-arms-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-arms-from-ref.py src/sprite/items/hopliteArmsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_ARMS_BRONZE = '#9d6738';
export const HOPLITE_ARMS_SKIN = '#d58063';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_ARMS_REST: Record<string, [number, number]> = {
  HOPLITE_ARM_N: [109, 153],
  HOPLITE_BRACER_N: [108, 167],
  HOPLITE_FIST_N: [111, 178],
  HOPLITE_ARM_F: [133, 153],
  HOPLITE_BRACER_F: [135, 167],
  HOPLITE_FIST_F: [137, 178],
};

/** His near upper arm: rides the near shoulder. */
export const HOPLITE_ARM_N: PaintedPiece = {
  pivot: [7, 2],
  angle: 105.61,
  rows: [
    '.......aa....',
    '.......aba...',
    '.......abca..',
    '......adba...',
    '......aeba...',
    '...aaafhbca..',
    '...adfeehcca.',
    '.aaddfdijccba',
    '.afdfffkllma.',
    '.afffffnkma..',
    '.afddffdilla.',
    '.afdffddfaa..',
    '.adfffdfa....',
    'appfdqha.....',
    'aqqfdda......',
    'aqqfdfa......',
    '.aafdfa......',
    '...aaafa.....',
    '......a......',
  ],
  colors: {
    a: '#010216',
    b: '#784a46',
    c: '#88463e',
    d: '#ecb08c',
    e: '#c4785e',
    f: '#eaaa84',
    h: '#ca7f63',
    i: '#bb6d56',
    j: '#90574c',
    k: '#9f5249',
    l: '#a66356',
    m: '#ad5d51',
    n: '#e49672',
    p: '#d98868',
    q: '#d58063',
  },
};

/** What each colour of HOPLITE_ARM_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#784a46': 'skin',
  '#88463e': 'skin',
  '#90574c': 'skin',
  '#9f5249': 'skin',
  '#a66356': 'skin',
  '#ad5d51': 'skin',
  '#bb6d56': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
  '#d58063': 'skin',
  '#d98868': 'skin',
  '#e49672': 'skin',
  '#eaaa84': 'skin',
  '#ecb08c': 'skin',
};

/** His near bracer: rides the near elbow. */
export const HOPLITE_BRACER_N: PaintedPiece = {
  pivot: [5, 0],
  angle: 85.67,
  rows: [
    '.aaa.....',
    'abcdaa...',
    'aefhhiaa.',
    'ajiklmana',
    'ajpqcmka.',
    '.aprstma.',
    '.aurvtaa.',
    '.ajmcmaa.',
    '.awifxaa.',
    '..ayfyza.',
    '..aAmyqa.',
    '..aiiiBa.',
    '...aaaaa.',
    '...a.....',
  ],
  colors: {
    a: '#010216',
    b: '#7c4d38',
    c: '#ce9456',
    d: '#ecb064',
    e: '#312c32',
    f: '#828184',
    h: '#86898d',
    i: '#a66e41',
    j: '#6c4434',
    k: '#e2a465',
    l: '#dc9e54',
    m: '#c68d51',
    n: '#403636',
    p: '#8e5a36',
    q: '#b37344',
    r: '#bb8047',
    s: '#bc884e',
    t: '#dca05e',
    u: '#9d6738',
    v: '#675e60',
    w: '#603c2e',
    x: '#96603a',
    y: '#565255',
    z: '#442824',
    A: '#ce924c',
    B: '#764830',
  },
};

/** What each colour of HOPLITE_BRACER_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_N_KIND: Record<string, 'grey' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#312c32': 'grey',
  '#403636': 'warm',
  '#442824': 'warm',
  '#565255': 'grey',
  '#603c2e': 'warm',
  '#675e60': 'grey',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#828184': 'grey',
  '#86898d': 'grey',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#b37344': 'warm',
  '#bb8047': 'warm',
  '#bc884e': 'warm',
  '#c68d51': 'warm',
  '#ce924c': 'warm',
  '#ce9456': 'warm',
  '#dc9e54': 'warm',
  '#dca05e': 'warm',
  '#e2a465': 'warm',
  '#ecb064': 'warm',
};

/** His near fist in its wrap: rides the near wrist. */
export const HOPLITE_FIST_N: PaintedPiece = {
  pivot: [2, 1],
  angle: 75.96,
  rows: [
    '.aaaa..',
    'abcdea.',
    'abbdfha',
    'aiiddha',
    'afbhhaa',
    'ajhhhka',
    '.aaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#3a3030',
    c: '#403636',
    d: '#483b3a',
    e: '#bb6d56',
    f: '#ecb08c',
    h: '#eaaa84',
    i: '#312c32',
    j: '#d98868',
    k: '#ae6954',
  },
};

/** What each colour of HOPLITE_FIST_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_N_KIND: Record<string, 'grey' | 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#312c32': 'grey',
  '#3a3030': 'warm',
  '#403636': 'warm',
  '#483b3a': 'warm',
  '#ae6954': 'skin',
  '#bb6d56': 'skin',
  '#d98868': 'skin',
  '#eaaa84': 'skin',
  '#ecb08c': 'skin',
};

/** His far upper arm: rides the far shoulder. */
export const HOPLITE_ARM_F: PaintedPiece = {
  pivot: [4, 2],
  angle: 84.29,
  rows: [
    '..aaaa..',
    '..abbca.',
    '.abddda.',
    '.addebca',
    '.abbbdca',
    '..afbcca',
    '..ahbbia',
    '.ajhbdka',
    '.ajhbbba',
    'allljefa',
    '.albbbia',
    '..adbba.',
    '..abbba.',
    '.aebbba.',
    '.aeebjia',
    '.aebbdka',
    '.aebbaa.',
    '.aeaa...',
    '..a.....',
  ],
  colors: {
    a: '#010216',
    b: '#d58063',
    c: '#7c4d38',
    d: '#d98868',
    e: '#9f5249',
    f: '#88463e',
    h: '#6c4434',
    i: '#eaaa84',
    j: '#a65a4a',
    k: '#ecb08c',
    l: '#603c2e',
  },
};

/** What each colour of HOPLITE_ARM_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_F_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#603c2e': 'skin',
  '#6c4434': 'skin',
  '#7c4d38': 'skin',
  '#88463e': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#d58063': 'skin',
  '#d98868': 'skin',
  '#eaaa84': 'skin',
  '#ecb08c': 'skin',
};

/** His far bracer: rides the far elbow. */
export const HOPLITE_BRACER_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 75.07,
  rows: [
    '.a........',
    '......b...',
    '.....bb...',
    '...bbcb...',
    '.bbdbefb..',
    '..bhaifb..',
    '.bjakblb..',
    'bmlnplqb..',
    'brbpnpqsb.',
    '.bebptbub.',
    '.bvjwvbbb.',
    '.bilbb..b.',
    '..bibb..bb',
    '...bbb.bdb',
    '........b.',
  ],
  colors: {
    a: '#56342a',
    b: '#010216',
    c: '#dca05e',
    d: '#403636',
    e: '#96603a',
    f: '#a66e41',
    h: '#603c2e',
    i: '#9c6842',
    j: '#442824',
    k: '#3a3030',
    l: '#85583a',
    m: '#ce9456',
    n: '#2c2223',
    p: '#312c32',
    q: '#8e5e40',
    r: '#4a332e',
    s: '#6c4434',
    t: '#845232',
    u: '#c68d51',
    v: '#6a3e2c',
    w: '#28272d',
  },
};

/** What each colour of HOPLITE_BRACER_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_F_KIND: Record<string, 'grey' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#28272d': 'hair',
  '#2c2223': 'warm',
  '#312c32': 'grey',
  '#3a3030': 'warm',
  '#403636': 'warm',
  '#442824': 'warm',
  '#4a332e': 'warm',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#845232': 'warm',
  '#85583a': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#a66e41': 'warm',
  '#c68d51': 'warm',
  '#ce9456': 'warm',
  '#dca05e': 'warm',
};

/** His far fist in its wrap: rides the far wrist. */
export const HOPLITE_FIST_F: PaintedPiece = {
  pivot: [4, 0],
  angle: 70.35,
  rows: [
    '....aa..',
    '....bb..',
    'bbbbabbb',
    'bcbdebab',
    '.bfbhiab',
    '.bfbbbb.',
    '.bb.....',
    '..b.....',
  ],
  colors: {
    a: '#eaaa84',
    b: '#010216',
    c: '#603c2e',
    d: '#bb6d56',
    e: '#c4785e',
    f: '#7c4d38',
    h: '#954e46',
    i: '#e3a275',
  },
};

/** What each colour of HOPLITE_FIST_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_F_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#603c2e': 'skin',
  '#7c4d38': 'skin',
  '#954e46': 'skin',
  '#bb6d56': 'skin',
  '#c4785e': 'skin',
  '#e3a275': 'skin',
  '#eaaa84': 'skin',
};
