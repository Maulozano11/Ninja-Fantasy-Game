// The owner's Elise's coat and sleeves, the reduced reference's pixels (tools/refs/elise-upper-from-ref.py
// from docs/reference/elise-owner-reference.jpg, at our scale by tools/refs/heroine-study.py): pieces
// laid on our female at idle frame 0, each turned with its segment (pivot on its joint, angle the
// segment's there). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** Her colours the slots retint (each shade by its character): her coat, trims, whites and corset. */
export const ELISE_COAT = '#345ea9';
export const ELISE_TRIM = '#e6b75e';
export const ELISE_PLATE = '#eaeaf3';
export const ELISE_CORSET = '#1b2858';
/** Her lit skin: the skin tone moves her neck's skin from it. */
export const ELISE_SKIN = '#facdac';
export const ELISE_COAT_CHARS = 'abcd';
export const ELISE_TRIM_CHARS = 'ef';
export const ELISE_PLATE_CHARS = 'ghijl';
export const ELISE_CORSET_CHARS = 'mn';
export const ELISE_SKIN_CHARS = 'pq';

/** Where the coat body ends at rest: a height above the pelvis along the torso (design units). */
export const ELISE_COAT_FROM = 3.62;
/** The near sleeve's band's top, along the upper arm (0 the shoulder, 1 the elbow): above it, the bare shoulder. */
export const ELISE_BAND_TOP = 0.130;
/** Each sleeve's lower edge along the forearm (0 the elbow, 1 the wrist): past it, the wrist. */
export const ELISE_CUFF = { N: 0.963, F: 0.634 };

/** The coat body: high collar with the neck and choker, gold-edged fronts, breastplate and corset, down to the belt (pivot: the neck). */
export const ELISE_COAT_BODY: PaintedPiece = {
  pivot: [7, -1],
  angle: -90.10,
  rows: [
    '...kcdkppkdcck....',
    '...kdckqqkcbbk....',
    '..kfdcmmmmcbfk....',
    '..kfdkqqqqkcbfk...',
    '..kfdkqqqqkcbfk...',
    '..kfckqqqqkbbfk...',
    '.kfdckllljjkbfk...',
    '.kfdckllljjkbfk...',
    'kfdckllljijikbfk..',
    'kfdcklljikljikbfk.',
    'kfdckljiihkjihkbfk',
    'kfdckljiihkjihkbfk',
    'kfdckjihgkjihgkbfk',
    'kfdckkkkmmkkkkkbfk',
    'kfdckmnnmmnnmkbbfk',
    'kfdcknmoooomnkbbfk',
    'kfdcknmnnljmnkbbfk',
    'kfdckmnnnjhmnkbbfk',
    'kfdcknmoooomnkbbfk',
    'kfdcknmnnljmnkbbfk',
    'kfdckmnnnjhmnkbbfk',
    '.kfdknmnnnnmnkbfk.',
    '.kfdkmnnnnnnmkbfk.',
    '.kfdkkkkkkkkkkbfk.',
    '.kfdkmnnnnnnmkbfk.',
    '.kfdkmnnnnnnmkbfk.',
    '.kfdkmnnnnnnmkbfk.',
    '.kkkkkkkkkkkkkkkk.',
  ],
  colors: {
    k: '#080613',
    b: '#2d5090',
    c: '#345ea9',
    d: '#4068ac',
    f: '#e6b75e',
    g: '#787782',
    h: '#a8a8b9',
    i: '#c4c4ce',
    j: '#eaeaf3',
    l: '#fefef9',
    m: '#181b37',
    n: '#1b2858',
    o: '#4e3739',
    p: '#d68271',
    q: '#facdac',
  },
};

/** The near upper arm's sleeve: the gold-trimmed band, the white sleeve and the blue at the elbow (pivot: the near shoulder). */
export const ELISE_SLEEVE_UPPER_N: PaintedPiece = {
  pivot: [9, -2],
  angle: 107.95,
  rows: [
    '...kfffffffffffk',
    '..kddcccccccbbbk',
    '..kffffffffffkk.',
    '.klljjjiihgk....',
    'kllljjjiihhk....',
    'klljjjiiihhk....',
    'kljjjiiihhgk....',
    'kdcccccbbaak....',
    'kddccccbbak.....',
    '..dcccbbak......',
    '..dcccbbk.......',
    '...jicbbk.......',
    '...jicba........',
    '.....c..........',
  ],
  colors: {
    k: '#080613',
    a: '#1b2858',
    b: '#2d5090',
    c: '#345ea9',
    d: '#4068ac',
    f: '#e6b75e',
    g: '#787782',
    h: '#a8a8b9',
    i: '#c4c4ce',
    j: '#eaeaf3',
    l: '#fefef9',
  },
};

/** The near forearm's guard, its gold edge and cuff (pivot: the near elbow). */
export const ELISE_SLEEVE_FORE_N: PaintedPiece = {
  pivot: [6, 3],
  angle: 103.11,
  rows: [
    '....ccccb.',
    '....ccccbb',
    '..kdcccbba',
    '..kdcccbbk',
    '..kljicbbk',
    '..kljicbak',
    '.klljicbbk',
    '.kljiicbak',
    '.kljiibbbk',
    '.kffffebak',
    '.kdcccbak.',
    'kllljjihk.',
    'kjjiihgk..',
  ],
  colors: {
    k: '#080613',
    a: '#1b2858',
    b: '#2d5090',
    c: '#345ea9',
    d: '#4068ac',
    e: '#cf9b48',
    f: '#e6b75e',
    g: '#787782',
    h: '#a8a8b9',
    i: '#c4c4ce',
    j: '#eaeaf3',
    l: '#fefef9',
  },
};

/** The far upper arm's sleeve: the gold-trimmed band, the white sleeve and the blue at the elbow (pivot: the far shoulder). */
export const ELISE_SLEEVE_UPPER_F: PaintedPiece = {
  pivot: [-3, -1],
  angle: 79.34,
  rows: [
    '.kkkk.',
    'kffffk',
    'kdccbk',
    'kfffek',
    'kljiik',
    'kljiik',
    'kjjihk',
    'kjjihk',
    'kccbbk',
    'kdc...',
    'kccb..',
    '.klj..',
    '.kl...',
    '.k....',
  ],
  colors: {
    k: '#080613',
    b: '#2d5090',
    c: '#345ea9',
    d: '#4068ac',
    e: '#cf9b48',
    f: '#e6b75e',
    h: '#a8a8b9',
    i: '#c4c4ce',
    j: '#eaeaf3',
    l: '#fefef9',
  },
};

/** The far forearm's guard, its gold edge and cuff (pivot: the far elbow). */
export const ELISE_SLEEVE_FORE_F: PaintedPiece = {
  pivot: [0, 3],
  angle: 57.69,
  rows: [
    'k.......',
    'kcc.....',
    'kdcbbk..',
    'kccbbk..',
    '.kljiikk',
    '.kljiihk',
    '.kjjihgk',
    '.kjjihgk',
    '.kfffek.',
  ],
  colors: {
    k: '#080613',
    b: '#2d5090',
    c: '#345ea9',
    d: '#4068ac',
    e: '#cf9b48',
    f: '#e6b75e',
    g: '#787782',
    h: '#a8a8b9',
    i: '#c4c4ce',
    j: '#eaeaf3',
    l: '#fefef9',
  },
};
