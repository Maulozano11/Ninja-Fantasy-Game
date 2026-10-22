// The owner's green cargo trousers, his pixels (tools/refs/trunks-cargo-from-ref.py from
// docs/reference/trunks2-owner-reference.jpg). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const CARGO_GREEN = '#333b2b';

/** Which colour slot recolours each of his colours ('line': his black line and what else stays as he drew it). */
export const CARGO_SLOT: Record<string, 'line' | 'main'> = {
  '#000000': 'line',
  '#010201': 'line',
  '#020101': 'line',
  '#020301': 'line',
  '#030304': 'line',
  '#040404': 'line',
  '#13150f': 'main',
  '#1b2117': 'main',
  '#1c2218': 'main',
  '#1c2419': 'main',
  '#1d231a': 'main',
  '#1d251a': 'main',
  '#1e281d': 'main',
  '#1f271a': 'main',
  '#20271b': 'main',
  '#20281a': 'main',
  '#20291b': 'main',
  '#2e1a14': 'main',
  '#321c17': 'main',
  '#333b2b': 'main',
  '#363f2d': 'main',
  '#36402c': 'main',
  '#37402d': 'main',
  '#39432e': 'main',
  '#3b442f': 'main',
  '#3b452f': 'main',
  '#3c4532': 'main',
  '#3c462e': 'main',
  '#3d4530': 'main',
  '#3e4830': 'main',
  '#3f4931': 'main',
  '#3f4932': 'main',
  '#404b32': 'main',
  '#414d34': 'main',
  '#475139': 'main',
  '#4a533c': 'main',
  '#4b553c': 'main',
  '#4f583f': 'main',
  '#5b6448': 'main',
  '#5c6647': 'main',
  '#5d3d29': 'main',
  '#5f6547': 'main',
  '#5f684b': 'main',
  '#606747': 'main',
  '#606748': 'main',
  '#60694a': 'main',
  '#626b4a': 'main',
  '#636b48': 'main',
  '#636b4c': 'main',
  '#646c4a': 'main',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const CARGO_REST: Record<string, [number, number]> = {
  CARGO_SEAT: [112, 175],
  CARGO_THIGH_F: [128, 178],
  CARGO_SHIN_F: [130, 188],
  CARGO_THIGH_N: [111, 178],
  CARGO_SHIN_N: [111, 192],
  CARGO_INTO_BOOT_F: [131, 200],
  CARGO_INTO_BOOT_N: [112, 197],
  CARGO_GAP: [122, 186],
};

/** The waist and the top of both legs: it rides the pelvis. */
export const CARGO_SEAT: PaintedPiece = {
  pivot: [15, 1],
  angle: -89.65,
  rows: [
    '....aaaaaaaaabbbaaccadda.....',
    '....aaaaaaaaabbbaaccadda.....',
    '....aaaaaaaaabbbaaccadda.....',
    '..eeeee...eeeeeeeeeeeeeee....',
    '.ebdaaaeeeaaabbbaaccaddaeeefe',
    'eabdaaaaaaacchihdahcahccaaaae',
  ],
  colors: {
    a: '#1c2218',
    b: '#1e281d',
    c: '#37402d',
    d: '#3e4830',
    e: '#000000',
    f: '#040404',
    h: '#636b4c',
    i: '#5f684b',
  },
};

/** The far thigh: it turns with the thigh about the hip. */
export const CARGO_THIGH_F: PaintedPiece = {
  pivot: [3, -5],
  angle: 65.49,
  rows: [
    'aaaaaaaaa......',
    'bcddbeebaaafa..',
    'echdbhddcbbba..',
    'ebbibbbjjkblhf.',
    'baabkeeehhbbbf.',
    'aabbbehhhhdcja.',
    'aacbebehhhhbja.',
    'aabbeebmhhhbja.',
    '..abbhkkhhhbna.',
    '..abbchehhheba.',
    '..abbbehhhhhpa.',
    '...abebqqlhhera',
    '...abbebkhsheba',
    '...abbbkeeeeeba',
    '...abbbbbeeebba',
  ],
  colors: {
    a: '#000000',
    b: '#1d251a',
    c: '#1b2117',
    d: '#37402d',
    e: '#3e4830',
    f: '#040404',
    h: '#60694a',
    i: '#13150f',
    j: '#4b553c',
    k: '#3b442f',
    l: '#5b6448',
    m: '#5f6547',
    n: '#475139',
    p: '#333b2b',
    q: '#414d34',
    r: '#20291b',
    s: '#646c4a',
  },
};

/** The far leg from the knee to the hem: it turns with the shin about the ankle, as the boot does. */
export const CARGO_SHIN_F: PaintedPiece = {
  pivot: [5, 15],
  angle: 98.58,
  rows: [
    'abbbcddeedfa.',
    '.abchiijddiha',
    '.abhibcdddcba',
    '.abbbccccicba',
    '.abbbbbccchba',
    '.abbbibbbbbba',
    '.abbbikccbba.',
    '.abbbikcilba.',
    '.abbbikcibba.',
    '.abbbikciba..',
    '.abbbikciba..',
    '.aaaaaaaaaaa.',
  ],
  colors: {
    a: '#010201',
    b: '#1d231a',
    c: '#3c462e',
    d: '#626b4a',
    e: '#606748',
    f: '#333b2b',
    h: '#20281a',
    i: '#414d34',
    j: '#5c6647',
    k: '#3c4532',
    l: '#3f4932',
  },
};

/** The near thigh: it turns with the thigh about the hip. */
export const CARGO_THIGH_N: PaintedPiece = {
  pivot: [10, -2],
  angle: 87.92,
  rows: [
    '...aaaaa...aaaaaa',
    '..abcdbdaaaddbbbb',
    '.abbcdbddbbdeefhf',
    '.abbcdbijdkckcddc',
    '.abbcdbijdkffhhcd',
    '.abbcdbijdffhhcdk',
    '.abbcdbijdfhhkbcc',
    '.abbcdbijdfhheccd',
    '.abbcdbijdfhhecba',
    '.abbcdbkldfhhecba',
    '.abbcdbklkfhhecba',
    '.aabcdbklkcbhecba',
    '.aabddbklkcbbecba',
    '.aabbccklkcbbecba',
    '.abcbcmnnkcbbeca.',
    'adckbccnffcbbea..',
    'adknbbcckccbba...',
    '.pknndbbbbbcba...',
    '.abdnmbbbbcba....',
  ],
  colors: {
    a: '#000000',
    b: '#1f271a',
    c: '#3d4530',
    d: '#1c2218',
    e: '#363f2d',
    f: '#636b4c',
    h: '#5f684b',
    i: '#4f583f',
    j: '#4a533c',
    k: '#3f4931',
    l: '#39432e',
    m: '#636b48',
    n: '#606747',
    p: '#030304',
  },
};

/** The near leg from the knee to the bloused hem: it turns with the shin about the ankle, as the boot does. */
export const CARGO_SHIN_N: PaintedPiece = {
  pivot: [7, 15],
  angle: 104.09,
  rows: [
    '.abcbcdeefcbbhca',
    'abcfbcceddcbbha.',
    'abfebbccfccbba..',
    '.afeebbiibbcba..',
    '.abbediibbcia...',
    '..abideeefbba...',
    '...aabbbibia....',
    '.....aaaaaa.....',
    '..........a.....',
    '..........a.....',
  ],
  colors: {
    a: '#020301',
    b: '#1c2419',
    c: '#3b452f',
    d: '#636b48',
    e: '#606747',
    f: '#404b32',
    h: '#36402c',
    i: '#20271b',
  },
};

/** The far leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle. */
export const CARGO_INTO_BOOT_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 98.58,
  rows: [
    'aaaaaaaaaa',
    'aaaaaaaaaa',
  ],
  colors: {
    a: '#000000',
  },
};

/** The near leg on under its hem into the boot (his line; drawn over boots only): it turns with the shin about the ankle. */
export const CARGO_INTO_BOOT_N: PaintedPiece = {
  pivot: [6, 10],
  angle: 104.09,
  rows: [
    'a........',
    'aa.......',
    '.aaa.....',
    '..aaaaaaa',
    '....aaaaa',
  ],
  colors: {
    a: '#000000',
  },
};

/** The browns between his legs (the cape's inside), no leg's: drawn only while the legs stand as he drew them. */
export const CARGO_GAP: PaintedPiece = {
  pivot: [9, -13],
  angle: 65.49,
  rows: [
    '......aa.',
    '......aa.',
    '......ab.',
    '......aaa',
    '......aaa',
    '......aaa',
    '.....aaaa',
    '....aaaaa',
    '...aaaaaa',
    '...aaaaaa',
    '..aaaaaaa',
    '..acaaaaa',
    '.aacaaaaa',
    'baacdddaa',
    'dddd.....',
  ],
  colors: {
    a: '#2e1a14',
    b: '#321c17',
    c: '#5d3d29',
    d: '#020101',
  },
};
