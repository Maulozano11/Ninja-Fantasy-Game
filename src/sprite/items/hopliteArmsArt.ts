// The owner's bare arms, bronze bracers and fists (hands_hoplite_bracers).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-arms-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-arms-from-ref.py src/sprite/items/hopliteArmsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_ARMS_BRONZE = '#8e5e40';
export const HOPLITE_ARMS_SKIN = '#ae6954';

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
    '.......acda..',
    '......aeca...',
    '......aeba...',
    '...aaaefhia..',
    '...ajbedfida.',
    '.aajkeebflida',
    '.ahddmlnpbla.',
    '.aqbkjrqspa..',
    '.atmjjjnnuua.',
    '.arjjjjrpaa..',
    '.arjjjjna....',
    'amrjjpba.....',
    'amrjjba......',
    'amrjjra......',
    '.aajjja......',
    '...aaaja.....',
    '......a......',
  ],
  colors: {
    a: '#010216',
    b: '#9f5249',
    c: '#9e5b52',
    d: '#88463e',
    e: '#ecb08c',
    f: '#784a46',
    h: '#90574c',
    i: '#8a4e46',
    j: '#eaaa84',
    k: '#c4785e',
    l: '#954e46',
    m: '#d58063',
    n: '#bb6d56',
    p: '#a65a4a',
    q: '#c17e68',
    r: '#d4906e',
    s: '#a66356',
    t: '#ca7f63',
    u: '#ad5d51',
  },
};

/** What each colour of HOPLITE_ARM_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#784a46': 'skin',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#a66356': 'skin',
  '#ad5d51': 'skin',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
  '#d4906e': 'skin',
  '#d58063': 'skin',
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
    '.aiiiima.',
    '.annnina.',
    '.anhnipa.',
    '.ahnnnma.',
    '..aqqfra.',
    '..adddda.',
    '..adnnsa.',
    '...aaaaa.',
    '...a.....',
  ],
  colors: {
    a: '#010216',
    b: '#7c4d38',
    c: '#3d3c42',
    d: '#c68d51',
    e: '#bc884e',
    f: '#1a1a20',
    h: '#28272d',
    i: '#202028',
    j: '#bb8047',
    k: '#403636',
    l: '#14111c',
    m: '#b37344',
    n: '#a66e41',
    p: '#4e2e25',
    q: '#565255',
    r: '#442824',
    s: '#6a3e2c',
  },
};

/** What each colour of HOPLITE_BRACER_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_N_KIND: Record<string, 'dark' | 'grey' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#14111c': 'dark',
  '#1a1a20': 'dark',
  '#202028': 'hair',
  '#28272d': 'hair',
  '#3d3c42': 'grey',
  '#403636': 'warm',
  '#442824': 'warm',
  '#4e2e25': 'warm',
  '#565255': 'grey',
  '#6a3e2c': 'warm',
  '#7c4d38': 'warm',
  '#a66e41': 'warm',
  '#b37344': 'warm',
  '#bb8047': 'warm',
  '#bc884e': 'warm',
  '#c68d51': 'warm',
};

/** His near fist in its wrap: rides the near wrist. */
export const HOPLITE_FIST_N: PaintedPiece = {
  pivot: [2, 1],
  angle: 75.96,
  rows: [
    '.aaaa..',
    'abccda.',
    'abccdda',
    'aebccfa',
    'adbdhia',
    'ajklmia',
    '.aaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#3a3030',
    c: '#403636',
    d: '#e3a275',
    e: '#312c32',
    f: '#e49672',
    h: '#9e5b52',
    i: '#8a4e46',
    j: '#d98868',
    k: '#ad5d51',
    l: '#9f5249',
    m: '#c4785e',
  },
};

/** What each colour of HOPLITE_FIST_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_N_KIND: Record<string, 'grey' | 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#312c32': 'grey',
  '#3a3030': 'warm',
  '#403636': 'warm',
  '#8a4e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#ad5d51': 'skin',
  '#c4785e': 'skin',
  '#d98868': 'skin',
  '#e3a275': 'skin',
  '#e49672': 'skin',
};

/** His far upper arm: rides the far shoulder. */
export const HOPLITE_ARM_F: PaintedPiece = {
  pivot: [4, 2],
  angle: 84.29,
  rows: [
    '..aaaa..',
    '..abbca.',
    '.adbdea.',
    '.adbbefa',
    '.adhbija',
    '..aibkda',
    '..adbkka',
    '.alcbcea',
    '.aefbbla',
    'ahhflbma',
    '.alccbba',
    '..akbba.',
    '..akbba.',
    '.andkba.',
    '.anddnba',
    '.acddpqa',
    '.aiddaa.',
    '.acaa...',
    '..a.....',
  ],
  colors: {
    a: '#010216',
    b: '#d58063',
    c: '#a65a4a',
    d: '#9f5249',
    e: '#7c4d38',
    f: '#954e46',
    h: '#6c4434',
    i: '#ad5d51',
    j: '#8a4e46',
    k: '#ae6954',
    l: '#88463e',
    m: '#442824',
    n: '#4e2e25',
    p: '#6c3632',
    q: '#d98868',
  },
};

/** What each colour of HOPLITE_ARM_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_ARM_F_KIND: Record<string, 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#442824': 'warm',
  '#4e2e25': 'warm',
  '#6c3632': 'skin',
  '#6c4434': 'skin',
  '#7c4d38': 'skin',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#954e46': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#ad5d51': 'skin',
  '#ae6954': 'skin',
  '#d58063': 'skin',
  '#d98868': 'skin',
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
    '..bhicfb..',
    '.bjkdccb..',
    'blckmncb..',
    'bpbmjmcfb.',
    '.bqbmnccb.',
    '.brqsqbbb.',
    '.btqbb..b.',
    '..bppb..bb',
    '...bbb.bab',
    '........b.',
  ],
  colors: {
    a: '#563234',
    b: '#010216',
    c: '#8e5e40',
    d: '#3a3030',
    e: '#202028',
    f: '#85583a',
    h: '#6c4434',
    i: '#403636',
    j: '#362222',
    k: '#442824',
    l: '#9c6842',
    m: '#312c32',
    n: '#28272d',
    p: '#56342a',
    q: '#483b3a',
    r: '#6a3e2c',
    s: '#4a332e',
    t: '#96603a',
  },
};

/** What each colour of HOPLITE_BRACER_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_BRACER_F_KIND: Record<string, 'grey' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#202028': 'hair',
  '#28272d': 'hair',
  '#312c32': 'grey',
  '#362222': 'warm',
  '#3a3030': 'warm',
  '#403636': 'warm',
  '#442824': 'warm',
  '#483b3a': 'warm',
  '#4a332e': 'warm',
  '#563234': 'warm',
  '#56342a': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#85583a': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
};

/** His far fist in its wrap: rides the far wrist. */
export const HOPLITE_FIST_F: PaintedPiece = {
  pivot: [4, 0],
  angle: 70.35,
  rows: [
    '....aa..',
    '....bb..',
    'bbbbcabb',
    'bdbeefhb',
    '.bdheffb',
    '.bibbbb.',
    '.bb.....',
    '..b.....',
  ],
  colors: {
    a: '#eaaa84',
    b: '#010216',
    c: '#d98868',
    d: '#7c4d38',
    e: '#a66356',
    f: '#c4785e',
    h: '#90574c',
    i: '#764830',
  },
};

/** What each colour of HOPLITE_FIST_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_FIST_F_KIND: Record<string, 'line' | 'skin' | 'warm'> = {
  '#010216': 'line',
  '#764830': 'warm',
  '#7c4d38': 'skin',
  '#90574c': 'skin',
  '#a66356': 'skin',
  '#c4785e': 'skin',
  '#d98868': 'skin',
  '#eaaa84': 'skin',
};
