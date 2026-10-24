// The alchemist's studded brown leather corset over her cream blouse and green tabard: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-corset-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_CORSET_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_CORSET_BASE: Record<string, string> = {
  leather: '#7e5440',
  gold: '#ffeec9',
  gem: '#081416',
};
/** The letters of each slot's colours. */
export const ALCH_CORSET_CHARS: Record<string, string> = {
  leather: 'abcdef',
  gold: 'hijlmnpqrst',
  gem: 'uvwx',
};
/** His skin's letters: drawn in the body's skin, at these shades of it. */
export const ALCH_CORSET_SKIN: Record<string, number> = {  };

/** What of our torso the bodice stands for, in fine pixels below the neck along the torso: [near side from, far side from, to]. */
export const ALCH_CORSET_TORSO_SPAN: [number, number, number] = [6.00, 6.00, 26.50];

/** The bodice to the lower edge of the belt (pivot: the base of the neck). */
export const ALCH_CORSET_BODICE: PaintedPiece = {
  pivot: [6, 0],
  angle: -98.05,
  rows: [
    '........a.kk......',
    '.......aakaebck...',
    '...k.kaaaaacvak...',
    '...wkvlaaamluesk..',
    '...xxvaaahqacfck..',
    '..wwxvccaqdabefck.',
    '..wwwebbajjajceek.',
    '.wwwvaaaaaajlaack.',
    '.wwweaaaaaamaaaak.',
    'kwwwfebaaaacbaaak.',
    '.xxweeebbbceecbck.',
    '..xffeeeeeceeeeek.',
    '..kfeeeeeeeeecefk.',
    '..kwceccceeccfeak.',
    '...keeeeeecipefak.',
    '...kwwwfbbcptffaak',
    '....kvvfbacinefaak',
    '....kvufcbcnrcfaa.',
    '..kkwwufcbcceefxxx',
    '.kxxwwufcbacecfxxx',
    '.xxxwwufcbacecfxxx',
    '.xxxwwufcbacecfxxx',
    '.xxxwwufcbacecfxxx',
    '.xxxwwufcbacecfxxx',
    '.xxxwwufcbacecfxx.',
    '.xxxwwufcbace.fxx.',
    '.xxxwwufc......x..',
  ],
  colors: {
    k: '#000008',
    a: '#7e5440',
    b: '#704b38',
    c: '#5a403a',
    d: '#414348',
    e: '#462a28',
    f: '#342222',
    h: '#fff6e7',
    i: '#f6f4e8',
    j: '#ffeec9',
    l: '#f8e4ba',
    m: '#dcc8a8',
    n: '#c9c4bc',
    p: '#bcc1ba',
    q: '#9e9e98',
    r: '#7a7a78',
    s: '#6e6c6c',
    t: '#544e50',
    u: '#27403a',
    v: '#1a302e',
    w: '#102222',
    x: '#081416',
  },
};

/** The bodice carried on under the belt to the hips (pivot: the base of the neck). */
export const ALCH_CORSET_WAIST: PaintedPiece = {
  pivot: [-3, -24],
  angle: -98.05,
  rows: [
    '........k.',
    '....k...kk',
    'kkkkkk.kk.',
  ],
  colors: {
    k: '#000008',
  },
};
