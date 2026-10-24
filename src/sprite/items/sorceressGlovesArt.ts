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
  glove: 'ABCDEFGHIJKLMabcdefhijlmnpqrstuvwxyz',
  metal: 'NOPQRSTUVWXYZ',
};

/** His glove in four tones, our hand's shades 0-3 (his line, dark, middle, light): our hands take them in every pose but rest. */
export const NIGHT_GLOVES_TONES: [string, string, string, string] = ['#000008', '#0a041a', '#201a26', '#4c4048'];

/** The near forearm's piece (pivot: the elbow). */
export const NIGHT_GLOVES_CUFF_N: PaintedPiece = {
  pivot: [7, -1],
  angle: 102.53,
  rows: [
    '..knbuL..Id',
    '..kbCzmLLHj',
    '.kjxMzqwwkl',
    '.kyJWQpuHMk',
    '.nJJwRWFJGc',
    '.kEETQuFEEc',
    '.kEEPNuJBEk',
    '.kBBOQwEByk',
    '.EEHZzfEBkk',
    'kEEzZzfBB..',
    '.EEzZzfk...',
  ],
  colors: {
    k: '#000008',
    B: '#2c0d2a',
    C: '#20122c',
    E: '#250c22',
    F: '#161220',
    G: '#23041e',
    H: '#120c1a',
    I: '#180a10',
    J: '#1a071a',
    L: '#140408',
    M: '#0a041a',
    N: '#e6ffff',
    O: '#e1f4e1',
    P: '#dfded6',
    Q: '#c4cdd7',
    R: '#aeacaf',
    T: '#909e9e',
    W: '#828386',
    Z: '#544e50',
    b: '#6e3c6c',
    c: '#63335b',
    d: '#5c3461',
    f: '#414348',
    j: '#562b58',
    l: '#4e2c4f',
    m: '#3e2e3c',
    n: '#48244a',
    p: '#322f3a',
    q: '#342a32',
    u: '#2e2230',
    w: '#26202c',
    x: '#2a1a32',
    y: '#34122d',
    z: '#201a26',
  },
};

/** His near gloved fist at rest (pivot: the hand). */
export const NIGHT_GLOVES_FIST_N: PaintedPiece = {
  pivot: [4, 1],
  angle: 102.60,
  rows: [
    'kBDqmukk.',
    'kBHwhzmEk',
    '.kuheFMkk',
    '..kuFkMk.',
    '...kk.k..',
    '...kk....',
    '....k...k',
  ],
  colors: {
    k: '#000008',
    B: '#2c0d2a',
    D: '#1e131a',
    E: '#250c22',
    F: '#161220',
    H: '#120c1a',
    M: '#0a041a',
    e: '#4c4048',
    h: '#483842',
    m: '#3e2e3c',
    q: '#342a32',
    u: '#2e2230',
    w: '#26202c',
    z: '#201a26',
  },
};

/** The far forearm's piece (pivot: the elbow). */
export const NIGHT_GLOVES_CUFF_F: PaintedPiece = {
  pivot: [3, -1],
  angle: 70.71,
  rows: [
    'kA..sk.',
    'yk.zkak',
    'kKKWXMk',
    'tHuYRJk',
    'vkFqpUk',
    'kHzwUXk',
    'kykzrSk',
    'kyykwKk',
    'kktkwVp',
    '....kVp',
  ],
  colors: {
    k: '#000008',
    A: '#281425',
    F: '#161220',
    H: '#120c1a',
    J: '#1a071a',
    K: '#0e0a12',
    M: '#0a041a',
    R: '#aeacaf',
    S: '#9e9e98',
    U: '#969692',
    V: '#908f88',
    W: '#828386',
    X: '#585e60',
    Y: '#5b5257',
    a: '#704670',
    p: '#322f3a',
    q: '#342a32',
    r: '#2a2c32',
    s: '#3a1c3a',
    t: '#481632',
    u: '#2e2230',
    v: '#3f142f',
    w: '#26202c',
    y: '#34122d',
    z: '#201a26',
  },
};

/** His far gloved fist at rest (pivot: the hand). */
export const NIGHT_GLOVES_FIST_F: PaintedPiece = {
  pivot: [4, 3],
  angle: 70.77,
  rows: [
    '.kzkk.',
    'kHzhk.',
    'kKHhmk',
    '.pDqKk',
    '.kzmMk',
    '.AHzqk',
    '.tHkKK',
    'kikkkk',
  ],
  colors: {
    k: '#000008',
    A: '#281425',
    D: '#1e131a',
    H: '#120c1a',
    K: '#0e0a12',
    M: '#0a041a',
    h: '#483842',
    i: '#6c263d',
    m: '#3e2e3c',
    p: '#322f3a',
    q: '#342a32',
    t: '#481632',
    z: '#201a26',
  },
};
