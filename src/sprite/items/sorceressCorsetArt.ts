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
  gold: '#d4ba88',
};
/** The letters of each slot's colours. */
export const NIGHT_CORSET_CHARS: Record<string, string> = {
  cloth: 'abcd',
  leather: 'efhi',
  gold: 'jlmnpq',
  skin: 'rs',
};
/** His skin's letters: drawn in the body's skin, at these shades of it. */
export const NIGHT_CORSET_SKIN: Record<string, number> = { r: 3, s: 3 };

/** What of our torso the bodice stands for, in fine pixels below the neck along the torso: [near side from, far side from, to]. */
export const NIGHT_CORSET_TORSO_SPAN: [number, number, number] = [6.00, 6.00, 25.50];

/** The bodice to the lower edge of the sash (pivot: the base of the neck). */
export const NIGHT_CORSET_BODICE: PaintedPiece = {
  pivot: [4, 0],
  angle: -98.05,
  rows: [
    '.....bak.......',
    '.....llikk.....',
    'bbbbclcmmbkkk..',
    'bbbbclaammcck..',
    'lllllaraaamcbk.',
    'iilcarsssssaak.',
    '.snaaajssssaak.',
    '.andddjjjssaadk',
    'nnnaadddjabdddk',
    'iihddaadjjchdak',
    'hhcddddddjccddk',
    'kbccdcddcjchddk',
    '.bhcccchhjccch.',
    '.kchhhcchpbchb.',
    '.kcbccbbhccccb.',
    '..kccccbbcccc..',
    '..kcccccefffc..',
    '.khbbbbceccchi.',
    '.iiccbbbqabccii',
    '.iihccbcqbccc..',
    '..ihchhccccch..',
    '..ihchhhhchhh..',
    '..ihchhhhchhh..',
    '..ihchhhhchhh..',
    '......hh..hhhk.',
    '...........hhk.',
  ],
  colors: {
    k: '#000008',
    a: '#5c2646',
    b: '#322f3a',
    c: '#26202c',
    d: '#341735',
    e: '#9a867e',
    f: '#725c3e',
    h: '#1e131a',
    i: '#0e0a12',
    j: '#edc672',
    l: '#d4ba88',
    m: '#cdb36c',
    n: '#d6ac6a',
    p: '#c09c64',
    q: '#9a8a5a',
    r: '#feccb4',
    s: '#f8caa8',
  },
};

/** The bodice carried on under the sash to the hips (pivot: the base of the neck). */
export const NIGHT_CORSET_WAIST: PaintedPiece = {
  pivot: [3, -24],
  angle: -98.05,
  rows: [
    'kihck..kk.',
    'kkkkkkkkkk',
  ],
  colors: {
    k: '#000008',
    c: '#26202c',
    h: '#1e131a',
    i: '#0e0a12',
  },
};
