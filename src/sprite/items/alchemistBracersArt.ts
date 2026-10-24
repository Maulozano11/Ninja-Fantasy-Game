// The alchemist's leather bracers set with green and blue gems, and her leather gloves: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-bracers-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_BRACERS_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BRACERS_BASE: Record<string, string> = {
  leather: '#443032',
  metal: '#a7a09f',
  gem: '#162a28',
  trim: '#dcc8a8',
};
/** The letters of each slot's colours. */
export const ALCH_BRACERS_CHARS: Record<string, string> = {
  leather: 'abcdefhijlmnpqrstuvwxy',
  metal: 'ABCDz',
  gem: 'EFG',
  trim: 'H',
};

/** His glove in four tones, our hand's shades 0-3 (his line, dark, middle, light): our hands take them in every pose but rest. */
export const ALCH_BRACERS_TONES: [string, string, string, string] = ['#000008', '#282022', '#5a403a', '#8b664a'];

/** The near forearm's piece (pivot: the elbow). */
export const ALCH_BRACERS_CUFF_N: PaintedPiece = {
  pivot: [3, 1],
  angle: 102.53,
  rows: [
    '.kqdqAAAk',
    '.kslllAAk',
    '.klAllqk.',
    '.klActqk.',
    '.klAtlk..',
    '.kcctk...',
    'klAqtk..k',
    'kEcqk..kl',
    'kGlkk.kqq',
    'kdqxk.klt',
    'cdlk..kzA',
    '...x...A.',
  ],
  colors: {
    k: '#000008',
    A: '#a7a09f',
    E: '#3fa75e',
    G: '#102222',
    c: '#986c5a',
    d: '#9c6448',
    l: '#6a4436',
    q: '#583a30',
    s: '#3e3736',
    t: '#4c302c',
    x: '#342222',
    z: '#fffbf0',
  },
};

/** His near gloved fist at rest (pivot: the hand). */
export const ALCH_BRACERS_FIST_N: PaintedPiece = {
  pivot: [1, 3],
  angle: 102.60,
  rows: [
    '...k...k.',
    'kjhnk..kn',
    'keejrkknr',
    'kjerjjrjn',
    'krnrnjrrr',
    'kwnwkkkwy',
    '.knk.....',
    '.khk.....',
    '..k......',
  ],
  colors: {
    k: '#000008',
    e: '#8b664a',
    h: '#7e5440',
    j: '#68493e',
    n: '#5a403a',
    r: '#4c3634',
    w: '#382828',
    y: '#282022',
  },
};

/** The far forearm's piece (pivot: the elbow). */
export const ALCH_BRACERS_CUFF_F: PaintedPiece = {
  pivot: [3, 1],
  angle: 70.71,
  rows: [
    'HHHk...',
    'aaik...',
    'kuuuk..',
    'xuxik..',
    'xuxik..',
    'xxuuk..',
    'kFuxik.',
    'xFqxik.',
    'uFqiuk.',
    'iFxuuuk',
    'kFFuuuk',
    '...ukxx',
  ],
  colors: {
    k: '#000008',
    F: '#162a28',
    H: '#dcc8a8',
    a: '#8e7e68',
    i: '#704b38',
    q: '#583a30',
    u: '#443032',
    x: '#342222',
  },
};

/** His far gloved fist at rest (pivot: the hand). */
export const ALCH_BRACERS_FIST_F: PaintedPiece = {
  pivot: [6, 3],
  angle: 70.77,
  rows: [
    '..vkkk..',
    '..vxmmk.',
    '..kxmmk.',
    'k..kmvk.',
    'kf.kmBk.',
    '.k.vvCDk',
    'kb.kvvvp',
    'fmb.kk.k',
    '.mb.....',
  ],
  colors: {
    k: '#000008',
    B: '#a09694',
    C: '#7a7a78',
    D: '#544e50',
    b: '#847466',
    f: '#765846',
    m: '#62402c',
    p: '#414348',
    v: '#462a28',
    x: '#342222',
  },
};
