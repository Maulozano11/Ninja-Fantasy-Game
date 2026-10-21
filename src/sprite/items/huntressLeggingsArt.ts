// The owner's dark leggings on his Cazador 2, his pixels (tools/refs/cazador2-leggings-from-ref.py
// from docs/reference/cazador2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const LEGGINGS_CLOTH = '#40404b';
export const LEGGINGS_SEAT = '#252330';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const LEGGINGS_KIND: Record<string, 'line' | 'cloth'> = {
  '#000000': 'line',
  '#050612': 'line',
  '#050710': 'line',
  '#050713': 'line',
  '#050716': 'line',
  '#050815': 'line',
  '#06060e': 'line',
  '#060919': 'line',
  '#070511': 'line',
  '#070613': 'line',
  '#080716': 'line',
  '#090815': 'line',
  '#090816': 'line',
  '#0a0817': 'line',
  '#13111f': 'cloth',
  '#1d1c29': 'cloth',
  '#22202d': 'cloth',
  '#24242f': 'cloth',
  '#252431': 'cloth',
  '#262330': 'cloth',
  '#262431': 'cloth',
  '#272532': 'cloth',
  '#292734': 'cloth',
  '#363642': 'cloth',
  '#383844': 'cloth',
  '#383a46': 'cloth',
  '#3c3e4a': 'cloth',
  '#3d3e4b': 'cloth',
  '#40404c': 'cloth',
  '#41414d': 'cloth',
  '#42414d': 'cloth',
  '#494b58': 'cloth',
  '#4f515d': 'cloth',
  '#535360': 'cloth',
  '#575c70': 'cloth',
  '#5b6274': 'cloth',
  '#858b98': 'cloth',
};

/** Where each piece lands in our female idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const LEGGINGS_REST: Record<string, [number, number]> = {
  LEGGINGS_WAIST: [118, 171],
  LEGGINGS_THIGH_N: [116, 175],
  LEGGINGS_SHIN_N: [112, 191],
  LEGGINGS_THIGH_F: [128, 175],
  LEGGINGS_SHIN_F: [131, 186],
};

/** Her legs' joints at rest (fine pixels of our female idle frame 0): her pieces hang from them (painted.ts hisLeg). */
export const LEGGINGS_LEGS = {
  N: { hip: [119.5, 177.0] as [number, number], knee: [120.0, 193.0] as [number, number], ankle: [114.5, 213.0] as [number, number] },
  F: { hip: [133.0, 175.0] as [number, number], knee: [135.0, 194.0] as [number, number], ankle: [135.5, 210.0] as [number, number] },
};

/** The waist band under the vest: it rides the torso about the pelvis. */
export const LEGGINGS_WAIST: PaintedPiece = {
  pivot: [9, 6],
  angle: -89.50,
  rows: [
    '.aaaaaabcddddddecbaa',
    '.affffhaaaaaaaaaaaff',
    'iaaaafffffffffffffaa',
    'ajbbbaaaaaaaaaaaaabb',
  ],
  colors: {
    a: '#050815',
    b: '#252431',
    c: '#5b6274',
    d: '#858b98',
    e: '#575c70',
    f: '#1d1c29',
    h: '#090816',
    i: '#050710',
    j: '#22202d',
  },
};

/** The near leg, hip to knee: it turns with our thigh about her hip. */
export const LEGGINGS_THIGH_N: PaintedPiece = {
  pivot: [3, 2],
  angle: 87.96,
  rows: [
    '.abbcdddbbbd',
    '.ebbdddddbcb',
    '.ebbffddddbb',
    'ebbhfffdddfc',
    'ebbfddiddfdb',
    'ebbfdjjdfddb',
    'ecbddijdffdb',
    'ecdddjidfddb',
    'ebdddidffddb',
    'eaffdjfffdce',
    'eaefddffffce',
    'eaekliffffbe',
    'eaeeffffdba.',
    'eaeeedfddbe.',
    'eaeeeedfbe..',
    'eeeeeeffba..',
    'abfffddba...',
    'ebbddfdce...',
    'ebbffdhbe...',
    'ebehfdba....',
  ],
  colors: {
    a: '#060919',
    b: '#272532',
    c: '#22202d',
    d: '#3d3e4b',
    e: '#070613',
    f: '#42414d',
    h: '#363642',
    i: '#535360',
    j: '#4f515d',
    k: '#383a46',
    l: '#494b58',
  },
};

/** The near leg, knee to ankle: it turns with our shin about her knee. */
export const LEGGINGS_SHIN_N: PaintedPiece = {
  pivot: [8, 2],
  angle: 104.16,
  rows: [
    '....abcccccba',
    '....dbbccccbd',
    '....abbcccebd',
    '....abaeccba.',
    '...abcaffhbd.',
    '...dbbccccb..',
    '...abbccceb..',
    '...abaeccb...',
    '..abcaffhb...',
    '..dbbccccb...',
    '..abbccceb...',
    '..abaeccb....',
    '.abcaffhb....',
    '.dbbcccc.....',
    '.abbccce.....',
    '.abaecc......',
    '.bcaffh......',
    '.bbccc.......',
    '.bbccc.......',
    'abaecc.......',
    'bcaffh.......',
    'bccccb.......',
    'iiiiii.......',
  ],
  colors: {
    a: '#080716',
    b: '#24242f',
    c: '#41414d',
    d: '#070511',
    e: '#383844',
    f: '#292734',
    h: '#13111f',
    i: '#000000',
  },
};

/** The far leg, hip to knee: it turns with our thigh about her hip. */
export const LEGGINGS_THIGH_F: PaintedPiece = {
  pivot: [5, 0],
  angle: 65.47,
  rows: [
    'aaaaaabbbbb..',
    'aaaaabbbacd..',
    'baaabebaaac..',
    'ebbdebbaaaa..',
    'deeebbaaaaa..',
    'beebbbaaaaa..',
    'eefbbbaaaaa..',
    'e.ebbaaaaaaa.',
    'h.ebbaaaaaaae',
    '..ebbaaaaaaaf',
    '..ebbaaaaaaaf',
    '...hbbaaaaaae',
    '...hbbaaaaabe',
    '...fbbaaaaabf',
    '....hbaaaaae.',
  ],
  colors: {
    a: '#40404c',
    b: '#262330',
    c: '#3c3e4a',
    d: '#22202d',
    e: '#050716',
    f: '#050612',
    h: '#0a0817',
  },
};

/** The far leg, knee to ankle: it turns with our shin about her knee. */
export const LEGGINGS_SHIN_F: PaintedPiece = {
  pivot: [4, 8],
  angle: 98.82,
  rows: [
    'abbccccccd',
    'abbcccccbd',
    'dbbcccccbd',
    '.abccccca.',
    '.abccccba.',
    '.abbcccba.',
    '.abbbccca.',
    '.abbbccce.',
    '.abbabcba.',
    '.abbabba..',
    '.abbbccc..',
    '.abbbccc..',
    '.abbabcb..',
    '.abbabba..',
    '.abbbccc..',
    '.abbbccc..',
    '.abbabc...',
    '.abbabb...',
    '.abbbcc...',
    '.abbbcc...',
    '..bbabc...',
    '..bbabb...',
    '..bbbcc...',
    '..bbbccc..',
    '..ffffff..',
  ],
  colors: {
    a: '#090815',
    b: '#262431',
    c: '#41414d',
    d: '#050713',
    e: '#06060e',
    f: '#000000',
  },
};
