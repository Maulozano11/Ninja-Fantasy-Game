// The owner's black trousers on his Cazador 1, his pixels (tools/refs/cazador1-trousers-from-ref.py
// from docs/reference/cazador1-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const TROUSERS_CLOTH = '#2a2933';

/** What each colour of his is, as the script sorts them; his black line is never tinted. */
export const TROUSERS_KIND: Record<string, 'line' | 'cloth'> = {
  '#000000': 'line',
  '#010101': 'line',
  '#020202': 'line',
  '#030303': 'line',
  '#09080e': 'cloth',
  '#0e0d14': 'cloth',
  '#12101b': 'cloth',
  '#15131e': 'cloth',
  '#15141d': 'cloth',
  '#161420': 'cloth',
  '#171520': 'cloth',
  '#171521': 'cloth',
  '#181622': 'cloth',
  '#191722': 'cloth',
  '#1c1a25': 'cloth',
  '#1e1c27': 'cloth',
  '#1f1f29': 'cloth',
  '#24232b': 'cloth',
  '#26262e': 'cloth',
  '#27272f': 'cloth',
  '#282830': 'cloth',
  '#282832': 'cloth',
  '#292832': 'cloth',
  '#2a2a34': 'cloth',
  '#2b2b35': 'cloth',
  '#2c2b33': 'cloth',
  '#2c2c34': 'cloth',
  '#343842': 'cloth',
  '#424450': 'cloth',
  '#424451': 'cloth',
  '#444652': 'cloth',
  '#454753': 'cloth',
  '#454853': 'cloth',
  '#464854': 'cloth',
  '#484a56': 'cloth',
  '#494955': 'cloth',
  '#494a56': 'cloth',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const TROUSERS_REST: Record<string, [number, number]> = {
  TROUSERS_WAIST: [115, 175],
  TROUSERS_THIGH_N: [115, 178],
  TROUSERS_SHIN_N: [111, 190],
  TROUSERS_THIGH_F: [129, 178],
  TROUSERS_SHIN_F: [129, 185],
};

/** The waist band under the vest: it rides the torso about the pelvis. */
export const TROUSERS_WAIST: PaintedPiece = {
  pivot: [12, 1],
  angle: -89.65,
  rows: [
    'aaaaaabbbbbbbbbbbbbbbaca.',
    'abbbbbbcbbbbbbbbbbbbbacaa',
    'aaaaaaaaaaaaaaaaaaaaaacaa',
  ],
  colors: {
    a: '#000000',
    b: '#161420',
    c: '#1e1c27',
  },
};

/** The near trouser leg, hip to knee: it rides the thigh about the hip. */
export const TROUSERS_THIGH_N: PaintedPiece = {
  pivot: [6, -2],
  angle: 87.91,
  rows: [
    '.abbbbbbbccccd',
    '.aebbbbbbccccd',
    '.afdhiibbbccjd',
    '.akdjjlhbbccca',
    '.ahhddddbbbcca',
    '.ahhhbbbbbbcca',
    '.aihhbhbbbbma.',
    'adhhhbhbbbcma.',
    'ajhhhbhbbbcma.',
    'aabhhbhbbbda..',
    '.aahfhhbbbda..',
    '.aaahhhbbbda..',
    '.aaaahbhfdda..',
    '.aaaaahfffa...',
    'aaaaaaafdda...',
    'adaaaaaadda...',
  ],
  colors: {
    a: '#020202',
    b: '#2b2b35',
    c: '#1f1f29',
    d: '#181622',
    e: '#0e0d14',
    f: '#282830',
    h: '#454853',
    i: '#424451',
    j: '#15131e',
    k: '#494955',
    l: '#24232b',
    m: '#1c1a25',
  },
};

/** The near trouser leg, knee to ankle: it rides the shin about the knee. */
export const TROUSERS_SHIN_N: PaintedPiece = {
  pivot: [11, 2],
  angle: 104.09,
  rows: [
    '.....aaaabcbcdda',
    '.....aaaaabecca.',
    '....aaaaaaaedda.',
    '....adaaaaaadda.',
    '....aaafbbcccda.',
    '....aaaabcbcdda.',
    '....aaaaabecca..',
    '...aaaaaaaedda..',
    '...adaaaaaadda..',
    '..aaafbbcccda...',
    '..aaaabcbcdda...',
    '..aaaaabecca....',
    '.aaaaaaaedda....',
    '.adaaaaaadda....',
    '.aaafbbcccda....',
    '.aaaabcbcdda....',
    '.aaaaabecca.....',
    'aaaaaaaedda.....',
    'aaaaaaaaaaa.....',
  ],
  colors: {
    a: '#020202',
    b: '#484a56',
    c: '#2a2a34',
    d: '#191722',
    e: '#27272f',
    f: '#444652',
  },
};

/** The far trouser leg, hip to knee: it rides the thigh about the hip. */
export const TROUSERS_THIGH_F: PaintedPiece = {
  pivot: [2, -5],
  angle: 65.49,
  rows: [
    'aabcccbaacd..',
    'acbccaaaaed..',
    'bfbbchhhaad..',
    'dccabhiiaad..',
    'dccaaaihhhcd.',
    'ddjaiahhhicd.',
    '.dcciahiiibd.',
    '.dcbhiiiihad.',
    '..dbciiiiiead',
    '..dcccihiiiad',
    '...daaahiiikd',
  ],
  colors: {
    a: '#282832',
    b: '#12101b',
    c: '#171521',
    d: '#010101',
    e: '#2c2b33',
    f: '#09080e',
    h: '#424450',
    i: '#464854',
    j: '#15141d',
    k: '#343842',
  },
};

/** The far trouser leg, knee to ankle: it rides the shin about the knee. */
export const TROUSERS_SHIN_F: PaintedPiece = {
  pivot: [9, 2],
  angle: 98.56,
  rows: [
    '.abbccccccda.',
    '..abbcccccdda',
    '..abbbcccccda',
    '...adddccccea',
    '...addddfccba',
    '...abcchbbbba',
    '...abbbbdbbba',
    '..aaffdddbbba',
    '..ahhcdddffba',
    '..abbiccddbba',
    '..aabbbbdbba.',
    '...aaaaaaaaa.',
    '.aaffdddbbba.',
    '.ahhcdddffba.',
    '.abbiccddbba.',
    '.aabbbbdbba..',
    '..aaaaaaaaa..',
    'aaffdddbbba..',
    'ahhcdddffba..',
    'abbiccddbba..',
    'aaaaaaaaaaa..',
  ],
  colors: {
    a: '#030303',
    b: '#171520',
    c: '#454753',
    d: '#292832',
    e: '#343842',
    f: '#2c2c34',
    h: '#494a56',
    i: '#26262e',
  },
};
