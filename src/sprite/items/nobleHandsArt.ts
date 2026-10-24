// The owner's gloves and cuffs on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-hands-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_GLOVES = '#22243d';
export const NOBLE_CUFFS = '#3b235e';
export const NOBLE_CUFF_GOLD = '#f0a452';
export const NOBLE_HAND_SKIN = '#ebad8a';

/** What each of his colours is, as the script sorts them (tools/refs/noble_ref.py kind). */
export const NOBLE_HANDS_KIND: Record<string, 'dark' | 'gold' | 'line' | 'purple' | 'skin'> = {
  '#000008': 'line',
  '#13111f': 'dark',
  '#141228': 'dark',
  '#1c1326': 'dark',
  '#211f2d': 'dark',
  '#22163f': 'dark',
  '#22243d': 'dark',
  '#251724': 'dark',
  '#261643': 'purple',
  '#2e2c3a': 'dark',
  '#341f4e': 'purple',
  '#383643': 'dark',
  '#3b235e': 'purple',
  '#3e4166': 'dark',
  '#42276a': 'purple',
  '#422b35': 'dark',
  '#4b2d23': 'dark',
  '#824e2c': 'gold',
  '#844e38': 'gold',
  '#915d32': 'gold',
  '#9c613a': 'gold',
  '#a46b40': 'gold',
  '#a65c50': 'skin',
  '#ae703f': 'gold',
  '#b47843': 'gold',
  '#bc7c44': 'gold',
  '#c8874a': 'gold',
  '#ce9054': 'gold',
  '#d89450': 'gold',
  '#e0a35c': 'gold',
  '#e39d78': 'skin',
  '#e8a252': 'gold',
  '#e8a45e': 'gold',
  '#ebad8a': 'skin',
  '#ecac5c': 'gold',
  '#f0a452': 'gold',
  '#f5ae5a': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NOBLE_HANDS_REST: Record<string, [number, number]> = {
  NOBLE_CUFF_N: [102, 165],
  NOBLE_GLOVE_N: [99, 171],
  NOBLE_CUFF_F: [134, 167],
  NOBLE_GLOVE_F: [135, 174],
};

/** The cuff: it rides the forearm about the elbow. */
export const NOBLE_CUFF_N: PaintedPiece = {
  pivot: [8, -1],
  angle: 103.19,
  rows: [
    '.a.a......',
    'baaacc....',
    'a.adacc...',
    '..aefaaha.',
    '..eiejda..',
    '.aejkjella',
    '.amjeenna.',
    '..jefenna.',
  ],
  colors: {
    a: '#000008',
    b: '#13111f',
    c: '#422b35',
    d: '#e8a252',
    e: '#42276a',
    f: '#f5ae5a',
    h: '#1c1326',
    i: '#b47843',
    j: '#ecac5c',
    k: '#f0a452',
    l: '#ae703f',
    m: '#3b235e',
    n: '#261643',
  },
};

/** The fist: it rides the hand about the wrist. */
export const NOBLE_GLOVE_N: PaintedPiece = {
  pivot: [8, 4],
  angle: 103.15,
  rows: [
    'abc........',
    'cdecc......',
    '.cfhcijjckc',
    'clcmncccccc',
    '.c.pcqqac..',
    '....crrrsc.',
    '...crtursc.',
    '...cqrra...',
    '...cdsr....',
    '....css....',
  ],
  colors: {
    a: '#13111f',
    b: '#3e4166',
    c: '#000008',
    d: '#211f2d',
    e: '#141228',
    f: '#bc7c44',
    h: '#824e2c',
    i: '#341f4e',
    j: '#ecac5c',
    k: '#22163f',
    l: '#a46b40',
    m: '#e8a252',
    n: '#915d32',
    p: '#4b2d23',
    q: '#2e2c3a',
    r: '#383643',
    s: '#22243d',
    t: '#ae703f',
    u: '#e0a35c',
  },
};

/** The cuff: it rides the forearm about the elbow. */
export const NOBLE_CUFF_F: PaintedPiece = {
  pivot: [3, -3],
  angle: 60.43,
  rows: [
    '...abc.cd',
    '.e.accfcd',
    'ceechijcc',
    '.cchklmc.',
    '.jnlplqc.',
    '.jjllhkc.',
    '.cjjllhjc',
    '..cjh..kc',
    '........k',
  ],
  colors: {
    a: '#422b35',
    b: '#251724',
    c: '#000008',
    d: '#ae703f',
    e: '#1c1326',
    f: '#844e38',
    h: '#ecac5c',
    i: '#e8a45e',
    j: '#261643',
    k: '#3b235e',
    l: '#42276a',
    m: '#ce9054',
    n: '#9c613a',
    p: '#e8a252',
    q: '#d89450',
  },
};

/** The fist: it rides the hand about the wrist. */
export const NOBLE_GLOVE_F: PaintedPiece = {
  pivot: [7, -1],
  angle: 60.37,
  rows: [
    '....aa..',
    '.bcbbbd.',
    '..befebb',
    'hbbiiifb',
    'hbbeieib',
    'hbbjbbib',
    '.bbbbbeb',
    '.kbblmbb',
    '.hbbbbb.',
    '.hb.....',
  ],
  colors: {
    a: '#e8a252',
    b: '#000008',
    c: '#a46b40',
    d: '#c8874a',
    e: '#211f2d',
    f: '#141228',
    h: '#1c1326',
    i: '#2e2c3a',
    j: '#ebad8a',
    k: '#251724',
    l: '#a65c50',
    m: '#e39d78',
  },
};
