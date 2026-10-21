// Aurelia's thigh-high white boots with gold lace tops and gold heeled shoes (feet_dawn_boots): the
// owner's pixels from his picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg),
// by tools/refs/aurelia-legs-from-ref.py: one piece per segment of the leg, pivot on its joint, angle the
// segment's on our female at idle frame 0. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His white: the Cloth slot's default (his creams and greys follow it). */
export const DAWN_BOOT_CLOTH = '#f6eedc';
/** His gold: the Gold slot's default (his golds, the lacing and the seam follow it). */
export const DAWN_BOOT_GOLD = '#f2bd49';
export const DAWN_BOOT_CLOTH_CHARS = 'abc';
export const DAWN_BOOT_GOLD_CHARS = 'ABCDEFGHIJLMNOPQ';
/** His bare thighs in the slits: these letters are drawn in the body's skin, at these shades of it (their colours are his, for reference). */
export const DAWN_BOOT_SKIN: Record<string, number> = { '+': 3, '=': 2, '-': 1 };
/** Where our leg goes: fine pixels above the knee along the thigh (the lace top's top edge). */
export const DAWN_BOOT_CUT = 13.13;
/** The same on the far leg: the far boot shows whole beside her front panel, so our far thigh goes from the lace top's top edge down. */
export const DAWN_BOOT_CUT_F = 10.40;

/** The near lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_N: PaintedPiece = {
  pivot: [11, 20],
  angle: 87.21,
  rows: [
    '............=.',
    '............=.',
    '...........==.',
    '..........=+=.',
    '.........=++=.',
    '........=+++=.',
    '......kkk+++=.',
    '.....kQNCkkkkk',
    '.....kNCCCCNNk',
    '....kNCCCCNNk.',
    '...kNNNCCCNNk.',
    '...kNbaNCNNk..',
    '...kbaaaJaPk..',
    '...kbaaaHak...',
    '...kbaaHabk...',
    '..kccaaHack...',
    '..kccbFabk....',
    '.kcbccOcck....',
    '.kcbcOcck.....',
    'kcbbbOcck.....',
    'kc............',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cdbcab',
    c: '#9b857e',
    C: '#f2bd49',
    F: '#cfa056',
    H: '#bd8b41',
    J: '#b7833c',
    N: '#9f6b2e',
    O: '#915f30',
    P: '#785031',
    Q: '#553325',
    '+': '#f5c5a3',
    '=': '#dd937c',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_N: PaintedPiece = {
  pivot: [10, 18],
  angle: 103.41,
  rows: [
    '.....cbccOcck',
    '....kcbcOcck.',
    '...kcbbbOcck.',
    '...kcbbbObk..',
    '..kcbbbObbk..',
    '..kcbbbObck..',
    '..kcbbbObk...',
    '..kcbbObck...',
    '..kcbbObk....',
    '..kcbbObk....',
    '..kcbObck....',
    '..kcbObk.....',
    '..kcbObk.....',
    '..kcObck.....',
    '..kcObck.....',
    '.kccObk......',
    '.kcaObk......',
    '.kbCack......',
    '.kaCack......',
    'kbaCabk......',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cdbcab',
    c: '#9b857e',
    C: '#f2bd49',
    O: '#915f30',
  },
};

/** The near ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_N: PaintedPiece = {
  pivot: [10, 1],
  angle: 0.00,
  rows: [
    '.kbCack',
    '.kaCack',
    'kbaCabk',
    'kaaBaak',
    'ka111ak',
    'k1BBC1k',
    'kGBCBBk',
    'k00000k',
    '.kkkkk.',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cdbcab',
    c: '#9b857e',
    B: '#f5c251',
    C: '#f2bd49',
    G: '#cb933f',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const DAWN_FOOT_JOIN_N: [number, number] = [-6.56, -1.62];

/** The far lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_F: PaintedPiece = {
  pivot: [9, 14],
  angle: 52.27,
  rows: [
    '......=.',
    '.=......',
    '.=....=.',
    '.==....=',
    '.=+.....',
    '.=+.....',
    '........',
    'kkkk....',
    'kNCk....',
    'kNCk....',
    'kNCk....',
    'kNNk....',
    'kbbk....',
    'kbbk....',
    'kbbk....',
    'kbbk....',
    'kcbk....',
    'kck.....',
    'kck.....',
    'kck.....',
    'kc......',
  ],
  colors: {
    k: '#030517',
    b: '#cdbcab',
    c: '#9b857e',
    C: '#f2bd49',
    N: '#9f6b2e',
    '+': '#f5c5a3',
    '=': '#dd937c',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_F: PaintedPiece = {
  pivot: [7, 15],
  angle: 106.19,
  rows: [
    '......k..',
    '.....bk..',
    '....ck...',
    '...kck...',
    '...kck...',
    '...kck...',
    '...kDk...',
    '...kDk...',
    '..kcDk...',
    '.kcbDk...',
    'kcbbLk...',
    'kcbbLk...',
    'kcbbLk...',
    'kcbbLk...',
    '.kcbLk...',
    '.kcbLk...',
    '.kcbLk...',
    '.kcbbLk..',
    '.kccbLk..',
    'k1cbbaIk.',
    'k0cbaaBk.',
    'k01baaaCk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cdbcab',
    c: '#9b857e',
    B: '#f5c251',
    C: '#f2bd49',
    D: '#deac59',
    I: '#c58c35',
    L: '#b37d2f',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** The far ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_F: PaintedPiece = {
  pivot: [7, -4],
  angle: 0.00,
  rows: [
    'k1cbbaIk.....',
    'k0cbaaBk.....',
    'k01baaaCk....',
    'k111baaaNkk..',
    '.k1k1ba1EMMk.',
    '.k1kk11EEAAIk',
    '.kkk.k111111k',
    '......kkkkkkk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cdbcab',
    c: '#9b857e',
    A: '#fcd368',
    B: '#f5c251',
    C: '#f2bd49',
    E: '#e3aa40',
    I: '#c58c35',
    M: '#ac7535',
    N: '#9f6b2e',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const DAWN_FOOT_JOIN_F: [number, number] = [-3.58, 3.94];
