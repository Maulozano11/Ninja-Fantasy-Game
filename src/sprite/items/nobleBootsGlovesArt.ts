// The owner's tall black boots and fingerless gloves, from his Scarlet picture brought down to our scale
// (tools/refs/scarlet-gloves-boots-from-ref.py from docs/reference/scarlet-owner-reference.jpg).
// Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots recolour from (at these, every pixel is his). */
export const NOBLE_BOOT_LEATHER = '#2e2d33';
export const NOBLE_BUCKLE = '#5e4a33';
export const NOBLE_GLOVE_LEATHER = '#252328';

/** The skin he painted the fingertips in (his face's): the character's skin moves them as far. */
export const NOBLE_HAND_SKIN = '#f8d4b8';

/** His leather for the hands he did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */
export const NOBLE_GLOVE_TONES = ['#040405', '#111014', '#252328', '#2e2d33', '#39383c'] as const;

/** His skin for the bare fingertips of those hands, by our hand pictures' shades: line, shadow, base, light. */
export const NOBLE_TIP_TONES = ['#040405', '#b27758', '#ca9c75', '#f2c8aa'] as const;

/** What each colour of his in these pieces is: his black line (it stays), leather, his bronze or skin. */
export const NOBLE_KIND: Record<string, 'line' | 'leather' | 'bronze' | 'skin'> = {
  '#040405': 'line',
  '#1a191e': 'leather',
  '#252328': 'leather',
  '#2e2d33': 'leather',
  '#39383c': 'leather',
  '#4e3c2b': 'bronze',
  '#504e52': 'leather',
  '#646267': 'leather',
  '#846542': 'bronze',
  '#947650': 'bronze',
  '#b27758': 'skin',
  '#ca9c75': 'skin',
  '#e2af8c': 'skin',
  '#f2c8aa': 'skin',
};

/** The near boot's shaft: his black line round its top, the cuff with his strap across it and its bronze buckle on the outside, his shine down the shin. It turns with the shin about the ankle. */
export const NOBLE_SHAFT_N: PaintedPiece = {
  pivot: [3, 14],
  angle: 104.09,
  rows: [
    'aaaaaaaa',
    'atBBtnja',
    'avJOjjfa',
    'aaaaaaaa',
    'atHtnjfa',
    'atHtnjfa',
    'atHtnjfa',
    'atHtnjfa',
    'atHtnjfa',
    'atHtnjfa',
    'atHtnjfa',
    'atHnnjfa',
    'atHnnjfa',
    'atHnnjfa',
    'atHnnjfa',
    'atHnnjfa',
    'atHnnjfa',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    v: '#4e3c2b',
    B: '#504e52',
    H: '#646267',
    J: '#846542',
    O: '#947650',
  },
};

/** The near boot's foot, seen from the front: his toe with its shine, his black sole. */
export const NOBLE_FOOT_N: PaintedPiece = {
  pivot: [5, -1],
  angle: 104.09,
  rows: [
    '.attHnnjfa',
    '.atBHnnjfa',
    'atBHnnjffa',
    'atBHnnjjfa',
    'atBHnnnjfa',
    'atBBnnnjfa',
    'atttnnjffa',
    'atttnnjffa',
    'affffffffa',
    '.aaaaaaaa.',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    H: '#646267',
  },
};

/** The far boot's shaft: his black line round its top, the strap with its bronze buckle, his shine down the shin. It turns with the shin about the ankle. */
export const NOBLE_SHAFT_F: PaintedPiece = {
  pivot: [2, 14],
  angle: 98.56,
  rows: [
    '.aaaaaaaa',
    '.atBBtnja',
    '.avJOjjfa',
    '.aaaaaaaa',
    '.atBtnjfa',
    '.atBtnjfa',
    '.atBtnjfa',
    '.atBtnjfa',
    '.atBnnjfa',
    'atBtnjfa.',
    'atBtnjfa.',
    'atBnnjfa.',
    'atBnnjfa.',
    'atBnnjfa.',
    'atBnnjfa.',
    'atBnnjfa.',
    'atBnnjfa.',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    v: '#4e3c2b',
    B: '#504e52',
    J: '#846542',
    O: '#947650',
  },
};

/** The far boot's foot pointing right: his ankle strap and its buckle, the shine over the toe, his black sole. */
export const NOBLE_FOOT_F: PaintedPiece = {
  pivot: [2, -1],
  angle: 98.56,
  rows: [
    'atBtnnjfa....',
    'atBtnnnjfa...',
    'atBtnnnnjfa..',
    'atBtnnnnnjfa.',
    'atttnnnnnjjfa',
    'afffffffffffa',
    '.aaaaaaaaaaa.',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
  },
};

/** The near fist round a grip: his black leather over the back of the hand, lit on the side the light comes from, his skin on the fingertips. */
export const NOBLE_GLOVE_N: PaintedPiece = {
  pivot: [3, 5],
  angle: 103.15,
  rows: [
    '..aaaa.....',
    '.aBHBHaaa..',
    '.affffBta..',
    'a.anBtaja..',
    'naaaaanaa..',
    '.jaBBBffa..',
    'naBBBBftja.',
    'aaBBBHfttfa',
    '.afafattjt.',
    '.ajtnBtjaa.',
    '.aZftffa...',
    '..ffZj4a...',
    '....ffQa...',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    H: '#646267',
    Q: '#b27758',
    Z: '#e2af8c',
    '4': '#f2c8aa',
  },
};

/** The far fist hanging closed: his black leather, his skin on the curled fingertips. */
export const NOBLE_GLOVE_F: PaintedPiece = {
  pivot: [6, 4],
  angle: 60.37,
  rows: [
    'a....aa..',
    'a..aatta.',
    'aaajfnfa.',
    'aaffjfaa.',
    'fajfaaBa.',
    'jaafffaBa',
    'jtafaffBa',
    'anaaftffa',
    'anjaZZfja',
    'fataZfQXa',
    'tatafZZf.',
    'tattaff..',
  ],
  colors: {
    a: '#040405',
    f: '#1a191e',
    j: '#252328',
    n: '#2e2d33',
    t: '#39383c',
    B: '#504e52',
    Q: '#b27758',
    X: '#ca9c75',
    Z: '#e2af8c',
  },
};
