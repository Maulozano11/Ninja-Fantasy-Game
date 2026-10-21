// The princess's heeled shoes: the owner's pixels from his picture of her at our game's scale
// (docs/reference/princess-owner-reference.jpg, one of his pixels is one of ours), cut by
// tools/refs/princess-shoes-from-ref.py. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His colours the colour slots move the others from (at these, every pixel is his). */
export const PRINCESS_SHOE_GOLD = '#eaba5e';
export const PRINCESS_SHOE_LILAC = '#a884b4';

/** What each letter of the pieces is: his black line (it stays), the stocking's lilacs or the shoes' and ribbons' gold. */
export const PRINCESS_SHOE_KIND: Record<string, 'line' | 'lilac' | 'gold'> = {
  '0': 'line',
  '1': 'line',
  '2': 'gold',
  '3': 'gold',
  '4': 'gold',
  '5': 'gold',
  '6': 'gold',
  '7': 'gold',
  '8': 'gold',
  '9': 'lilac',
  a: 'gold',
  b: 'lilac',
  c: 'gold',
  d: 'gold',
  e: 'lilac',
  f: 'gold',
  g: 'lilac',
  h: 'lilac',
  i: 'gold',
  j: 'gold',
  k: 'lilac',
  l: 'lilac',
  m: 'gold',
  n: 'gold',
};

/**
 * The stocking's colours, his: the line, lilac lit and in shade, and the ribbon band under the line at its top
 * (lit side, middle, shade side).
 */
export const PRINCESS_STOCKING = { line: '#060317', lit: '#a884b4', shade: '#9172a3', band: ['#ce9749', '#96603a', '#864c44'] } as const;

/**
 * Each leg at our female idle frame 0, fine pixels: our knee and ankle (the rig's); the stocking's top (the
 * middle of the top of our knee row) and half width there, and its foot (the middle of the shoe piece's first
 * row) and half width there (to the middle of the line's pixels).
 */
export const PRINCESS_SHOE_LEGS = {
  N: { knee: [120.45, 193.1], ankle: [116.78, 207.65], top: [120.5, 193], topHalf: 4, foot: [112, 210], footHalf: 2.5 },
  F: { knee: [139.58, 188.21], ankle: [137.28, 203.04], top: [139, 188], topHalf: 3.5, foot: [134, 206], footHalf: 2.5 },
} as const;

/** The near shoe seen from the front, its toe out from under the hem, the ankle above it wound with his ribbons. Its pivot is the cell left of the middle of its first row. */
export const PRINCESS_SHOE_N: PaintedPiece = {
  pivot: [3, 0],
  angle: 0,
  rows: [
    '.159940',
    '.0789b1',
    '.1e55a1',
    '00gggg0',
    '0h222e0',
    '03iii21',
    '0iimij1',
    '05ini50',
    '.01110.',
  ],
  colors: {
    '0': '#060317',
    '1': '#07051b',
    '2': '#7c4244',
    '3': '#804447',
    '4': '#864c44',
    '5': '#96603a',
    '7': '#ae647d',
    '8': '#ca9245',
    '9': '#9172a3',
    a: '#ce9749',
    b: '#9a79a8',
    e: '#a884b4',
    g: '#ac8cb9',
    h: '#ac8fba',
    i: '#eaba5e',
    j: '#ecc062',
    m: '#fdecbb',
    n: '#fdeec2',
  },
};

/** The far heeled shoe pointing right, the ankle above it wound with his ribbons. Its pivot is the cell left of the middle of its first row. */
export const PRINCESS_SHOE_F: PaintedPiece = {
  pivot: [3, 0],
  angle: 0,
  rows: [
    '.159940......',
    '.0789b1......',
    '.1e55a1......',
    '06ee5551.....',
    '055eeek0.....',
    '06d4klkk1....',
    '115c4kkll0...',
    '.05155kl360..',
    '.16005f2imi01',
    '.100.05iiiii0',
    '......1000110',
  ],
  colors: {
    '0': '#060317',
    '1': '#07051b',
    '2': '#7c4244',
    '3': '#804447',
    '4': '#864c44',
    '5': '#96603a',
    '6': '#9a663b',
    '7': '#ae647d',
    '8': '#ca9245',
    '9': '#9172a3',
    a: '#ce9749',
    b: '#9a79a8',
    c: '#d4a146',
    d: '#d7a24e',
    e: '#a884b4',
    f: '#e2b25b',
    i: '#eaba5e',
    k: '#e9c4e3',
    l: '#ebcae6',
    m: '#fdecbb',
  },
};
