// The alchemist's cream blouse sleeves: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-blouse-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_BLOUSE_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BLOUSE_BASE: Record<string, string> = {
  cloth: '#caae90',
  trim: '#462a28',
};
/** The letters of each slot's colours. */
export const ALCH_BLOUSE_CHARS: Record<string, string> = {
  cloth: 'abcdefhij',
  trim: 'lmnpqrs',
};
/** His skin's letters: drawn in the body's skin, at these shades of it. */
export const ALCH_BLOUSE_SKIN: Record<string, number> = {  };

/** The near sleeve to the elbow (pivot: the shoulder). */
export const ALCH_BLOUSE_UPPER_N: PaintedPiece = {
  pivot: [6, -6],
  angle: 107.10,
  rows: [
    '...kaaadi.rr.',
    '...kaaadk.krr',
    '..khaaack.kqq',
    '.kchaaak...kr',
    '.kacdack...ks',
    'khcaaiik.....',
    'kihdcack.....',
    '...cddhk.....',
    '......k......',
  ],
  colors: {
    k: '#000008',
    a: '#fae8c2',
    c: '#d8b698',
    d: '#caae90',
    h: '#baa186',
    i: '#ac9676',
    q: '#382828',
    r: '#2e1e18',
    s: '#0e0a12',
  },
};

/** The near sleeve from the elbow (pivot: the elbow). */
export const ALCH_BLOUSE_FORE_N: PaintedPiece = {
  pivot: [3, 3],
  angle: 102.53,
  rows: [
    '...k....',
    '...kkkk.',
    '..khdcak',
    '.kifcdk.',
    '.kcfced.',
    '.kcfcedk',
    '.kcfcek.',
    '.kcfck..',
    'kccfck..',
    'kccfk...',
    'kccfk...',
    'kccfk...',
    'ccck....',
  ],
  colors: {
    k: '#000008',
    a: '#fae8c2',
    c: '#d8b698',
    d: '#caae90',
    e: '#d2a682',
    f: '#d09a76',
    h: '#baa186',
    i: '#ac9676',
  },
};

/** What of our near arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const ALCH_BLOUSE_SPAN_N: [number, number] = [-1.000, 1.000];

/** The far sleeve to the elbow (pivot: the shoulder). */
export const ALCH_BLOUSE_UPPER_F: PaintedPiece = {
  pivot: [0, -3],
  angle: 72.90,
  rows: [
    '.nk..',
    'nnk..',
    'ppk..',
    'ppk..',
    'ppk..',
    'llk..',
    'iik..',
    'dddk.',
    'mmlk.',
    'ddddk',
    'dddd.',
  ],
  colors: {
    k: '#000008',
    d: '#caae90',
    i: '#ac9676',
    l: '#988268',
    m: '#8e7560',
    n: '#6a4436',
    p: '#462a28',
  },
};

/** The far sleeve from the elbow (pivot: the elbow). */
export const ALCH_BLOUSE_FORE_F: PaintedPiece = {
  pivot: [3, 2],
  angle: 70.71,
  rows: [
    'kk.....',
    'kk.....',
    '.kkk...',
    'ddjdk..',
    '..jdk..',
    '..kdk..',
    '..jdk..',
    '..jdbk.',
    '..jdbk.',
    '..jdbk.',
    '..jdbbk',
    '...dkbk',
  ],
  colors: {
    k: '#000008',
    b: '#eac8a7',
    d: '#caae90',
    j: '#ae8260',
  },
};

/** What of our far arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const ALCH_BLOUSE_SPAN_F: [number, number] = [-1.000, 1.000];
