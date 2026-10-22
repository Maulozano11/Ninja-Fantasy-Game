// The owner's black trousers on his Ren, his pixels (tools/refs/ren-trousers-from-ref.py from
// docs/reference/ren-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NIGHT_TROUSERS = '#1a1c2b';

/** What each of his colours is, as the script sorts them (tools/refs/ren_ref.py kind). */
export const NIGHT_TROUSERS_KIND: Record<string, 'dark' | 'line'> = {
  '#010312': 'line',
  '#010417': 'line',
  '#02020e': 'line',
  '#020417': 'line',
  '#03020e': 'line',
  '#0a0b18': 'dark',
  '#0d0f1d': 'dark',
  '#0f1122': 'dark',
  '#131522': 'dark',
  '#17182a': 'dark',
  '#181928': 'dark',
  '#181a29': 'dark',
  '#181a2e': 'dark',
  '#191a2e': 'dark',
  '#1d1f30': 'dark',
  '#202335': 'dark',
  '#26262d': 'dark',
  '#282830': 'dark',
  '#2a2a31': 'dark',
  '#2c3141': 'dark',
  '#2e3245': 'dark',
  '#303547': 'dark',
  '#3e3d48': 'dark',
  '#52505a': 'dark',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NIGHT_TROUSERS_REST: Record<string, [number, number]> = {
  NIGHT_THIGH_F: [127, 169],
  NIGHT_SHIN_F: [130, 186],
  NIGHT_THIGH_N: [116, 174],
  NIGHT_SHIN_N: [115, 192],
};

/** The far thigh, hip to knee (under the skirt): it turns with the thigh about the hip. */
export const NIGHT_THIGH_F: PaintedPiece = {
  pivot: [4, 4],
  angle: 65.49,
  rows: [
    '..aaaaa........',
    '.abbcbda.......',
    'acbbcbdba......',
    'acbbcbdba......',
    'acbbcbdbba.....',
    'acbbcbdbba.....',
    '.abbcbdbbba....',
    '.abbcbdbbba....',
    '..abcbdbbba....',
    '..abcbdbbbba...',
    '..abcbdbbbba...',
    '...acbdbbbbba..',
    '...acbdbbbbba..',
    '....abdbbbbbba.',
    '....abdbbbbbba.',
    '.....adbbbbbbba',
    '.....adbbbbbbba',
    '......abbbbbbb.',
    '......abbbbb...',
    '.......abb.....',
    '......ab.......',
  ],
  colors: {
    a: '#010312',
    b: '#181928',
    c: '#191a2e',
    d: '#2a2a31',
  },
};

/** The far shin, knee into the boot: it turns with the shin about the knee. */
export const NIGHT_SHIN_F: PaintedPiece = {
  pivot: [8, 1],
  angle: 98.56,
  rows: [
    '...........ab',
    '.........aaab',
    '.......aaaaa.',
    '.....aaaaaa..',
    '...baaaaaaa..',
    '...baaaaaaa..',
    '...baaaaaaa..',
    'bbbbaaaaaaab.',
    'cdaeaaaaaaab.',
    '.bebcbaaaaab.',
    '.efhhieiiib..',
    '.bbhhiaiiib..',
    '..bhhiaiiib..',
    '..bbbbbbb.b..',
  ],
  colors: {
    a: '#181a29',
    b: '#010312',
    c: '#020417',
    d: '#191a2e',
    e: '#03020e',
    f: '#26262d',
    h: '#2a2a31',
    i: '#3e3d48',
  },
};

/** The near thigh, hip to knee (under the skirt): it turns with the thigh about the hip. */
export const NIGHT_THIGH_N: PaintedPiece = {
  pivot: [5, 2],
  angle: 87.91,
  rows: [
    '....aaaaaaa.',
    '....abcdefa.',
    '....abcdefa.',
    '...ahbcdefa.',
    '..aihbcdefa.',
    '.ajihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    'acjihbcdefa.',
    '.ajihbcdeffa',
    '.ajihbcdeffa',
    '.ajihbcdeffa',
    '.ajihbcdeffa',
    '.ajihbcdef..',
  ],
  colors: {
    a: '#010312',
    b: '#2c3141',
    c: '#2e3245',
    d: '#181a2e',
    e: '#131522',
    f: '#17182a',
    h: '#1d1f30',
    i: '#0a0b18',
    j: '#202335',
  },
};

/** The near shin, knee into the boot: it turns with the shin about the knee. */
export const NIGHT_SHIN_N: PaintedPiece = {
  pivot: [7, 0],
  angle: 104.09,
  rows: [
    '...........ab',
    '.bcdefhcijaab',
    '..cdefhcijab.',
    '..cdefhcijab.',
    '.bcdefhcijab.',
    '.bcdefhcijab.',
    'bicdefhcijab.',
    'biihhklllaab.',
    '.mbbcchhdibb.',
    '.bnpqbbbbbm..',
    'iinpcchhdb...',
    'iinpcchhdb...',
    'bbbbbbbbb....',
  ],
  colors: {
    a: '#17182a',
    b: '#010312',
    c: '#303547',
    d: '#202335',
    e: '#0a0b18',
    f: '#1d1f30',
    h: '#2c3141',
    i: '#181a2e',
    j: '#131522',
    k: '#0d0f1d',
    l: '#0f1122',
    m: '#02020e',
    n: '#282830',
    p: '#52505a',
    q: '#010417',
  },
};
/**
 * How far his legs stand from our rig's at rest (fine pixels): worn with his boots, his trousers and
 * boots hang from our hip, knee and ankle moved this far, so at rest they are where he drew them.
 */
export const NIGHT_LEG_SHIFT: Record<'N' | 'F', [number, number]> = { N: [-5, 0], F: [-1, 5] };
