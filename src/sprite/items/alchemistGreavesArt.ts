// The alchemist's tan leggings, steel knee cops and greaves over brown boots: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-greaves-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_GREAVES_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_GREAVES_BASE: Record<string, string> = {
  cloth: '#ab8f6a',
  leather: '#382828',
  metal: '#666064',
};
/** The letters of each slot's colours. */
export const ALCH_GREAVES_CHARS: Record<string, string> = {
  cloth: 'abcdef',
  leather: 'hijlmnpqrs',
  metal: 'tuvwx',
};

/** The near boot over the knee and what of the leg above it (pivot: the knee). */
export const ALCH_GREAVES_THIGH_N: PaintedPiece = {
  pivot: [3, 24],
  angle: 99.25,
  rows: [
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhjl.',
    '....qqnjhj..',
    '....qqnjhjl.',
    '....ndqhhjll',
    '...eeflhejl.',
    '...jhlheej..',
    '...nljeeejn.',
    '..rrnjeeelhe',
    '..rrpljhhnee',
    '.rrrljlnppe.',
    '.rrnjjjnpk..',
    'rrrpjjlnrr..',
    'pppljjprrr..',
    'nnprhlnrk...',
    'pplhhhrr....',
    'rrveeelk....',
    '.kmeeem..ee.',
    'kmmvevm.eeee',
    '...mmml.eeee',
    '.........ee.',
  ],
  colors: {
    k: '#000008',
    d: '#b6915e',
    e: '#ab8f6a',
    f: '#b68a54',
    h: '#896e58',
    j: '#765238',
    l: '#68493e',
    m: '#414348',
    n: '#583a30',
    p: '#4c302c',
    q: '#42331c',
    r: '#382828',
    v: '#666064',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const ALCH_GREAVES_SHIN_N: PaintedPiece = {
  pivot: [3, 15],
  angle: 105.42,
  rows: [
    '...nnvm....',
    '...rrmvvmmr',
    '..rqppvlllr',
    '..rrvvrrrr.',
    '.prvveevrk.',
    '.prvhevwk..',
    '.krveevlm..',
    '.kpvevvmm..',
    '.kmvevvv...',
    '.kmvevvk...',
    '.kmvvvvk...',
    '.kmvvvk....',
    '.kvvvvk....',
    '.kvvvmk....',
    '.kvvlk.....',
    '.kmvvk.....',
    '.kvmrk.....',
    'kveem......',
    'kveev......',
    'kveev......',
  ],
  colors: {
    k: '#000008',
    e: '#ab8f6a',
    h: '#896e58',
    l: '#68493e',
    m: '#414348',
    n: '#583a30',
    p: '#4c302c',
    q: '#42331c',
    r: '#382828',
    v: '#666064',
    w: '#5b5257',
  },
};

/** The near shoe, flat (pivot: the ankle). */
export const ALCH_GREAVES_FOOT_N: PaintedPiece = {
  pivot: [4, -3],
  angle: 0.00,
  rows: [
    '.kveev.',
    '.kveev.',
    '.kpnpr.',
    '.knllpk',
    'kpljjnk',
    'krrprrk',
    '.kkkkk.',
  ],
  colors: {
    k: '#000008',
    e: '#ab8f6a',
    j: '#765238',
    l: '#68493e',
    n: '#583a30',
    p: '#4c302c',
    r: '#382828',
    v: '#666064',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const ALCH_GREAVES_JOIN_N: [number, number] = [-1.00, 3.00];
/** How far above the near knee our leg goes under the boot (fine pixels along the thigh). */
export const ALCH_GREAVES_CUT_N = 24.64;

/** The far boot over the knee and what of the leg above it (pivot: the knee). */
export const ALCH_GREAVES_THIGH_F: PaintedPiece = {
  pivot: [3, 18],
  angle: 91.36,
  rows: [
    '...i....',
    '..iii...',
    '.iiii...',
    '.iiiik..',
    '.eeiick.',
    '.eeeick.',
    '.eeeiak.',
    '.eeexbek',
    'ssrjppek',
    'sssnnpek',
    '.spjjk..',
    '.ppnnk..',
    '.jjjnk..',
    '.nnnik..',
    '.vvvvm..',
    '.evvev..',
    'mmmeev..',
    'xxxvex..',
  ],
  colors: {
    k: '#000008',
    a: '#f2d074',
    b: '#eccb7c',
    c: '#daa858',
    e: '#ab8f6a',
    i: '#725a4e',
    j: '#765238',
    m: '#414348',
    n: '#583a30',
    p: '#4c302c',
    r: '#382828',
    s: '#180a10',
    v: '#666064',
    x: '#544e50',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const ALCH_GREAVES_SHIN_F: PaintedPiece = {
  pivot: [6, 14],
  angle: 88.03,
  rows: [
    '...mmxxx....',
    '...xxmmk....',
    '...nxvk.....',
    '...srrr.....',
    '..pxvex.....',
    '.pnevev.....',
    'pprvvev.....',
    'krrvvek.....',
    '.kppvek.....',
    '.kpmvek.....',
    '.kprvvk.....',
    '..kpvvk.....',
    '..krxvk.....',
    '..kpxvk.....',
    '..kpxvk.....',
    '..kprrrk....',
    '..kpnpek....',
    '.krrpmvtk...',
    '.krrprxumk..',
    '.krrrrrmpnkk',
  ],
  colors: {
    k: '#000008',
    e: '#ab8f6a',
    m: '#414348',
    n: '#583a30',
    p: '#4c302c',
    r: '#382828',
    s: '#180a10',
    t: '#f6f4e8',
    u: '#828386',
    v: '#666064',
    x: '#544e50',
  },
};

/** The far shoe, flat (pivot: the ankle). */
export const ALCH_GREAVES_FOOT_F: PaintedPiece = {
  pivot: [5, -4],
  angle: 0.00,
  rows: [
    'krrprxumk....',
    'krrrrrmpnkk..',
    '.krrrrpnjjjkk',
    '.kkkkkkrrrppk',
    '.......kkkkkk',
  ],
  colors: {
    k: '#000008',
    j: '#765238',
    m: '#414348',
    n: '#583a30',
    p: '#4c302c',
    r: '#382828',
    u: '#828386',
    x: '#544e50',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const ALCH_GREAVES_JOIN_F: [number, number] = [-1.00, 4.00];
/** How far above the far knee our leg goes under the boot (fine pixels along the thigh). */
export const ALCH_GREAVES_CUT_F = 17.25;
