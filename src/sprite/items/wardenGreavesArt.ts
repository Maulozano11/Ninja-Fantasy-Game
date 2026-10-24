// The owner's armoured outfit: the greaves and sabatons, his pixels at our scale (tools/refs/warden-greaves-from-ref.py from
// docs/reference/three-outfits-owner-reference.jpg, shrunk and cleaned by tools/refs/outfits_ref.py).
// Generated: rerun the script to change it.
import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const WARDEN_GREAVES_STEEL = '#323338';

/** What each of his colours is, as the script sorts them (tools/refs/outfits_ref.py kind). */
export const WARDEN_GREAVES_KIND: Record<string, 'blue' | 'brown' | 'dark' | 'hair' | 'line' | 'steel' | 'white'> = {
  '#000116': 'line',
  '#00011f': 'line',
  '#132854': 'hair',
  '#141a2a': 'hair',
  '#181822': 'dark',
  '#1c2234': 'hair',
  '#1e1e2a': 'hair',
  '#212227': 'dark',
  '#222b3c': 'hair',
  '#272a32': 'hair',
  '#2c2b31': 'dark',
  '#322826': 'brown',
  '#323338': 'steel',
  '#3b3c40': 'steel',
  '#45484f': 'steel',
  '#4f5259': 'steel',
  '#575c62': 'steel',
  '#62c0f0': 'blue',
  '#63686e': 'steel',
  '#6a7179': 'steel',
  '#737c7f': 'steel',
  '#7d8286': 'steel',
  '#8ab0ca': 'hair',
  '#90959b': 'steel',
  '#a8e2fa': 'hair',
  '#b1edff': 'hair',
  '#b7ecf6': 'hair',
  '#bdf6ff': 'hair',
  '#eeffff': 'white',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const WARDEN_GREAVES_REST: Record<string, [number, number]> = {
  WARDEN_GREAVES_BOOT_N: [108, 197],
  WARDEN_GREAVES_BOOT_F: [127, 198],
  WARDEN_GREAVES_FOOT_N: [108, 209],
  WARDEN_GREAVES_FOOT_F: [130, 208],
};

/** His near greave. It rides the shin about the ankle. */
export const WARDEN_GREAVES_BOOT_N: PaintedPiece = {
  pivot: [4, 12],
  angle: 99.78,
  rows: [
    '.a.a..a.....',
    '.abaacdaaaaa',
    '.aceaaddffha',
    '.adiiaaaaaaa',
    '.afffbejjeea',
    '.acekkeella.',
    '.acemnmbpa..',
    '.apeqnjbfa..',
    '.apeqjkba...',
    '.aekqrbsa...',
    '.abqmkbca...',
    '.aeetkda....',
    'adkmukda....',
    'a.aaaa.a....',
  ],
  colors: {
    a: '#000116',
    b: '#3b3c40',
    c: '#212227',
    d: '#1c2234',
    e: '#323338',
    f: '#2c2b31',
    h: '#222b3c',
    i: '#141a2a',
    j: '#63686e',
    k: '#45484f',
    l: '#1e1e2a',
    m: '#575c62',
    n: '#737c7f',
    p: '#181822',
    q: '#4f5259',
    r: '#6a7179',
    s: '#272a32',
    t: '#90959b',
    u: '#7d8286',
  },
};

/** His far greave. It rides the shin about the ankle. */
export const WARDEN_GREAVES_BOOT_F: PaintedPiece = {
  pivot: [9, 8],
  angle: 87.80,
  rows: [
    '.ab........................',
    'aaa..c.....................',
    '.adef......................',
    '..ahaaa.........aa.........',
    '..aiajda.........ka........',
    '...aajlja.........maa......',
    '...alanjjpaa........qa.....',
    '...aheajrpja........s......',
    '....alatrpja...........a...',
    '....alatruja........v......',
    '...aaalnwaaa..............a',
    '.......a.........a........a',
    '...................a....m.a',
    '.......................aaa.',
  ],
  colors: {
    a: '#000116',
    b: '#a8e2fa',
    c: '#bdf6ff',
    d: '#1c2234',
    e: '#00011f',
    f: '#132854',
    h: '#322826',
    i: '#181822',
    j: '#3b3c40',
    k: '#62c0f0',
    l: '#212227',
    m: '#b1edff',
    n: '#45484f',
    p: '#737c7f',
    q: '#eeffff',
    r: '#323338',
    s: '#b7ecf6',
    t: '#2c2b31',
    u: '#7d8286',
    v: '#8ab0ca',
    w: '#63686e',
  },
};

/** His near sabaton. It stands on the ankle, flat on the ground. */
export const WARDEN_GREAVES_FOOT_N: PaintedPiece = {
  pivot: [4, 0],
  angle: 99.78,
  rows: [
    'a......a',
    'abaaaaca',
    'aadbedfa',
    'adchddia',
    'abaaaada',
    'adddddja',
    'akk..kka',
    'akkkkkla',
    'alllllla',
    'aaaaaaa.',
  ],
  colors: {
    a: '#000116',
    b: '#45484f',
    c: '#575c62',
    d: '#323338',
    e: '#63686e',
    f: '#181822',
    h: '#6a7179',
    i: '#212227',
    j: '#4f5259',
    k: '#3b3c40',
    l: '#2c2b31',
  },
};

/** His far sabaton. It stands on the ankle, flat on the ground. */
export const WARDEN_GREAVES_FOOT_F: PaintedPiece = {
  pivot: [6, -2],
  angle: 87.80,
  rows: [
    '.aa...aaa...............',
    'aabbaccda...............',
    'aeaabecfda..............',
    'aeeaeeefccaa.........a.a',
    'aeehaacbccfcaa..........',
    'aaeiaiaijjccca..........',
    '.aaaaaiaaaaaaa..........',
    '......a.................',
  ],
  colors: {
    a: '#000116',
    b: '#212227',
    c: '#3b3c40',
    d: '#737c7f',
    e: '#2c2b31',
    f: '#45484f',
    h: '#181822',
    i: '#1c2234',
    j: '#323338',
  },
};
