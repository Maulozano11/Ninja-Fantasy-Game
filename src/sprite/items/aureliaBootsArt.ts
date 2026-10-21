// Aurelia's thigh-high white boots with gold lace tops and gold heeled shoes (feet_dawn_boots): the
// owner's pixels from his picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg),
// by tools/refs/aurelia-legs-from-ref.py: one piece per segment of the leg, pivot on its joint, angle the
// segment's on our female at idle frame 0. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His white: the Cloth slot's default (his creams and greys follow it). */
export const DAWN_BOOT_CLOTH = '#f6eedc';
/** His gold: the Gold slot's default (his golds, the lacing and the seam follow it). */
export const DAWN_BOOT_GOLD = '#f2bd49';
export const DAWN_BOOT_CLOTH_CHARS = 'abcde';
export const DAWN_BOOT_GOLD_CHARS = 'ABCDEFGHIJLMNOPQ';
/** Where our leg goes: fine pixels above the knee along the thigh (the lace top's top edge). */
export const DAWN_BOOT_CUT = 10.04;
/** The same on the far leg: the far boot shows whole beside her front panel, so our far thigh goes from the lace top's top edge down. */
export const DAWN_BOOT_CUT_F = 10.40;

/** The near lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_N: PaintedPiece = {
  pivot: [7, 11],
  angle: 87.21,
  rows: [
    '....kkk.....',
    '...kQNCkkkkk',
    '...kNCCCCNNk',
    '..kNCCCCNNk.',
    '.kNNNCCCNNk.',
    '.kNcaNCNNk..',
    '.kbaaaJaPk..',
    '.kbaaaHak...',
    '.kbaaHabk...',
    'kddaaHadk...',
    'kddbFack....',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b7a3',
    d: '#9b857e',
    C: '#f2bd49',
    F: '#cfa056',
    H: '#bd8b41',
    J: '#b7833c',
    N: '#9f6b2e',
    P: '#785031',
    Q: '#553325',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_N: PaintedPiece = {
  pivot: [8, 18],
  angle: 103.41,
  rows: [
    '......kbaaHabk',
    '.....kddaaHadk',
    '.....kddbFack.',
    '....kdbddOddk.',
    '....kdbdOddk..',
    '...kdbbbOddk..',
    '...kdbbbObk...',
    '..kdbbbObbk...',
    '..kdbbbObk....',
    '..kdbbObdk....',
    '..kdbbObk.....',
    '..kdbObdk.....',
    '..kdbObk......',
    '..kdbObk......',
    '..kdObdk......',
    '.kddObk.......',
    '.kdaObk.......',
    '.kcCadk.......',
    '.kaCadk.......',
    'kbaCabk.......',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b7a3',
    d: '#9b857e',
    C: '#f2bd49',
    F: '#cfa056',
    H: '#bd8b41',
    O: '#916030',
  },
};

/** The near ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_N: PaintedPiece = {
  pivot: [8, 1],
  angle: 0.00,
  rows: [
    '.kcCadk',
    '.kaCadk',
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
    b: '#cebdab',
    c: '#c9b7a3',
    d: '#9b857e',
    B: '#f5c251',
    C: '#f2bd49',
    G: '#cb933f',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const DAWN_FOOT_JOIN_N: [number, number] = [-4.56, -1.62];

/** The far boot from its lace top to the ankle, all on the far shin (pivot: the ankle). */
export const DAWN_SHIN_F: PaintedPiece = {
  pivot: [7, 23],
  angle: 106.19,
  rows: [
    '...kkkk..',
    '...kNCk..',
    '...kNCk..',
    '...kNCk..',
    '...kNNk..',
    '...kbck..',
    '...kbbk..',
    '...kbbk..',
    '...kbbk..',
    '...kebk..',
    '...kdk...',
    '...kdk...',
    '...kdk...',
    '...kdk...',
    '...kDk...',
    '...kDk...',
    '..kdDk...',
    '.kdbDk...',
    'kdbbLk...',
    'kdbbLk...',
    'kdbbLk...',
    'kdbbLk...',
    '.kdbLk...',
    '.kdbLk...',
    '.kdbLk...',
    '.kdbbLk..',
    '.kddbLk..',
    'k1dbbaIk.',
    'k0dbaaBk.',
    'k01baaaCk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b7a3',
    d: '#9b857e',
    e: '#947d76',
    B: '#f5c251',
    C: '#f2bd49',
    D: '#deac59',
    I: '#c58c35',
    L: '#b37d2f',
    N: '#9f6b2e',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** The far ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_F: PaintedPiece = {
  pivot: [7, -4],
  angle: 0.00,
  rows: [
    'k1dbbaIk.....',
    'k0dbaaBk.....',
    'k01baaaCk....',
    'k111caaaNkk..',
    '.k1k1ba1EMMk.',
    '.k1kk11EEAAIk',
    '.kkk.k111111k',
    '......kkkkkkk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b7a3',
    d: '#9b857e',
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
