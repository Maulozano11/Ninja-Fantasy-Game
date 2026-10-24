// The owner's bare thighs, bronze greaves and shoes (feet_hoplite_greaves).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-greaves-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-greaves-from-ref.py src/sprite/items/hopliteGreavesArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_GREAVES_BRONZE = '#85583a';
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
    '.acbbbba..',
    'adeebbba..',
    '.afhhhia..',
    '.abhchhia.',
    '.afafhffba',
    'aca.aahfa.',
    'aa....aha.',
    'a......a..',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#c17e68',
    d: '#9f5249',
    e: '#bb6d56',
    f: '#ca7f63',
    h: '#c4785e',
    i: '#ae6954',
  },
};

/** What each colour of HOPLITE_THIGH_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_THIGH_N_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#8a4e46': 'skin',
  '#9f5249': 'skin',
  '#ae6954': 'skin',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
};

/** His near greave: rides the near knee. */
export const HOPLITE_GREAVE_N: PaintedPiece = {
  pivot: [7, 4],
  angle: 102.75,
  rows: [
    '.......a...',
    '......bcdd.',
    '.....efhhci',
    '...iijkldmi',
    '..ijjjclnji',
    '..ijpbchqji',
    '.iprscjtjti',
    '.ipquqqqbi.',
    '.ipmuhcupi.',
    '.iqvwfxvpi.',
    '.iprrsyzi..',
    '.ipxAAymi..',
    '.ipexbei...',
    '.ipyxbqi...',
    '.ipxebi....',
    '.ippemi....',
    'iqmjpbi....',
    'ipmepi.....',
    'ibdBbi.....',
    '.....i.....',
  ],
  colors: {
    a: '#ecb064',
    b: '#85583a',
    c: '#96603a',
    d: '#e4af5e',
    e: '#8e5e40',
    f: '#d6a655',
    h: '#dcb265',
    i: '#010216',
    j: '#603c2e',
    k: '#bb8047',
    l: '#e0b66e',
    m: '#764830',
    n: '#b37344',
    p: '#6c4434',
    q: '#7c4d38',
    r: '#6a3e2c',
    s: '#ac7c48',
    t: '#56342a',
    u: '#d7a866',
    v: '#b47e4e',
    w: '#daac5c',
    x: '#9c6842',
    y: '#a66e41',
    z: '#8e5a36',
    A: '#bc884e',
    B: '#e2a465',
  },
};

/** What each colour of HOPLITE_GREAVE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_N_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#a66e41': 'warm',
  '#ac7c48': 'warm',
  '#b37344': 'warm',
  '#b47e4e': 'warm',
  '#bb8047': 'warm',
  '#bc884e': 'warm',
  '#d6a655': 'warm',
  '#d7a866': 'warm',
  '#daac5c': 'warm',
  '#dcb265': 'warm',
  '#e0b66e': 'warm',
  '#e2a465': 'warm',
  '#e4af5e': 'warm',
  '#ecb064': 'warm',
};

/** His near shoe: rides the near ankle. */
export const HOPLITE_SHOE_N: PaintedPiece = {
  pivot: [4, -1],
  angle: 102.75,
  rows: [
    '..aaaa..',
    '.abbcda.',
    'aabecda.',
    'afaaaaha',
    'aiijjkia',
    'aiijikia',
    'aiiiiiia',
    '.aaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#49484d',
    c: '#565255',
    d: '#7a706f',
    e: '#464046',
    f: '#362222',
    h: '#442824',
    i: '#2c2223',
    j: '#483b3a',
    k: '#4a332e',
  },
};

/** What each colour of HOPLITE_SHOE_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SHOE_N_KIND: Record<string, 'grey' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#362222': 'warm',
  '#442824': 'warm',
  '#464046': 'grey',
  '#483b3a': 'warm',
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
    '.abbbbba..',
    '.abbbcca..',
    '.abbbcbdaa',
    '..abbbbcca',
    '..adecfcaa',
    '..aheeia..',
    '..aeeda...',
    '..aeea....',
    '..aha.....',
    '..aa......',
  ],
  colors: {
    a: '#010216',
    b: '#8a4e46',
    c: '#c17e68',
    d: '#a66356',
    e: '#ca7f63',
    f: '#c4785e',
    h: '#bb6d56',
    i: '#954e46',
  },
};

/** What each colour of HOPLITE_THIGH_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_THIGH_F_KIND: Record<string, 'line' | 'skin'> = {
  '#010216': 'line',
  '#8a4e46': 'skin',
  '#954e46': 'skin',
  '#a66356': 'skin',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
};

/** His far greave: rides the far knee. */
export const HOPLITE_GREAVE_F: PaintedPiece = {
  pivot: [5, 4],
  angle: 94.76,
  rows: [
    '.......abb',
    '......cdeb',
    '.....fhihb',
    '....jklffb',
    'b..bdmjnpb',
    'bbbqdrdsb.',
    'bteuuhdqb.',
    'bvsewhdb..',
    'btsmexlb..',
    'bbrydxkb..',
    'bzbymckb..',
    '.bbrsalb..',
    '.bbmhalb..',
    '.btrrAlb..',
    '.btbrreb..',
    '.bBjeyeb..',
    '.bbeuylb..',
    '...bubbb..',
  ],
  colors: {
    a: '#dca05e',
    b: '#010216',
    c: '#ce9456',
    d: '#845232',
    e: '#85583a',
    f: '#b47e4e',
    h: '#bc884e',
    i: '#daac5c',
    j: '#8e5e40',
    k: '#8e5a36',
    l: '#96603a',
    m: '#7c4d38',
    n: '#ac7c48',
    p: '#d6a655',
    q: '#603c2e',
    r: '#764830',
    s: '#9c6842',
    t: '#2c2223',
    u: '#6a3e2c',
    v: '#2e1a1c',
    w: '#9d6738',
    x: '#dcb265',
    y: '#6c4434',
    z: '#483b3a',
    A: '#a66e41',
    B: '#362222',
  },
};

/** What each colour of HOPLITE_GREAVE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_GREAVE_F_KIND: Record<string, 'line' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#483b3a': 'warm',
  '#603c2e': 'warm',
  '#6a3e2c': 'warm',
  '#6c4434': 'warm',
  '#764830': 'warm',
  '#7c4d38': 'warm',
  '#845232': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#8e5e40': 'warm',
  '#96603a': 'warm',
  '#9c6842': 'warm',
  '#9d6738': 'warm',
  '#a66e41': 'warm',
  '#ac7c48': 'warm',
  '#b47e4e': 'warm',
  '#bc884e': 'warm',
  '#ce9456': 'warm',
  '#d6a655': 'warm',
  '#daac5c': 'warm',
  '#dca05e': 'warm',
  '#dcb265': 'warm',
};

/** His far shoe: rides the far ankle. */
export const HOPLITE_SHOE_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 94.76,
  rows: [
    'aa............',
    'abaaaaaa......',
    'abcdaefha.....',
    'abbbaiajkaa...',
    'abbblbbammbaa.',
    'abaaabbnbbbbba',
    'aaaaaaabbbbbba',
    '......aaaaaaa.',
  ],
  colors: {
    a: '#010216',
    b: '#2c2223',
    c: '#483b3a',
    d: '#4a332e',
    e: '#464046',
    f: '#49484d',
    h: '#38323e',
    i: '#603c2e',
    j: '#7a706f',
    k: '#3d3c42',
    l: '#362222',
    m: '#828184',
    n: '#56342a',
  },
};

/** What each colour of HOPLITE_SHOE_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_SHOE_F_KIND: Record<string, 'grey' | 'line' | 'purple' | 'warm'> = {
  '#010216': 'line',
  '#2c2223': 'warm',
  '#362222': 'warm',
  '#38323e': 'purple',
  '#3d3c42': 'grey',
  '#464046': 'grey',
  '#483b3a': 'warm',
  '#49484d': 'grey',
  '#4a332e': 'warm',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#7a706f': 'grey',
  '#828184': 'grey',
};
