// The alchemist's leather bracers set with green and blue gems, and her leather gloves: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-bracers-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_BRACERS_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BRACERS_BASE: Record<string, string> = {
  leather: '#342222',
  metal: '#a7a09f',
  gem: '#162a28',
  trim: '#eaca61',
};
/** The letters of each slot's colours. */
export const ALCH_BRACERS_CHARS: Record<string, string> = {
  leather: 'abcdefhijlmnpqrstuvwx',
  metal: 'ABCDEFGyz',
  gem: 'HIJ',
  trim: 'KLMN',
};

/** His glove in four tones, our hand's shades 0-3 (his line, dark, middle, light): our hands take them in every pose but rest. */
export const ALCH_BRACERS_TONES: [string, string, string, string] = ['#000008', '#282022', '#52565c', '#f6f4e8'];

/** The near forearm's piece (pivot: the elbow). */
export const ALCH_BRACERS_CUFF_N: PaintedPiece = {
  pivot: [3, 1],
  angle: 102.53,
  rows: [
    '.kpcpBBBk',
    '.krjjjBBk',
    '.kjBjjpk.',
    '.kjBbspk.',
    '.kjBsjk..',
    '.kbbsk...',
    'kjBpsk..k',
    'kHbpk..kj',
    'kJjkk.kpp',
    'kcpwk.kjs',
    'bcjk..kyB',
    '...w...B.',
  ],
  colors: {
    k: '#000008',
    B: '#a7a09f',
    H: '#3fa75e',
    J: '#102222',
    b: '#986c5a',
    c: '#9c6448',
    j: '#6a4436',
    p: '#583a30',
    r: '#3e3736',
    s: '#4c302c',
    w: '#342222',
    y: '#fffbf0',
  },
};

/** His near gloved fist at rest (pivot: the hand). */
export const ALCH_BRACERS_FIST_N: PaintedPiece = {
  pivot: [1, 3],
  angle: 102.60,
  rows: [
    '...k...k.',
    'kFfmk..km',
    'kzAiqkkmq',
    'kidqiiqim',
    'kqmqmiqqq',
    'kvmvkkkvx',
    '.kmk.....',
    '.kfk.....',
    '..k......',
  ],
  colors: {
    k: '#000008',
    A: '#b4a8a0',
    F: '#52565c',
    d: '#8b664a',
    f: '#7e5440',
    i: '#68493e',
    m: '#5a403a',
    q: '#4c3634',
    v: '#382828',
    x: '#282022',
    z: '#f6f4e8',
  },
};

/** The far forearm's piece (pivot: the elbow). */
export const ALCH_BRACERS_CUFF_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 70.71,
  rows: [
    'aaak...',
    'aahk...',
    'kttEk..',
    'wtwhk..',
    'wtwhk..',
    'wwttk..',
    'kItwhk.',
    'wIpwhk.',
    'tIphtk.',
    'NIwtttk',
    'kIItttk',
    '...tkww',
  ],
  colors: {
    k: '#000008',
    E: '#666064',
    I: '#162a28',
    N: '#8a5e32',
    a: '#8e7e68',
    h: '#704b38',
    p: '#583a30',
    t: '#443032',
    w: '#342222',
  },
};

/** His far gloved fist at rest (pivot: the hand). */
export const ALCH_BRACERS_FIST_F: PaintedPiece = {
  pivot: [6, 3],
  angle: 70.77,
  rows: [
    '..ukkk..',
    '..uwllk.',
    '..kwllk.',
    'k..kluk.',
    'ke.klCk.',
    '.k.uuDGk',
    'kL.kuuun',
    'eMK.kk.k',
    '.lM.....',
  ],
  colors: {
    k: '#000008',
    C: '#a09694',
    D: '#7a7a78',
    G: '#544e50',
    K: '#f9cd6f',
    L: '#f4ce5f',
    M: '#eaca61',
    e: '#765846',
    l: '#62402c',
    n: '#414348',
    u: '#462a28',
    w: '#342222',
  },
};
