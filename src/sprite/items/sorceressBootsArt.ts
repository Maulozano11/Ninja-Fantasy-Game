// The sorceress's black thigh stockings and buckled heeled boots: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-boots-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const NIGHT_BOOTS_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_BOOTS_BASE: Record<string, string> = {
  leather: '#201a26',
  metal: '#828386',
};
/** The letters of each slot's colours. */
export const NIGHT_BOOTS_CHARS: Record<string, string> = {
  leather: 'abcdefhijlm',
  metal: 'npqrst',
};

/** The near boot over the knee and what of the leg above it (pivot: the knee). */
export const NIGHT_BOOTS_THIGH_N: PaintedPiece = {
  pivot: [4, 11],
  angle: 99.25,
  rows: [
    '..hhbb......',
    '.hhhbb......',
    '.hhhbbk.....',
    '.fffahihk...',
    'fffabifhhiki',
    'aaablfbfhiii',
    'aabiibbbhijj',
    'hhiihbbbijjj',
    'lllifbbfijj.',
    '..kihbbhij..',
    'ikiiifhill..',
    '....iiilll..',
  ],
  colors: {
    k: '#000008',
    a: '#5c4066',
    b: '#553e50',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
    j: '#2c0d2a',
    l: '#120c1a',
  },
};

/** The near boot from the knee to the ankle (pivot: the ankle). */
export const NIGHT_BOOTS_SHIN_N: PaintedPiece = {
  pivot: [5, 15],
  angle: 105.42,
  rows: [
    '.....iiii......',
    '....iiiiiiiijjj',
    '...llihiiiiijj.',
    '..iiiihfhbhij..',
    '.jjjiaahhhii...',
    '.jjihqrffhih...',
    'jjjjhrthfiii...',
    'jjjjiihiiii....',
    'jkkjihffhii....',
    '...kabhfiii....',
    '...kprffijjj...',
    '...krdhhkkj....',
    '...kfhik.......',
    '...khhfk.......',
    '...khhfk.......',
    '...khfhk.......',
    '...khfhk.......',
    '...kafk........',
    '..knsffk.......',
    '..ksdhhk.......',
    '..kifbhk.......',
  ],
  colors: {
    k: '#000008',
    a: '#5c4066',
    b: '#553e50',
    d: '#414348',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
    j: '#2c0d2a',
    l: '#120c1a',
    n: '#bcc1ba',
    p: '#b8bfc7',
    q: '#b5bbb9',
    r: '#828386',
    s: '#6e6c6c',
    t: '#52565c',
  },
};

/** The near shoe, flat (pivot: the ankle). */
export const NIGHT_BOOTS_FOOT_N: PaintedPiece = {
  pivot: [3, -4],
  angle: 0.00,
  rows: [
    'ksdhhk',
    'kifbhk',
    'khfffk',
    'khf.fk',
    'kihfhk',
    'kkkkkk',
  ],
  colors: {
    k: '#000008',
    b: '#553e50',
    d: '#414348',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
    s: '#6e6c6c',
  },
};

/** Where the near shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const NIGHT_BOOTS_JOIN_N: [number, number] = [0.00, 4.00];
/** How far above the near knee our leg goes under the boot (fine pixels along the thigh). */
export const NIGHT_BOOTS_CUT_N = 10.85;

/** The far boot over the knee and what of the leg above it (pivot: the knee). */
export const NIGHT_BOOTS_THIGH_F: PaintedPiece = {
  pivot: [3, 11],
  angle: 91.36,
  rows: [
    '.....fi..',
    '.e...fii.',
    'ee..kfiik',
    'eekiifhii',
    'eehiiffhh',
    'eehhhhehh',
    'eehfhieaa',
    'aahfhieak',
    'eehfhmhfk',
    'eehhhmih.',
    'eehiimmi.',
  ],
  colors: {
    k: '#000008',
    a: '#5c4066',
    e: '#4a3258',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
    m: '#1a071a',
  },
};

/** The far boot from the knee to the ankle (pivot: the ankle). */
export const NIGHT_BOOTS_SHIN_F: PaintedPiece = {
  pivot: [5, 14],
  angle: 88.03,
  rows: [
    '.eehiimmmm',
    '.eehimmmmm',
    '.iiiimmmmm',
    '.iifhmmmmm',
    '.iihhmmmm.',
    '.iihhhmmm.',
    '.iihhimmm.',
    '.iiiimmmmm',
    '.hhhhmkkm.',
    '.fffhk....',
    '.fffhk....',
    '.khfhk....',
    '.kffhk....',
    '.kihfk....',
    '.kiffk....',
    '.kihfhk...',
    'kiiiick...',
    'kiiihffk..',
    'kiiiiiffk.',
    '.kiiihfcfk',
  ],
  colors: {
    k: '#000008',
    c: '#4c4048',
    e: '#4a3258',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
    m: '#1a071a',
  },
};

/** The far shoe, flat (pivot: the ankle). */
export const NIGHT_BOOTS_FOOT_F: PaintedPiece = {
  pivot: [5, -4],
  angle: 0.00,
  rows: [
    'kiiiiiffk....',
    '.kiiihfcfk...',
    '.kikkihhffkk.',
    '.kkk.kiiihffk',
    '......kkkkkkk',
  ],
  colors: {
    k: '#000008',
    c: '#4c4048',
    f: '#3e2e3c',
    h: '#2e2230',
    i: '#201a26',
  },
};

/** Where the far shoe meets the shin, from the ankle at rest (fine pixels): the shoe follows it. */
export const NIGHT_BOOTS_JOIN_F: [number, number] = [-1.00, 4.00];
/** How far above the far knee our leg goes under the boot (fine pixels along the thigh). */
export const NIGHT_BOOTS_CUT_F = 10.32;
