// The owner's bare arms, bronze bracers and fists (hands_hoplite_bracers).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-arms-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-arms-from-ref.py src/sprite/items/hopliteArmsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_ARMS_BRONZE = '#8e5e40';
export const HOPLITE_ARMS_SKIN = '#bb6d56';

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
    '......adba...',
    '...aaadbbca..',
    '...adedcbcca.',
    '.aadfddebccba',
    '.ahccijekkla.',
    '.amefmmnela..',
    '.amidmmppkka.',
    '.amdmmddqaa..',
    '.admmmdpa....',
    'airmdqea.....',
    'aiimdea......',
    'aiimdma......',
    '.aamdma......',
    '...aaama.....',
    '......a......',
  ],
  colors: {
    a: '#010216',
    b: '#784a46',
    c: '#88463e',
    d: '#ecb08c',
    e: '#9f5249',
    f: '#c4785e',
    h: '#90574c',
    i: '#d58063',
    j: '#954e46',
    k: '#a66356',
    l: '#ad5d51',
    m: '#eaaa84',
    n: '#e49672',
    p: '#bb6d56',
    q: '#a65a4a',
    r: '#d98868',
  },
};

/** What each colour of HOPLITE_ARM_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#784a46': 'skin',
  '#88463e': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#a66356': 'skin',
  '#ad5d51': 'skin',
  '#bb6d56': 'skin',
  '#c4785e': 'skin',
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
    'abbbaa...',
    'acdddeaa.',
    'afdhdijka',
    'alhddija.',
    '.aiiiida.',
    '.aeeeima.',
    '.aeheika.',
    '.aheenka.',
    '..appfqa.',
    '..adddda.',
    '..adeera.',
    '...aaaaa.',
    '...a.....',
  ],
  colors: {
    a: '#010216',
    b: '#7c4d38',
    c: '#312c32',
    d: '#c68d51',
    e: '#a66e41',
    f: '#1a1a20',
    h: '#28272d',
    i: '#202028',
    j: '#e2a465',
    k: '#403636',
    l: '#14111c',
    m: '#8e5a36',
    n: '#96603a',
    p: '#565255',
    q: '#442824',
    r: '#764830',
  },
};

/** What each colour of HOPLITE_BRACER_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_N_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#14111c': 'dark',
  '#1a1a20': 'dark',
  '#202028': 'hair',
  '#28272d': 'hair',
  '#312c32': 'grey',
  '#403636': 'warm',
  '#442824': 'warm',
  '#565255': 'grey',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#a66e41': 'warm',
  '#c68d51': 'warm',
  '#e2a465': 'warm',
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
    'afbhjka',
    'almnhka',
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
    j: '#9e5b52',
    k: '#8a4e46',
    l: '#d98868',
    m: '#ad5d51',
    n: '#9f5249',
  },
};

/** What each colour of HOPLITE_FIST_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_N_KIND: Record<string, 'grey' | 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#312c32': 'grey',
  '#3a3030': 'warm',
  '#403636': 'warm',
  '#483b3a': 'warm',
  '#8a4e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#ad5d51': 'skin',
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
    '.adbdca.',
    '.adbbcca',
    '.adebcca',
    '..afbcca',
    '..aebbha',
    '.aiebica',
    '.aiebbfa',
    'ajjjfbka',
    '.ajbibba',
    '..albba.',
    '..abbba.',
    '.amdbba.',
    '.amddmha',
    '.adddnpa',
    '.adddaa.',
    '.adaa...',
    '..a.....',
  ],
  colors: {
    a: '#010216',
    b: '#d58063',
    c: '#7c4d38',
    d: '#9f5249',
    e: '#6c4434',
    f: '#88463e',
    h: '#eaaa84',
    i: '#a65a4a',
    j: '#603c2e',
    k: '#442824',
    l: '#d98868',
    m: '#4e2e25',
    n: '#6c3632',
    p: '#ecb08c',
  },
};

/** What each colour of HOPLITE_ARM_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_F_KIND: Record<string, 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#442824': 'warm',
  '#4e2e25': 'warm',
  '#603c2e': 'skin',
  '#6c3632': 'skin',
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
    '.bbdecfb..',
    '..bhacfb..',
    '.biajccb..',
    'bkflmncb..',
    'bpbmlmcfb.',
    '.bqbmrccb.',
    '.bsinsbbb.',
    '.btibb..b.',
    '..baab..bb',
    '...bbb.bdb',
    '........b.',
  ],
  colors: {
    a: '#56342a',
    b: '#010216',
    c: '#8e5e40',
    d: '#403636',
    e: '#202028',
    f: '#85583a',
    h: '#603c2e',
    i: '#442824',
    j: '#3a3030',
    k: '#ce9456',
    l: '#2c2223',
    m: '#312c32',
    n: '#28272d',
    p: '#4a332e',
    q: '#96603a',
    r: '#845232',
    s: '#6a3e2c',
    t: '#9c6842',
  },
};

/** What each colour of HOPLITE_BRACER_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_F_KIND: Record<string, 'grey' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#202028': 'hair',
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
  '#845232': 'warm',
  '#85583a': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#ce9456': 'warm',
};

/** His far fist in its wrap: rides the far wrist. */
export const HOPLITE_FIST_F: PaintedPiece = {
  pivot: [4, 0],
  angle: 70.35,
  rows: [
    '....aa..',
    '....bb..',
    'bbbbcabb',
    'bdbefhib',
    '.bjfklab',
    '.bjbbbb.',
    '.bb.....',
    '..b.....',
  ],
  colors: {
    a: '#eaaa84',
    b: '#010216',
    c: '#d98868',
    d: '#603c2e',
    e: '#bb6d56',
    f: '#8a4e46',
    h: '#a66356',
    i: '#90574c',
    j: '#7c4d38',
    k: '#954e46',
    l: '#e3a275',
  },
};

/** What each colour of HOPLITE_FIST_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_F_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#603c2e': 'skin',
  '#7c4d38': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#a66356': 'skin',
  '#bb6d56': 'skin',
  '#d98868': 'skin',
  '#e3a275': 'skin',
  '#eaaa84': 'skin',
};
