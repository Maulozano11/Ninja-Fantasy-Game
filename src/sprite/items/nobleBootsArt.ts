// The owner's boots on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-boots-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_BOOTS = '#13111f';
export const NOBLE_BOOT_GOLD = '#c8874a';

/** What each of his colours is, as the script sorts them (tools/refs/noble_ref.py kind). */
export const NOBLE_BOOTS_KIND: Record<string, 'gold' | 'leather' | 'line'> = {
  '#000000': 'line',
  '#000008': 'line',
  '#07192e': 'leather',
  '#08335a': 'leather',
  '#0a0815': 'leather',
  '#13111f': 'leather',
  '#141228': 'leather',
  '#211f2d': 'leather',
  '#22243d': 'leather',
  '#262d4a': 'leather',
  '#292226': 'leather',
  '#2e2c3a': 'leather',
  '#303249': 'leather',
  '#31232e': 'leather',
  '#362b33': 'leather',
  '#40291b': 'leather',
  '#422b35': 'leather',
  '#52372c': 'leather',
  '#624637': 'leather',
  '#644246': 'leather',
  '#664a4a': 'leather',
  '#794a2e': 'gold',
  '#845853': 'leather',
  '#8b603d': 'gold',
  '#926259': 'leather',
  '#966842': 'gold',
  '#a46b40': 'gold',
  '#b47843': 'gold',
  '#b88152': 'gold',
  '#bc7c44': 'gold',
  '#c0844c': 'gold',
  '#c68b54': 'gold',
  '#c8874a': 'gold',
  '#ce9054': 'gold',
  '#d69860': 'gold',
  '#d89450': 'gold',
  '#e09d54': 'gold',
  '#ecac5c': 'gold',
  '#f1ac64': 'gold',
  '#f4bd69': 'gold',
  '#f5ae5a': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NOBLE_BOOTS_REST: Record<string, [number, number]> = {
  NOBLE_BOOT_SHIN_N: [107, 205],
  NOBLE_BOOT_FOOT_N: [105, 211],
  NOBLE_BOOT_SHIN_F: [129, 204],
  NOBLE_BOOT_FOOT_F: [129, 210],
};

/** The shaft: it turns with the shin about his ankle. */
export const NOBLE_BOOT_SHIN_N: PaintedPiece = {
  pivot: [4, 4],
  angle: 104.85,
  rows: [
    '..abcdca',
    '..abefba',
    '..ahiia.',
    '.acjkdea',
    '.aaffhea',
    'aalaamba',
    'naaffhe.',
    'aalaamb.',
  ],
  colors: {
    a: '#000008',
    b: '#141228',
    c: '#22243d',
    d: '#b88152',
    e: '#13111f',
    f: '#c8874a',
    h: '#b47843',
    i: '#e09d54',
    j: '#c68b54',
    k: '#0a0815',
    l: '#a46b40',
    m: '#8b603d',
    n: '#000000',
  },
};

/** The foot: it stands on the ground under his ankle. */
export const NOBLE_BOOT_FOOT_N: PaintedPiece = {
  pivot: [6, -2],
  angle: 0.00,
  rows: [
    '..aabcbaa.',
    '..adefeba.',
    '.aabbhbba.',
    '.afijfkkba',
    'almnnnnpba',
    'abbefqbbba',
    'arsttusvva',
    '.aaaaaaaa.',
  ],
  colors: {
    a: '#000008',
    b: '#13111f',
    c: '#f4bd69',
    d: '#303249',
    e: '#22243d',
    f: '#ecac5c',
    h: '#a46b40',
    i: '#f5ae5a',
    j: '#f1ac64',
    k: '#e09d54',
    l: '#0a0815',
    m: '#211f2d',
    n: '#262d4a',
    p: '#141228',
    q: '#794a2e',
    r: '#362b33',
    s: '#644246',
    t: '#845853',
    u: '#926259',
    v: '#422b35',
  },
};

/** The shaft: it turns with the shin about his ankle. */
export const NOBLE_BOOT_SHIN_F: PaintedPiece = {
  pivot: [2, 4],
  angle: 88.95,
  rows: [
    'abcdea..',
    'abcfha..',
    'abbbia..',
    'abbbjka.',
    'accblama',
    'aabbnpaa',
    'accblama',
    'aabbnpaa',
  ],
  colors: {
    a: '#000008',
    b: '#13111f',
    c: '#22243d',
    d: '#d69860',
    e: '#141228',
    f: '#966842',
    h: '#c0844c',
    i: '#c8874a',
    j: '#ecac5c',
    k: '#211f2d',
    l: '#0a0815',
    m: '#40291b',
    n: '#ce9054',
    p: '#a46b40',
  },
};

/** The foot: it stands on the ground under his ankle. */
export const NOBLE_BOOT_FOOT_F: PaintedPiece = {
  pivot: [2, -2],
  angle: 0.00,
  rows: [
    'abbbcadba.....',
    'baaeafffba....',
    'hbbabbffiaa...',
    '.bbbbbbjjbka..',
    '.lmaabnpffpqaa',
    '..aaaarsbbtuva',
    '......aaaaaaaa',
  ],
  colors: {
    a: '#000008',
    b: '#13111f',
    c: '#d89450',
    d: '#292226',
    e: '#52372c',
    f: '#303249',
    h: '#08335a',
    i: '#2e2c3a',
    j: '#ecac5c',
    k: '#624637',
    l: '#07192e',
    m: '#31232e',
    n: '#966842',
    p: '#22243d',
    q: '#262d4a',
    r: '#211f2d',
    s: '#664a4a',
    t: '#bc7c44',
    u: '#f4bd69',
    v: '#b47843',
  },
};
