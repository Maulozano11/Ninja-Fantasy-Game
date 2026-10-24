// The owner's bronze pauldrons (acc_hoplite_pauldrons).
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-pauldrons-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-pauldrons-from-ref.py src/sprite/items/hoplitePauldronsArt.ts

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_PAULDRON_BRONZE = '#603c2e';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_PAULDRON_REST: Record<string, [number, number]> = {
  HOPLITE_PAULDRON_N: [109, 150],
  HOPLITE_PAULDRON_F: [133, 152],
};

/** His near pauldron and its strips: rides the near shoulder. */
export const HOPLITE_PAULDRON_N: PaintedPiece = {
  pivot: [7, 5],
  angle: 105.61,
  rows: [
    '.....aaaa.....',
    'a...abbbcdda..',
    'aaaaebffhcida.',
    '.aacfbifjckla.',
    '..akkkkkmnkkpa',
    '..aaackknpffia',
    '..aqqrskkkffka',
    '..atauvwxkkka.',
    '..affcavqqkka.',
    '.atyttcapjaaa.',
    'achyttttta.aa.',
    'aaaafbatta.a..',
    '....aa.aa.....',
    '.......aa.aa..',
    '.........azAa.',
    '..........aa..',
    '..........a...',
  ],
  colors: {
    a: '#010216',
    b: '#f1c06e',
    c: '#2e1a1c',
    d: '#ecb064',
    e: '#6a3e2c',
    f: '#362222',
    h: '#22151a',
    i: '#764830',
    j: '#85583a',
    k: '#845232',
    l: '#c68d51',
    m: '#a66e41',
    n: '#96603a',
    p: '#8e5a36',
    q: '#14111c',
    r: '#3d3c42',
    s: '#49484d',
    t: '#56342a',
    u: '#b47e4e',
    v: '#ce9456',
    w: '#7a706f',
    x: '#4e2e25',
    y: '#442824',
    z: '#312c32',
    A: '#bb8047',
  },
};

/** What each colour of HOPLITE_PAULDRON_N is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_PAULDRON_N_KIND: Record<string, 'dark' | 'grey' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#14111c': 'dark',
  '#22151a': 'dark',
  '#2e1a1c': 'warm',
  '#312c32': 'grey',
  '#362222': 'warm',
  '#3d3c42': 'grey',
  '#442824': 'warm',
  '#49484d': 'grey',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#6a3e2c': 'warm',
  '#764830': 'warm',
  '#7a706f': 'grey',
  '#845232': 'warm',
  '#85583a': 'warm',
  '#8e5a36': 'warm',
  '#96603a': 'warm',
  '#a66e41': 'warm',
  '#b47e4e': 'warm',
  '#bb8047': 'warm',
  '#c68d51': 'warm',
  '#ce9456': 'warm',
  '#ecb064': 'warm',
  '#f1c06e': 'warm',
};

/** His far pauldron and its strips: rides the far shoulder. */
export const HOPLITE_PAULDRON_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 84.29,
  rows: [
    '.....a..',
    '....aa..',
    '...abba.',
    '..abbca.',
    '.adebfca',
    'adddfffa',
    'ahhhiija',
    'ahkhlmma',
    'akhhlbna',
    'aa.aanna',
    'apaa.aqa',
    '.aba.aaa',
    '.aba....',
    '..a.....',
  ],
  colors: {
    a: '#010216',
    b: '#362222',
    c: '#603c2e',
    d: '#442824',
    e: '#22151a',
    f: '#2e1a1c',
    h: '#ac7c48',
    i: '#6c4434',
    j: '#28272d',
    k: '#3c241a',
    l: '#4e2e25',
    m: '#7c4d38',
    n: '#56342a',
    p: '#4a332e',
    q: '#dca05e',
  },
};

/** What each colour of HOPLITE_PAULDRON_F is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_PAULDRON_F_KIND: Record<string, 'dark' | 'hair' | 'line' | 'warm'> = {
  '#010216': 'line',
  '#22151a': 'dark',
  '#28272d': 'hair',
  '#2e1a1c': 'warm',
  '#362222': 'warm',
  '#3c241a': 'warm',
  '#442824': 'warm',
  '#4a332e': 'warm',
  '#4e2e25': 'warm',
  '#56342a': 'warm',
  '#603c2e': 'warm',
  '#6c4434': 'warm',
  '#7c4d38': 'warm',
  '#ac7c48': 'warm',
  '#dca05e': 'warm',
};
