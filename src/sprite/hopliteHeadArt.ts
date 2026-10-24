// The owner's bronze warrior's face and eyes (face and eye shape 'hoplite').
// Lifted from the owner's bronze warrior (docs/reference/bronze-warrior-owner-reference.jpg) and
// brought down to our scale by tools/refs/bronze-face-from-ref.py (tools/refs/bronze_ref.py).
// Generated: rerun the script to change it:
//   python3 -I tools/refs/bronze-face-from-ref.py src/sprite/hopliteHeadArt.ts

import type { PaintedEye } from './eyeArt';
import type { PaintedPiece } from './painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const HOPLITE_SKIN = '#bb6d56';

/** Where each piece lands in our male idle frame 0 (his joints), unturned: the fine pixel of its first row's first cell. */
export const HOPLITE_HEAD_REST: Record<string, [number, number]> = {
  HOPLITE_HEAD: [117, 127],
};

/** His head, skull to neck: stamped on the face anchor. */
export const HOPLITE_HEAD: PaintedPiece = {
  pivot: [6, 12],
  angle: -90.00,
  rows: [
    '........aaaaa..........',
    '......aabbbbbaa........',
    '.....abbbbbbbcca.......',
    '....abbbbbbbbccda..a...',
    '...aebbbbbbbbccddaaba..',
    '...aebbbbbbbbccdddbbba.',
    '..aeebbbbbbbbcfdddbbbha',
    '..aeeebcccccijhhdhhbhha',
    '..aeeecccccccchhhhhhha.',
    '.aeeeeekkkkclmmbjhlnna.',
    'aeeeeeekkppqlmmrrllnaa.',
    'aeemmaeepaaanmlllmmaa..',
    '.aapsaeapttuaaavmwaaa..',
    '..amsaeeexyzABmmmCDaa..',
    '..amEaeemmmeAFmmGrHHa..',
    '...awaaaammmmmmmIsmHaa.',
    '....aaJJammmmmmHFKmaaa.',
    '....aLJxaFmmmmmMrNOaaa.',
    '....aLxFFFlmmmmmPNa....',
    '....aLHFFJlmmQsssNa....',
    '...aLJlQQJFmlleENa.....',
    '...aRJlxRakmlmlmNa.....',
    '....EFlmLLQaHmmlRa.....',
    '.....JFmQLQQaaaRRa.....',
    '......FllJLLLRawwa.....',
    '......aElLFLLLarwa.....',
    '......aExmvJLLnLwa.....',
    '......aaaaaaaaaaaa.....',
  ],
  colors: {
    a: '#010216',
    b: '#6c4434',
    c: '#7c4d38',
    d: '#e0b66e',
    e: '#d4906e',
    f: '#d7a866',
    h: '#603c2e',
    i: '#1a1a20',
    j: '#22151a',
    k: '#ae6954',
    l: '#eaaa84',
    m: '#ecb08c',
    n: '#9e5b52',
    p: '#a65a4a',
    q: '#a66356',
    r: '#6c3632',
    s: '#743e37',
    t: '#90574c',
    u: '#784a46',
    v: '#9f5249',
    w: '#6f4141',
    x: '#ca7f63',
    y: '#cec3c0',
    z: '#ae100f',
    A: '#840302',
    B: '#b5aeab',
    C: '#bab8b6',
    D: '#6c010d',
    E: '#c4785e',
    F: '#d98868',
    G: '#f2d6ae',
    H: '#bb6d56',
    I: '#f6cea4',
    J: '#d58063',
    K: '#4e2e25',
    L: '#954e46',
    M: '#ad5d51',
    N: '#e49672',
    O: '#c17e68',
    P: '#e3a275',
    Q: '#88463e',
    R: '#8a4e46',
  },
};

/** What each colour of HOPLITE_HEAD is (tools/refs/bronze_ref.py material): his line and near-blacks are never tinted. */
export const HOPLITE_HEAD_KIND: Record<string, 'dark' | 'line' | 'red' | 'skin' | 'warm' | 'white'> = {
  '#010216': 'line',
  '#1a1a20': 'dark',
  '#22151a': 'dark',
  '#4e2e25': 'warm',
  '#603c2e': 'skin',
  '#6c010d': 'warm',
  '#6c3632': 'skin',
  '#6c4434': 'skin',
  '#6f4141': 'skin',
  '#743e37': 'skin',
  '#784a46': 'skin',
  '#7c4d38': 'skin',
  '#840302': 'red',
  '#88463e': 'skin',
  '#8a4e46': 'skin',
  '#90574c': 'skin',
  '#954e46': 'skin',
  '#9e5b52': 'skin',
  '#9f5249': 'skin',
  '#a65a4a': 'skin',
  '#a66356': 'skin',
  '#ad5d51': 'skin',
  '#ae100f': 'red',
  '#ae6954': 'skin',
  '#b5aeab': 'white',
  '#bab8b6': 'white',
  '#bb6d56': 'skin',
  '#c17e68': 'skin',
  '#c4785e': 'skin',
  '#ca7f63': 'skin',
  '#cec3c0': 'white',
  '#d4906e': 'skin',
  '#d58063': 'skin',
  '#d7a866': 'skin',
  '#d98868': 'skin',
  '#e0b66e': 'skin',
  '#e3a275': 'skin',
  '#e49672': 'skin',
  '#eaaa84': 'skin',
  '#ecb08c': 'skin',
  '#f2d6ae': 'skin',
  '#f6cea4': 'skin',
};

/** His eyes' colours, one character each (his pixels on his face). */
export const HOPLITE_EYE_COLORS: Record<string, string> = {
  a: '#010216',
  b: '#cec3c0',
  c: '#ae100f',
  d: '#840302',
  e: '#b5aeab',
  f: '#ecb08c',
  h: '#d4906e',
  i: '#d98868',
  j: '#bab8b6',
  k: '#6c3632',
};

/** His eyes in each lid state, stamped on the template's eye cells from the anchor's row (body.ts drawFace). */
export const HOPLITE_EYES: Record<'open' | 'lowered' | 'closed', { near: PaintedEye; far: PaintedEye }> = {
  open: {
    near: {
      letters: ['ssLL', 'widw', 'ssds'],
      rows: ['..aa', 'bcde', '..d.'],
    },
    far: {
      letters: ['s', 'w'],
      rows: ['.', 'j'],
    },
  },
  lowered: {
    near: {
      letters: ['ssLL', 'wiLL', 'ssds'],
      rows: ['..aa', 'bcaa', '..d.'],
    },
    far: {
      letters: ['s', 'w'],
      rows: ['.', 'j'],
    },
  },
  closed: {
    near: {
      letters: ['ssLL', 'ssss', 'ssss'],
      rows: ['..aa', 'fhfi', '..f.'],
    },
    far: {
      letters: ['s', 's'],
      rows: ['.', 'k'],
    },
  },
};

/** Where his eyes start, columns from the anchor (body.ts PaintedHead ex, fx). */
export const HOPLITE_EYE_AT = { ex: 4, fx: 11 };

/** The eye colour his red iris is: the player's eye colour moves his reds as far. */
export const HOPLITE_IRIS = '#ae100f';
