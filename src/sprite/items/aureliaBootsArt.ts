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
/** Where our leg goes: fine pixels above the knee along the thigh (the lace top's top edge). */
export const DAWN_BOOT_CUT = 11.75;
/** The same on the far leg. */
export const DAWN_BOOT_CUT_F = 12.01;

/** The near lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_N: PaintedPiece = {
  pivot: [6, 12],
  angle: 99.25,
  rows: [
    '.....kkk.....',
    '....kQNCkkkkk',
    '....kNCCCCNNk',
    '...kNCCCCNNk.',
    '..kNNNCCCNNk.',
    '..kNbaNCNNk..',
    '..kbaaaJaPk..',
    '..kbaaaHak...',
    '..kbaaHabk...',
    '.kccaaHack...',
    '.kccbFabk....',
    'kcbccOcck....',
    '......ck.....',
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
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_N: PaintedPiece = {
  pivot: [6, 18],
  angle: 105.42,
  rows: [
    '.....kccaa...',
    '.....kccbFabk',
    '....kcbccOcck',
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
    F: '#cfa056',
    O: '#915f30',
  },
};

/** The near ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_N: PaintedPiece = {
  pivot: [6, -1],
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
export const DAWN_FOOT_JOIN_N: [number, number] = [-2.00, 1.00];

/** The far lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_F: PaintedPiece = {
  pivot: [1, 12],
  angle: 91.36,
  rows: [
    'kkkk',
    'kNCk',
    'kNCk',
    'kNCk',
    'kNNk',
    'kbbk',
    'kbbk',
    'kbbk',
    'kbbk',
    'kcbk',
    'kck.',
    'kck.',
  ],
  colors: {
    k: '#030517',
    b: '#cdbcab',
    c: '#9b857e',
    C: '#f2bd49',
    N: '#9f6b2e',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_F: PaintedPiece = {
  pivot: [5, 17],
  angle: 88.03,
  rows: [
    '...kcbk..',
    '...kck...',
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
  pivot: [5, -1],
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
export const DAWN_FOOT_JOIN_F: [number, number] = [-1.00, 0.50];
