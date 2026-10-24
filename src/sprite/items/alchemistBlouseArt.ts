// The alchemist's cream blouse sleeves: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-blouse-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_BLOUSE_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_BLOUSE_BASE: Record<string, string> = {
  cloth: '#ae8260',
  trim: '#2e1e18',
};
/** The letters of each slot's colours. */
export const ALCH_BLOUSE_CHARS: Record<string, string> = {
  cloth: 'abcdefhijlmnpqrstuv',
  trim: 'ABCDEFwxyz',
};

/** The near sleeve to the elbow (pivot: the shoulder). */
export const ALCH_BLOUSE_UPPER_N: PaintedPiece = {
  pivot: [6, -6],
  angle: 107.10,
  rows: [
    '...kaaals.DD.',
    '...kaaalk.kDD',
    '..krahflk.kCC',
    '.kpeaaak...kC',
    '.kkbpcsk...kF',
    'kwkkkksk.....',
    'kkvvhbkk.....',
    '...imkuk.....',
    '......k......',
  ],
  colors: {
    k: '#000008',
    C: '#382828',
    D: '#2e1e18',
    F: '#0e0a12',
    a: '#fae8c2',
    b: '#e3cfae',
    c: '#e4d0a4',
    e: '#dcc8a8',
    f: '#d4c4a4',
    h: '#d2be9c',
    i: '#e4b78f',
    l: '#cab695',
    m: '#caae90',
    p: '#c0a987',
    r: '#baa186',
    s: '#ac9676',
    u: '#ab8f6a',
    v: '#ae8260',
    w: '#a8987f',
  },
};

/** The near sleeve from the elbow (pivot: the elbow). */
export const ALCH_BLOUSE_FORE_N: PaintedPiece = {
  pivot: [3, 3],
  angle: 102.53,
  rows: [
    '...k....',
    '...kkkk.',
    '..kvvhbk',
    '.ktqimk.',
    '.kjqinm.',
    '.kjqinmk',
    '.kjqink.',
    '.kjqik..',
    'kjjqik..',
    'kjjqk...',
    'kjjqk...',
    'kjjqk...',
    'jjjk....',
  ],
  colors: {
    k: '#000008',
    b: '#e3cfae',
    h: '#d2be9c',
    i: '#e4b78f',
    j: '#d8b698',
    m: '#caae90',
    n: '#d2a682',
    q: '#d09a76',
    t: '#b08e72',
    v: '#ae8260',
  },
};

/** What of our near arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const ALCH_BLOUSE_SPAN_N: [number, number] = [-1.000, 1.000];

/** The far sleeve to the elbow (pivot: the shoulder). */
export const ALCH_BLOUSE_UPPER_F: PaintedPiece = {
  pivot: [0, -3],
  angle: 72.90,
  rows: [
    '.zk..',
    'zzk..',
    'AAk..',
    'BBk..',
    'EEk..',
    'xxk..',
    'ssk..',
    'llmk.',
    'ykkk.',
    'pkksk',
    'mmkk.',
  ],
  colors: {
    k: '#000008',
    A: '#4c302c',
    B: '#462a28',
    E: '#1e131a',
    l: '#cab695',
    m: '#caae90',
    p: '#c0a987',
    s: '#ac9676',
    x: '#988268',
    y: '#8e7560',
    z: '#6a4436',
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
    'mbvvk..',
    '..vvk..',
    '..kvk..',
    '..vvk..',
    '..vvdk.',
    '..vvdk.',
    '..vvdk.',
    '..vvddk',
    '...vkdk',
  ],
  colors: {
    k: '#000008',
    b: '#e3cfae',
    d: '#eac8a7',
    m: '#caae90',
    v: '#ae8260',
  },
};

/** What of our far arm the sleeve stands for: [from on the upper arm (0 shoulder, 1 elbow), to on the forearm (0 elbow, 1 wrist)]. */
export const ALCH_BLOUSE_SPAN_F: [number, number] = [-1.000, 1.000];
