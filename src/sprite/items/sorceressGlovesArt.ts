// The sorceress's black gloves with buckled cuffs: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-gloves-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const NIGHT_GLOVES_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_GLOVES_BASE: Record<string, string> = {
  glove: '#250c22',
  metal: '#544e50',
};
/** The letters of each slot's colours. */
export const NIGHT_GLOVES_CHARS: Record<string, string> = {
  glove: 'abcdefhijlmnpqrstuv',
  metal: 'ABCDEFGHIJwxyz',
};

/** His glove in four tones, our hand's shades 0-3 (his line, dark, middle, light): our hands take them in every pose but rest. */
export const NIGHT_GLOVES_TONES: [string, string, string, string] = ['#000008', '#2c0d2a', '#342a32', '#414348'];

/** The near forearm's piece (pivot: the elbow). */
export const NIGHT_GLOVES_CUFF_N: PaintedPiece = {
  pivot: [7, -1],
  angle: 102.53,
  rows: [
    '..khaeu..me',
    '..khhmiishe',
    '.khhsHbimkh',
    '.khsibbmssk',
    '.essixEisse',
    '.kssiEbmsse',
    '.ksmwIisssk',
    '.ksiyIFsssk',
    '.sssimEsskk',
    'ksssIIiss..',
    '.sssIbik...',
  ],
  colors: {
    k: '#000008',
    E: '#828386',
    F: '#666064',
    H: '#52565c',
    I: '#544e50',
    a: '#7a3a70',
    b: '#414348',
    e: '#562b58',
    h: '#48244a',
    i: '#322f3a',
    m: '#2e2230',
    s: '#250c22',
    u: '#120c1a',
    w: '#e6ffff',
    x: '#e8fce7',
    y: '#e1f4e1',
  },
};

/** His near gloved fist at rest (pivot: the hand). */
export const NIGHT_GLOVES_FIST_N: PaintedPiece = {
  pivot: [4, 1],
  angle: 102.60,
  rows: [
    'krrjbjkk.',
    'krqjbbbrk',
    '.kjbbjjkk',
    '..kjjkqk.',
    '...kk.k..',
    '...kk....',
    '....k...k',
  ],
  colors: {
    k: '#000008',
    b: '#414348',
    j: '#342a32',
    q: '#201a26',
    r: '#2c0d2a',
  },
};

/** The far forearm's piece (pivot: the elbow). */
export const NIGHT_GLOVES_CUFF_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 70.71,
  rows: [
    'kh..hk.',
    'hk.pkhk',
    'knpBGtk',
    'hriGbrk',
    'hkpibik',
    'knppzDk',
    'knkpDJk',
    'knnkpik',
    'kkhkpAD',
    '....kDb',
  ],
  colors: {
    k: '#000008',
    A: '#b5bbb9',
    B: '#aeacaf',
    D: '#908f88',
    G: '#585e60',
    J: '#4e484c',
    b: '#414348',
    h: '#48244a',
    i: '#322f3a',
    n: '#3f142f',
    p: '#26202c',
    r: '#2c0d2a',
    t: '#161220',
    z: '#b8bfc7',
  },
};

/** His far gloved fist at rest (pivot: the hand). */
export const NIGHT_GLOVES_FIST_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 70.77,
  rows: [
    '.kjkk.',
    'kvqdk.',
    'kqqddk',
    '.Cqfjk',
    '.kjdqk',
    '.ljjjk',
    '.lqkqq',
    'kckkkk',
  ],
  colors: {
    k: '#000008',
    C: '#969692',
    c: '#742944',
    d: '#483842',
    f: '#35383d',
    j: '#342a32',
    l: '#481632',
    q: '#201a26',
    v: '#0e0a12',
  },
};
