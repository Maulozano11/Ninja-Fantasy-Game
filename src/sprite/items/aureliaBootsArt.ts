// Aurelia's thigh-high white boots with gold lace tops and gold heeled shoes (feet_dawn_boots): the
// owner's pixels from his picture of her at our scale (docs/reference/aurelia-escala-juego-owner-reference.jpg),
// by tools/refs/aurelia-legs-from-ref.py: one piece per segment of the leg, pivot on its joint, angle the
// segment's on our female at idle frame 0. Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His white: the Cloth slot's default (his creams and greys follow it). */
export const DAWN_BOOT_CLOTH = '#f6eedc';
/** His gold: the Gold slot's default (his golds, the lacing and the seam follow it). */
export const DAWN_BOOT_GOLD = '#f1bd48';
export const DAWN_BOOT_CLOTH_CHARS = 'abcd';
export const DAWN_BOOT_GOLD_CHARS = 'ABCDEFGHIJLMNOP';
/** Where our leg goes: fine pixels above the knee along the thigh (the lace top's top edge). */
export const DAWN_BOOT_CUT = 10.04;

/** The near lace top and the boot down to the knee (pivot: the knee). */
export const DAWN_THIGH_N: PaintedPiece = {
  pivot: [7, 11],
  angle: 87.21,
  rows: [
    '....kkk.....',
    '...kPMBkkkkk',
    '...kMBBBBMMk',
    '..kMBBBBMMk.',
    '.kMMMBBBMMk.',
    '.kMcaMBMMk..',
    '.kbaaaIaOk..',
    '.kbaaaGak...',
    '.kbaaGabk...',
    'kddaaGadk...',
    'kddbEack....',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b6a2',
    d: '#9b857e',
    B: '#f1bd48',
    E: '#cfa056',
    G: '#bd8b41',
    I: '#b7833c',
    M: '#9f6b2e',
    O: '#785031',
    P: '#553325',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_N: PaintedPiece = {
  pivot: [8, 18],
  angle: 103.41,
  rows: [
    '......kbaaGabk',
    '.....kddaaGadk',
    '.....kddbEack.',
    '....kdbddNddk.',
    '....kdbdNddk..',
    '...kdbbbNddk..',
    '...kdbbbNbk...',
    '..kdbbbNbbk...',
    '..kdbbbNbk....',
    '..kdbbNbdk....',
    '..kdbbNbk.....',
    '..kdbNbdk.....',
    '..kdbNbk......',
    '..kdbNbk......',
    '..kdNbdk......',
    '.kddNbk.......',
    '.kdaNbk.......',
    '.kcBadk.......',
    '.kaBadk.......',
    'kbaBabk.......',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b6a2',
    d: '#9b857e',
    B: '#f1bd48',
    E: '#cfa056',
    G: '#bd8b41',
    N: '#916030',
  },
};

/** The near ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_N: PaintedPiece = {
  pivot: [8, 1],
  angle: 0.00,
  rows: [
    '.kcBadk',
    '.kaBadk',
    'kbaBabk',
    'kaaAaak',
    'ka111ak',
    'k1AAA1k',
    'kFAAAAk',
    'k00000k',
    '.kkkkk.',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b6a2',
    d: '#9b857e',
    A: '#f5c250',
    B: '#f1bd48',
    F: '#cb933f',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const DAWN_FOOT_JOIN_N: [number, number] = [-4.56, -1.62];

/** The far lace top and the boot over the knee: his near boot in his far boot's shade (pivot: the knee; laid as the near's, it turns with the far thigh). */
export const DAWN_THIGH_F: PaintedPiece = {
  pivot: [6, 11],
  angle: 87.21,
  rows: [
    '...kkk.....',
    '..kPMBkkkkk',
    '..kMBBBBMMk',
    '.kMBBBBMMk.',
    'kMMMBBBMMk.',
    'kMcbMBMMk..',
    'kbbbbIbOk..',
    'kbbbbGbk...',
    'kbbbGbbk...',
  ],
  colors: {
    k: '#030517',
    b: '#cebdab',
    c: '#c9b6a2',
    B: '#f1bd48',
    G: '#bd8b41',
    I: '#b7833c',
    M: '#9f6b2e',
    O: '#785031',
    P: '#553325',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const DAWN_SHIN_F: PaintedPiece = {
  pivot: [2, 18],
  angle: 106.19,
  rows: [
    '.....k...',
    '....Ck...',
    '..bbCk...',
    '.dbbCk...',
    'kdbbCk...',
    'kdbbCk...',
    'kddbCk...',
    'kdbbJk...',
    'kdbbJk...',
    'kdbbJk...',
    'kdbbJk...',
    '.kdbJk...',
    '.kdbJk...',
    '.kdbJk...',
    '.kdbbJk..',
    '.kddbJk..',
    'k1dbbaHk.',
    'k0dbaaAk.',
    'k01baaaAk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    d: '#9b857e',
    A: '#f5c250',
    C: '#dfac58',
    H: '#c58c35',
    J: '#b37d2f',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** The far ankle and shoe, flat (pivot: the ankle). */
export const DAWN_FOOT_F: PaintedPiece = {
  pivot: [2, 2],
  angle: 0.00,
  rows: [
    'k1dbbaHk.....',
    'k0dbaaAk.....',
    'k01baaaAk....',
    'k111caaaMkk..',
    '.k1k1ba1DLLk.',
    '.k1kk11DD..Hk',
    '.kkk.k111111k',
    '......kkkkkkk',
  ],
  colors: {
    k: '#030517',
    a: '#f6eedc',
    b: '#cebdab',
    c: '#c9b6a2',
    d: '#9b857e',
    A: '#f5c250',
    D: '#e3aa40',
    H: '#c58c35',
    L: '#ac7535',
    M: '#9f6b2e',
    0: '#946235',
    1: '#7b4d36',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const DAWN_FOOT_JOIN_F: [number, number] = [1.42, -2.06];
