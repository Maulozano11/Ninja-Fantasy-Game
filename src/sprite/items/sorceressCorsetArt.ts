// The sorceress's laced black corset bodice with its high collar, gold thorn trim, violet gem and the bust's plum: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-sorceress-corset-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const NIGHT_CORSET_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const NIGHT_CORSET_BASE: Record<string, string> = {
  cloth: '#26202c',
  leather: '#1e131a',
  gold: '#926e4c',
};
/** The letters of each slot's colours. */
export const NIGHT_CORSET_CHARS: Record<string, string> = {
  cloth: 'abcd',
  leather: 'ef',
  gold: 'ABCDEFGHIJKLhijlmnpqrstuvwxyz',
  skin: 'M',
};
/** His skin's letters: drawn in the body's skin, at these shades of it. */
export const NIGHT_CORSET_SKIN: Record<string, number> = { M: 3 };

/** What of our torso the bodice stands for, in fine pixels below the neck along the torso: [near side from, far side from, to]. */
export const NIGHT_CORSET_TORSO_SPAN: [number, number, number] = [6.00, 6.00, 25.50];

/** The bodice to the lower edge of the sash (pivot: the base of the neck). */
export const NIGHT_CORSET_BODICE: PaintedPiece = {
  pivot: [4, 0],
  angle: -98.05,
  rows: [
    '.....Aak.......',
    '.....IDakk.....',
    'bbbbctyavbkkk..',
    'bbbbcHaanvcck..',
    'rrmhCaMaaalbxk.',
    'ffspaMMMMMMaEk.',
    '.ixjqajMMMMaak.',
    '.iDddDjwuMMtadk',
    'KKKaaazdyaFJddk',
    'ffeddaaLGGAbdak',
    'eecddddddBEcddk',
    'kbccdcddcbbeddk',
    '.becccceebccce.',
    '.kceeeccaaaceb.',
    '.kcbccbbcccccb.',
    '..kccccbbcccc..',
    '..kcccccaaabc..',
    '.kebbbbcccccef.',
    '.ffccbbbaabccff',
    '.ffeccbbbbccc..',
    '..feceeccccce..',
    '..feceeeeceee..',
    '..feceeeeceee..',
    '..feceeeeceee..',
    '......ee..eeek.',
    '...........eek.',
  ],
  colors: {
    k: '#000008',
    A: '#c89a5e',
    B: '#c09c64',
    C: '#c2986e',
    D: '#b6915e',
    E: '#ae8a59',
    F: '#b0824a',
    G: '#ad7e52',
    H: '#a2844d',
    I: '#a07e56',
    J: '#9c6f36',
    K: '#926e4c',
    L: '#966842',
    M: '#f8caa8',
    a: '#5c2646',
    b: '#322f3a',
    c: '#26202c',
    d: '#341735',
    e: '#1e131a',
    f: '#0e0a12',
    h: '#ebc694',
    i: '#ecc688',
    j: '#edc672',
    l: '#e0c684',
    m: '#e6c47c',
    n: '#dcc491',
    p: '#e4bc76',
    q: '#d3c07e',
    r: '#d4ba88',
    s: '#e6b36e',
    t: '#dcb470',
    u: '#d8b278',
    v: '#cdb36c',
    w: '#d4aa7a',
    x: '#d6ac6a',
    y: '#cca260',
    z: '#c8a06e',
  },
};

/** The bodice carried on under the sash to the hips (pivot: the base of the neck). */
export const NIGHT_CORSET_WAIST: PaintedPiece = {
  pivot: [3, -24],
  angle: -98.05,
  rows: [
    'kfeck..kk.',
    'kkkkkkkkkk',
  ],
  colors: {
    k: '#000008',
    c: '#26202c',
    e: '#1e131a',
    f: '#0e0a12',
  },
};
