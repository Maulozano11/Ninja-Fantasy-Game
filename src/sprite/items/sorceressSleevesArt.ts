// The sorceress's black shoulders and wide split purple bell sleeves: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-sleeves-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const NIGHT_SLEEVES_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_SLEEVES_BASE: Record<string, string> = {
  cloth: '#201a26',
  gold: '#eedab8',
};
/** The letters of each slot's colours. */
export const NIGHT_SLEEVES_CHARS: Record<string, string> = {
  cloth: 'abcdefhijlmnp',
  gold: 'qrs',
};
/** His skin's letters: drawn in the body's skin, at these shades of it. */
export const NIGHT_SLEEVES_SKIN: Record<string, number> = {  };

/** The near sleeve to the elbow (pivot: the shoulder). */
export const NIGHT_SLEEVES_UPPER_N: PaintedPiece = {
  pivot: [7, 5],
  angle: 107.10,
  rows: [
    '............k.',
    '.........kkklh',
    '.......kkjhhh.',
    '......klhlhhh.',
    '......klhhlhh.',
    '.....kllhhllh.',
    '.....klhhlllj.',
    '.....klllhhll.',
    '....klhjjdllh.',
    '....klssslllh.',
    '...ksshlllklk.',
    '...klljhlk.kl.',
    '...klhdjlk.kl.',
    '..kldddfk...k.',
    '..kddccjk...k.',
    '.kjcccdjk.....',
    'kjccccajk.....',
    'kcccfcak....k.',
    '.....fa.......',
  ],
  colors: {
    k: '#000008',
    a: '#7a3a70',
    c: '#562b58',
    d: '#46344e',
    f: '#48244a',
    h: '#322f3a',
    j: '#301e3a',
    l: '#201a26',
    s: '#cca86a',
  },
};

/** The near sleeve from the elbow (pivot: the elbow). */
export const NIGHT_SLEEVES_FORE_N: PaintedPiece = {
  pivot: [7, 3],
  angle: 102.53,
  rows: [
    '.......k...',
    '......kkkkk',
    '.....k.....',
    '...kfac....',
    '..kjcaqq.fc',
    '...jkaqqqcf',
    '.k.....qqkf',
    '.kf........',
    'kff........',
    'kcc........',
    'kll........',
    'kmm.....mf.',
    'kmm....kmfh',
    'kmk...kmmfh',
    '.m.....mmk.',
    '.......hk..',
  ],
  colors: {
    k: '#000008',
    a: '#7a3a70',
    c: '#562b58',
    f: '#48244a',
    h: '#322f3a',
    j: '#301e3a',
    l: '#201a26',
    m: '#2c0d2a',
    q: '#eedab8',
  },
};

/** What of our near arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const NIGHT_SLEEVES_SPAN_N: [number, number] = [-1.000, 0.000];

/** The far sleeve to the elbow (pivot: the shoulder). */
export const NIGHT_SLEEVES_UPPER_F: PaintedPiece = {
  pivot: [1, 2],
  angle: 72.90,
  rows: [
    '.k.....',
    'llk....',
    'ppk....',
    'rrk....',
    'eeik...',
    'eeik...',
    'eeik...',
    'iimk...',
    'mmlk...',
    'pplk...',
    'pplk...',
    'llljk..',
    'lljjk..',
    'lljffk.',
    'lljfbfk',
    'jjjf...',
    'll.....',
  ],
  colors: {
    k: '#000008',
    b: '#633866',
    e: '#5c2646',
    f: '#48244a',
    i: '#422034',
    j: '#301e3a',
    l: '#201a26',
    m: '#2c0d2a',
    p: '#0a041a',
    r: '#d2b284',
  },
};

/** The far sleeve from the elbow (pivot: the elbow). */
export const NIGHT_SLEEVES_FORE_F: PaintedPiece = {
  pivot: [4, 2],
  angle: 70.71,
  rows: [
    '.kk....',
    'kk.....',
    'kk..fk.',
    '.jj..bk',
    'ljj..bj',
    '.......',
    '.......',
    '.......',
    '.......',
    '.......',
    '...pp..',
    '..pppp.',
    '.nnppp.',
    '..nnnn.',
    '.llmmm.',
    '.lllm..',
    '.llmmm.',
    '..l.m..',
  ],
  colors: {
    k: '#000008',
    b: '#633866',
    f: '#48244a',
    j: '#301e3a',
    l: '#201a26',
    m: '#2c0d2a',
    n: '#23041e',
    p: '#0a041a',
  },
};

/** What of our far arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const NIGHT_SLEEVES_SPAN_F: [number, number] = [-1.000, 0.000];
