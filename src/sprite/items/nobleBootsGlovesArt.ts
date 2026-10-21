// The owner's tall black boots and fingerless gloves, from his Scarlet picture brought down to our scale
// (tools/refs/scarlet-gloves-boots-from-ref.py from docs/reference/scarlet-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_BOOT_LEATHER = '#252328';
export const NOBLE_BUCKLE = '#5e4a33';
export const NOBLE_GLOVE_LEATHER = '#252328';

/** The skin he painted the fingertips in (his face's): the character's skin moves them as far. */
export const NOBLE_HAND_SKIN = '#f8d4b8';

/** His leather for the hands he did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */
export const NOBLE_GLOVE_TONES = ['#040405', '#111014', '#252328', '#2e2d33', '#39383c'] as const;

/** What each colour of his in these pieces is: his black line (it stays), leather, his bronze or skin. */
export const NOBLE_KIND: Record<string, 'line' | 'leather' | 'bronze' | 'skin'> = {
  '#040405': 'line',
  '#0f0407': 'line',
  '#111014': 'leather',
  '#1a191e': 'leather',
  '#252328': 'leather',
  '#332a1e': 'bronze',
  '#2e2d33': 'leather',
  '#39383c': 'leather',
  '#4e3c2b': 'bronze',
  '#5e4a33': 'bronze',
  '#6f442a': 'skin',
  '#504e52': 'leather',
  '#646267': 'leather',
  '#9e654b': 'skin',
  '#767276': 'leather',
  '#b27758': 'skin',
  '#be8867': 'skin',
  '#9c9496': 'leather',
  '#ca9c75': 'skin',
  '#f2c8aa': 'skin',
};

/** The near boot's shaft: his black line round its top, the cuff with his strap across it and its bronze buckle on the outside, his shine down the shin. It turns with the shin about the ankle. */
export const NOBLE_SHAFT_N: PaintedPiece = {
  pivot: [2, 11],
  angle: 104.09,
  rows: [
    'aaaaaaaaa',
    'ajntnjfda',
    'aBHNHBtna',
    'ayjnjfdda',
    'ajnBnfda.',
    'afnHnfda.',
    'afjBnfda.',
    'afjHjfda.',
    'adjBjfda.',
    'adnBjdda.',
    'afnHjdda.',
    'afnHjda..',
    'afnHjda..',
  ],
  colors: {
    a: '#040405',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    y: '#5e4a33',
    B: '#504e52',
    H: '#646267',
    N: '#767276',
  },
};

/** The near boot's foot, seen from the front: his toe with its shine, his black sole. */
export const NOBLE_FOOT_N: PaintedPiece = {
  pivot: [6, 0],
  angle: 104.09,
  rows: [
    '..adfjBtfda.',
    '..afjnHjfda.',
    '..afjBtjfda.',
    '.aajnHjffdda',
    '.afnBtjfddda',
    '.ajBHnjfddda',
    'afnHVnjffdda',
    'ajBVHtjffdda',
    'anHBtjffddda',
    'atBtjffddda.',
    'ajtjffdddba.',
    '.aaaaaaaaaa.',
  ],
  colors: {
    a: '#040405',
    b: '#0f0407',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    H: '#646267',
    V: '#9c9496',
  },
};

/** The far boot's shaft: his black line round its top, the strap with its bronze buckle, his shine down the shin. It turns with the shin about the ankle. */
export const NOBLE_SHAFT_F: PaintedPiece = {
  pivot: [4, 14],
  angle: 98.56,
  rows: [
    'aaaaaaaaaa',
    '.afjntnjfa',
    '.atBHNHBta',
    '.adfjnjfva',
    '..afjBnfma',
    '..afjHnfda',
    '..adjBjfda',
    '..adjHjfda',
    '..adjBjfda',
    '..adnHjfda',
    '..adnBjfda',
    '..adnHjfda',
    '..adnHjfda',
    '..adnHjfda',
  ],
  colors: {
    a: '#040405',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    m: '#332a1e',
    n: '#2e2d33',
    t: '#39383c',
    v: '#4e3c2b',
    B: '#504e52',
    H: '#646267',
    N: '#767276',
  },
};

/** The far boot's foot pointing right: his ankle strap and its buckle, the shine over the toe, his black sole. */
export const NOBLE_FOOT_F: PaintedPiece = {
  pivot: [3, 2],
  angle: 98.56,
  rows: [
    '.adjBtBtma......',
    '.adjtBjfdda.....',
    'addjjtBjfdaa....',
    'addjjntBHjfda...',
    'addfjjntBHjfdda.',
    'addfjjnntBVHjfda',
    'addffjjnntBVHjda',
    'abddffjjnntBHjda',
    'aabddffjjjnttjda',
    '....aaaaaaaaaa..',
  ],
  colors: {
    a: '#040405',
    b: '#0f0407',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    m: '#332a1e',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    H: '#646267',
    V: '#9c9496',
  },
};

/** The near fist round a grip: his black leather over the back of the hand, lit on the side the light comes from, his skin on the fingertips. */
export const NOBLE_GLOVE_N: PaintedPiece = {
  pivot: [4, 0],
  angle: 103.15,
  rows: [
    '.antjfaa.',
    'antBnjfa.',
    'ajntnjfda',
    'ajnnjffda',
    'afjjffdaa',
    'a4Q4Q4QQa',
    'aX4X4X4a.',
    '.aQXQXQa.',
    '..aa.aa..',
  ],
  colors: {
    a: '#040405',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    Q: '#b27758',
    X: '#ca9c75',
    '4': '#f2c8aa',
  },
};

/** The far fist hanging closed: his black leather, his skin on the curled fingertips. */
export const NOBLE_GLOVE_F: PaintedPiece = {
  pivot: [4, 0],
  angle: 60.37,
  rows: [
    '.aafnnfa.',
    '.ajntnja.',
    '.afjfjnfa',
    '.adjfjfda',
    'aadfQUfda',
    '..aMzUba.',
    '...aQUa..',
    '....aa...',
  ],
  colors: {
    a: '#040405',
    b: '#0f0407',
    d: '#111014',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    z: '#6f442a',
    M: '#9e654b',
    Q: '#b27758',
    U: '#be8867',
  },
};
