// The alchemist's engraved leather and steel pauldron: the owner's pixels from his sheet of Aurelia's outfits
// (docs/reference/aurelia-outfits-owner-reference.jpg), brought down to our scale by
// tools/refs/aurelia-alchemist-pauldron-from-ref.py (tools/refs/aurelia_outfits_ref.py). Generated: rerun the script to change it.

import type { PaintedPiece } from '../painted';

/** His black line (never recoloured). */
export const ALCH_PAULDRON_LINE = '#000008';
/** The colours the slots recolour from: at these every pixel stays his. */
export const ALCH_PAULDRON_BASE: Record<string, string> = {
  leather: '#643c38',
  metal: '#544e50',
  gold: '#ffeec9',
};
/** The letters of each slot's colours. */
export const ALCH_PAULDRON_CHARS: Record<string, string> = {
  leather: 'abcdefhi',
  metal: 'jlmnpqrst',
  gold: 'uvwxy',
};

/** The alchemist's engraved leather and steel pauldron. */
export const ALCH_PAULDRON_PIECE: PaintedPiece = {
  pivot: [3, 5],
  angle: 107.10,
  rows: [
    '....kkkkkyau',
    '...kebbwxaau',
    '..kcbjpbbaau',
    '..kcbpdcek.u',
    '.kccaccccc.k',
    'kccrbqsecblc',
    'keeccsdbfcek',
    '.kmteccbife.',
    'kbtdbbaaife.',
    'kntdbba.hf..',
    'ktdbeebhff..',
    'kaaaabkhhe..',
    'kuvvvk.khh..',
  ],
  colors: {
    k: '#000008',
    a: '#b29e80',
    b: '#59493b',
    c: '#643c38',
    d: '#414348',
    e: '#4c3634',
    f: '#462a28',
    h: '#342222',
    i: '#0f1c18',
    j: '#f0e8de',
    l: '#eee0d3',
    m: '#dfded6',
    n: '#cdcfc2',
    p: '#969692',
    q: '#767470',
    r: '#6e6c6c',
    s: '#5b5257',
    t: '#544e50',
    u: '#ffeec9',
    v: '#fae8c2',
    w: '#efbd7a',
    x: '#e5bb7f',
    y: '#d4aa7a',
  },
};
