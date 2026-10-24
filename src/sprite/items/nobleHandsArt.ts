// The owner's gloves and cuffs on his noble swordsman, the owner's pixels at our scale (tools/refs/noble-hands-from-ref.py from
// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_GLOVES = '#2e2c3a';
export const NOBLE_CUFFS = '#42276a';
export const NOBLE_CUFF_GOLD = '#f0a452';
export const NOBLE_HAND_SKIN = '#e39d78';

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
  '#42276a': 'purple',
  '#422b35': 'dark',
  '#4b2d23': 'dark',
  '#824e2c': 'gold',
  '#844e38': 'gold',
  '#915d32': 'gold',
  '#9c613a': 'gold',
  '#a46b40': 'gold',
  '#ae703f': 'gold',
  '#b47843': 'gold',
  '#c8874a': 'gold',
  '#ce9054': 'gold',
  '#d89450': 'gold',
  '#e0a35c': 'gold',
  '#e39d78': 'skin',
  '#e8a252': 'gold',
  '#e8a45e': 'gold',
  '#ecac5c': 'gold',
  '#f0a452': 'gold',
  '#f5ae5a': 'gold',
};

/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */
export const NOBLE_HANDS_REST: Record<string, [number, number]> = {
  NOBLE_CUFF_N: [104, 165],
  NOBLE_GLOVE_N: [102, 172],
  NOBLE_CUFF_F: [135, 167],
  NOBLE_GLOVE_F: [137, 174],
};

/** The cuff: it rides the forearm about the elbow. */
export const NOBLE_CUFF_N: PaintedPiece = {
  pivot: [6, -1],
  angle: 103.19,
  rows: [
    '.a......',
    '.abb....',
    'acabb...',
    'adeaafa.',
    'dhdica..',
    'dijidkka',
    'liddmma.',
    'idedmma.',
  ],
  colors: {
    a: '#000008',
    b: '#422b35',
    c: '#e8a252',
    d: '#42276a',
    e: '#f5ae5a',
    f: '#1c1326',
    h: '#b47843',
    i: '#ecac5c',
    j: '#f0a452',
    k: '#ae703f',
    l: '#3b235e',
    m: '#261643',
  },
};

/** The fist: it rides the hand about the wrist. */
export const NOBLE_GLOVE_N: PaintedPiece = {
  pivot: [5, 3],
  angle: 103.15,
  rows: [
    'aa......',
    'bacddaea',
    'fhaaaaaa',
    'iajjka..',
    '.alllma.',
    'alnplma.',
    'ajllk...',
    'aqml....',
    '.amm....',
  ],
  colors: {
    a: '#000008',
    b: '#824e2c',
    c: '#341f4e',
    d: '#ecac5c',
    e: '#22163f',
    f: '#e8a252',
    h: '#915d32',
    i: '#4b2d23',
    j: '#2e2c3a',
    k: '#13111f',
    l: '#383643',
    m: '#22243d',
    n: '#ae703f',
    p: '#e0a35c',
    q: '#211f2d',
  },
};

/** The cuff: it rides the forearm about the elbow. */
export const NOBLE_CUFF_F: PaintedPiece = {
  pivot: [2, -3],
  angle: 60.43,
  rows: [
    '..abc.cd',
    'e.accfcd',
    'eechijcc',
    'cchklmc.',
    '.nlplqc.',
    '.jllhkc.',
    '..jllhjc',
    '..jh..kc',
    '.......k',
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
  pivot: [5, -1],
  angle: 60.37,
  rows: [
    '..aa..',
    'bcccd.',
    'cefecc',
    '.hhhfc',
    '.ehehc',
    '..cchc',
    '..ccec',
    '...icc',
  ],
  colors: {
    a: '#e8a252',
    b: '#a46b40',
    c: '#000008',
    d: '#c8874a',
    e: '#211f2d',
    f: '#141228',
    h: '#2e2c3a',
    i: '#e39d78',
  },
};
